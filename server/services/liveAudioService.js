const WebSocket = require('ws');
const Conversation = require('../models/Conversation');
const Booking = require('../models/Booking');
const sessionCache = require('./sessionCache');

const API_KEYS = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_FALLBACK
].filter(Boolean);

const HOST = 'generativelanguage.googleapis.com';
const MAX_BOOKINGS_PER_DAY = 12;

const AUDIO_CONSTRAINTS = `
(تعليمات هامة جداً للمكالمة الصوتية):
- أنتِ الآن في مكالمة صوتية مباشِرة مع العميل. إجاباتك يجب أن تكون قصيرة جداً ومختصرة مثل المحادثة الطبيعية.
- تجنبي الإطالة تماماً، ولا تعطِ تفاصيل كثيرة إلا إذا طلبها العميل.
- يجب أن ألا تتجاوز إجابتك الجملتين بأي حال.
- يجب أن ألا تقوم بنطق أي روابط فقط قل اذهبي الى صفحة ( اسعار الخدمات او معرض الصور او الموقع الرسمي او الخ.... ) فقط قل من خلال موقعنا صفحة ( اسم الصفحة ).
`;

// ── Tool Declarations (same as text chat) ──
const voiceTools = [
    {
        functionDeclarations: [
            {
                name: "get_booking_count_by_date",
                description: "Returns the number of existing bookings for a specific date (YYYY-MM-DD). Use this to check if a day is full or available.",
                parameters: {
                    type: "OBJECT",
                    properties: { date: { type: "STRING", description: "The date in YYYY-MM-DD format." } },
                    required: ["date"]
                }
            },
            {
                name: "search_booking_by_query",
                description: "Searches for a specific booking using a receipt number or client phone number. Returns details like name, date, total, and remaining balance.",
                parameters: {
                    type: "OBJECT",
                    properties: { query: { type: "STRING", description: "The receipt number or phone number to search for." } },
                    required: ["query"]
                }
            }
        ]
    }
];

// ── Tool Implementations ──
const voiceFunctions = {
    get_booking_count_by_date: async ({ date }) => {
        try {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            const count = await Booking.countDocuments({ eventDate: { $gte: startOfDay, $lte: endOfDay } });
            const isFull = count >= MAX_BOOKINGS_PER_DAY;
            return {
                dateRequested: date,
                isFull,
                statusAr: isFull ? "اليوم مكتمل العدد" : "اليوم متاح للحجز",
                importantInstructionForAI: "DO NOT MENTION ANY NUMBERS. Just say available or fully booked."
            };
        } catch (err) {
            return { error: "Failed to fetch bookings count" };
        }
    },
    search_booking_by_query: async ({ query }) => {
        try {
            const booking = await Booking.findOne({
                $or: [{ receiptNumber: query }, { clientPhone: query }]
            }).populate('package');

            if (!booking) return { message: "لم يتم العثور على حجز بهذا الرقم" };

            return {
                clientName: booking.clientName,
                eventDate: booking.eventDate.toISOString().split('T')[0],
                packageName: booking.package?.name || "N/A",
                total: booking.total,
                remaining: booking.remaining,
                receiptNumber: booking.receiptNumber,
                status: booking.remaining <= 0 ? "مدفوع بالكامل" : "يوجد متبقي"
            };
        } catch (err) {
            return { error: "Failed to search booking" };
        }
    }
};

const setupLiveVoiceWebSocket = (server) => {
    const wss = new WebSocket.Server({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
        if (request.url.startsWith('/api/live-audio')) {
            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit('connection', ws, request);
            });
        }
    });

    wss.on('connection', async (clientWs, request) => {
        const urlParams = new URLSearchParams(request.url.split('?')[1]);
        const sessionId = urlParams.get('sessionId') || 'unknown';

        // Check Quota
        const todayStr = new Date().toISOString().split('T')[0];
        let conv = await Conversation.findOne({ sessionId }).lean();
        let usedSeconds = 0;

        if (conv) {
            if (conv.metadata?.voiceLimitDate === todayStr) {
                usedSeconds = conv.metadata?.voiceSecondsUsed || 0;
            }
        }

        if (usedSeconds >= 300) {
            clientWs.send(JSON.stringify({ type: 'quota_exceeded', msg: 'استهلكت الخمس دقائق الصوتية اليوم، كمل معايا نصي يا قمر!' }));
            clientWs.close();
            return;
        }

        const callStartTime = Date.now();
        let currentGeminiWs = null;
        let isClosedByClient = false;
        let currentClientMsgHandler = null;

        // ── Transcript Accumulator ──
        let currentUserTranscript = '';
        let currentModelTranscript = '';
        const transcriptMessages = [];

        const flushUserTranscript = () => {
            if (currentUserTranscript.trim()) {
                transcriptMessages.push({ role: 'user', text: currentUserTranscript.trim() });
                currentUserTranscript = '';
            }
        };

        const flushModelTranscript = () => {
            if (currentModelTranscript.trim()) {
                transcriptMessages.push({ role: 'model', text: currentModelTranscript.trim() });
                currentModelTranscript = '';
            }
        };

        clientWs.on('close', async () => {
            isClosedByClient = true;
            if (currentGeminiWs && currentGeminiWs.readyState === WebSocket.OPEN) {
                currentGeminiWs.close();
            }

            flushUserTranscript();
            flushModelTranscript();

            const durationSeconds = Math.round((Date.now() - callStartTime) / 1000);

            try {
                await Conversation.findOneAndUpdate(
                    { sessionId },
                    {
                        $set: { "metadata.voiceLimitDate": todayStr },
                        $inc: { "metadata.voiceSecondsUsed": durationSeconds }
                    },
                    { upsert: true }
                );

                if (transcriptMessages.length > 0) {
                    console.log(`[AudioLive] Saving ${transcriptMessages.length} transcript messages for session ${sessionId}`);

                    await sessionCache.persistMessage(sessionId, 'web', 'model',
                        `📞 مكالمة صوتية (${Math.floor(durationSeconds / 60)}:${(durationSeconds % 60).toString().padStart(2, '0')} دقيقة)`
                    );

                    for (const msg of transcriptMessages) {
                        await sessionCache.persistMessage(sessionId, 'web', msg.role, msg.text);
                    }
                }
            } catch (err) {
                console.error("[AudioLive] Error saving session data:", err);
            }
        });

        const connectToGemini = async (keyIndex, isFallbackModel) => {
            if (isClosedByClient) return;

            if (keyIndex >= API_KEYS.length) {
                if (!isFallbackModel) {
                    console.log("[AudioLive] Primary model failed all keys, trying fallback model...");
                    return connectToGemini(0, true);
                }
                console.error("[AudioLive] All models and keys exhausted.");
                if (!isClosedByClient && clientWs.readyState === WebSocket.OPEN) {
                    clientWs.send(JSON.stringify({ type: 'error', message: 'All AI models exhausted.' }));
                    clientWs.close();
                }
                return;
            }

            const modelName = isFallbackModel
                ? "models/gemini-2.5-flash-native-audio-preview-12-2025"
                : "models/gemini-3.1-flash-live-preview";

            const apiKey = API_KEYS[keyIndex];
            const wsUrl = `wss://${HOST}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;

            console.log(`[AudioLive] Attempting ${modelName} with key #${keyIndex}...`);

            const geminiWs = new WebSocket(wsUrl);
            currentGeminiWs = geminiWs;
            let setupComplete = false;

            const connectionTimeout = setTimeout(() => {
                if (geminiWs.readyState !== WebSocket.OPEN) {
                    console.warn(`[AudioLive] Connection timeout for key #${keyIndex}, model: ${modelName}`);
                    geminiWs.terminate();
                }
            }, 10000);

            geminiWs.on('open', async () => {
                clearTimeout(connectionTimeout);
                console.log(`[AudioLive] WebSocket opened to ${modelName}`);

                // Fetch dynamic prompt from DB
                let finalInstruction = "أنتِ مساعدة افتراضية واسمك غزل.";
                try {
                    const SystemSetting = require('../models/SystemSetting');
                    const setting = await SystemSetting.findOne({ key: 'ai_system_prompt' }).lean();
                    if (setting && setting.value) {
                        finalInstruction = setting.value + "\n\n" + AUDIO_CONSTRAINTS;
                    }
                } catch (err) {
                    console.error("[AudioLive] Error fetching system prompt:", err.message);
                }

                // Add date context (same as text chat)
                const now = new Date();
                const dayName = now.toLocaleDateString('ar-EG', { weekday: 'long' });
                const formattedDate = now.toISOString().split('T')[0];
                finalInstruction += `\n\nمعلومات التاريخ: اليوم هو ${dayName} ${formattedDate}. السنة الحالية ${now.getFullYear()}.`;
                finalInstruction += `\nإذا ذكر العميل تاريخ بدون سنة، افترض السنة الحالية. إذا التاريخ فات، افترض السنة القادمة ${now.getFullYear() + 1}.`;

                // Build setup config
                const setupConfig = {
                    setup: {
                        model: modelName,
                        systemInstruction: { parts: [{ text: finalInstruction }] },
                        generationConfig: {
                            responseModalities: ["AUDIO"]
                        },
                        outputAudioTranscription: {},
                        inputAudioTranscription: {},
                        // Function Calling — same tools as text chat
                        tools: voiceTools
                    }
                };

                geminiWs.send(JSON.stringify(setupConfig));
            });

            geminiWs.on('message', async (data) => {
                const msgStr = data.toString();

                if (!setupComplete) {
                    setupComplete = true;
                    console.log(`[AudioLive] ✅ Setup confirmed for ${modelName} (key #${keyIndex})`);

                    if (clientWs.readyState === WebSocket.OPEN) {
                        clientWs.send(JSON.stringify({ type: 'ready' }));
                    }

                    if (currentClientMsgHandler) {
                        clientWs.removeListener('message', currentClientMsgHandler);
                    }
                    currentClientMsgHandler = (clientData) => {
                        if (geminiWs.readyState === WebSocket.OPEN && setupComplete) {
                            if (!isFallbackModel) {
                                try {
                                    const msg = JSON.parse(clientData.toString());
                                    if (msg.realtimeInput?.mediaChunks) {
                                        const chunk = msg.realtimeInput.mediaChunks[0];
                                        const transformed = {
                                            realtimeInput: {
                                                audio: {
                                                    data: chunk.data,
                                                    mimeType: chunk.mimeType
                                                }
                                            }
                                        };
                                        geminiWs.send(JSON.stringify(transformed));
                                        return;
                                    }
                                } catch { /* if parse fails, send raw */ }
                            }
                            geminiWs.send(clientData);
                        }
                    };
                    clientWs.on('message', currentClientMsgHandler);
                    return;
                }

                // ── Process Gemini messages ──
                try {
                    const parsed = JSON.parse(msgStr);

                    // ═══ FUNCTION CALL HANDLING ═══
                    // Gemini is requesting a tool call — execute it and send result back
                    const toolCall = parsed.serverContent?.modelTurn?.parts?.find(p => p.functionCall);
                    if (toolCall?.functionCall) {
                        const { name, args } = toolCall.functionCall;
                        console.log(`[AudioLive] 🔧 Function call: ${name}(${JSON.stringify(args)})`);

                        let result = { error: "Unknown function" };
                        if (voiceFunctions[name]) {
                            try {
                                result = await voiceFunctions[name](args);
                            } catch (err) {
                                console.error(`[AudioLive] Function error:`, err);
                                result = { error: err.message };
                            }
                        }

                        console.log(`[AudioLive] 🔧 Function result:`, JSON.stringify(result).slice(0, 200));

                        // Send function response back to Gemini
                        const functionResponse = {
                            toolResponse: {
                                functionResponses: [{
                                    id: toolCall.functionCall.id || name,
                                    name: name,
                                    response: result
                                }]
                            }
                        };
                        geminiWs.send(JSON.stringify(functionResponse));
                        // Don't forward the function call to the client
                        return;
                    }

                    // ═══ TRANSCRIPTION ═══
                    // 1. Input transcription (user's speech)
                    if (parsed.serverContent?.inputTranscription?.text) {
                        flushModelTranscript();
                        currentUserTranscript += parsed.serverContent.inputTranscription.text;
                    }

                    // 2. Output transcription (model's speech)
                    if (parsed.serverContent?.outputTranscription?.text) {
                        flushUserTranscript();
                        currentModelTranscript += parsed.serverContent.outputTranscription.text;
                    }

                    // 3. Turn complete
                    if (parsed.serverContent?.turnComplete) {
                        flushUserTranscript();
                        flushModelTranscript();
                    }

                } catch {
                    // Not JSON — ignore parse errors
                }

                // Forward to client for audio playback
                if (clientWs.readyState === WebSocket.OPEN) {
                    clientWs.send(msgStr);
                }
            });

            geminiWs.on('error', (err) => {
                clearTimeout(connectionTimeout);
                console.error(`[AudioLive] Gemini WS Error (Key #${keyIndex}, Model: ${modelName}):`, err.message);
            });

            geminiWs.on('close', (code, reason) => {
                clearTimeout(connectionTimeout);
                const reasonStr = reason ? reason.toString() : '';
                console.log(`[AudioLive] Gemini WS closed (code: ${code}, reason: ${reasonStr}, setupDone: ${setupComplete})`);

                if (isClosedByClient) return;

                if (!setupComplete || (code !== 1000 && code !== 1005)) {
                    console.log(`[AudioLive] Retrying... next key #${keyIndex + 1}`);
                    connectToGemini(keyIndex + 1, isFallbackModel);
                } else {
                    if (clientWs.readyState === WebSocket.OPEN) clientWs.close();
                }
            });
        };

        connectToGemini(0, false);
    });

    console.log('[AudioLive] Live Audio WebSocket endpoint registered at /api/live-audio');
};

module.exports = { setupLiveVoiceWebSocket };
