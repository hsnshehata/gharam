const WebSocket = require('ws');
const Conversation = require('../models/Conversation');
const sessionCache = require('./sessionCache');

const API_KEYS = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_FALLBACK
].filter(Boolean);

const HOST = 'generativelanguage.googleapis.com';

const AUDIO_CONSTRAINTS = `
(تعليمات هامة جداً للمكالمة الصوتية):
- أنتِ الآن في مكالمة صوتية مباشِرة مع العميل. إجاباتك يجب أن تكون قصيرة جداً ومختصرة مثل المحادثة الطبيعية.
- تجنبي الإطالة تماماً، ولا تعطِ تفاصيل كثيرة إلا إذا طلبها العميل.
- يجب أن ألا تتجاوز إجابتك الجملتين بأي حال.
- يجب أن ألا تقوم بنطق أي روابط فقط قل اذهبي الى صفحة ( اسعار الخدمات او معرض الصور او الموقع الرسمي او الخ.... ) فقط قل من خلال موقعنا صفحة ( اسم الصفحة ).
`;

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
        // Collects user and model transcripts during the call
        let currentUserTranscript = '';      // Accumulates user speech across chunks
        let currentModelTranscript = '';     // Accumulates model speech across chunks
        const transcriptMessages = [];      // Final ordered list of { role, text }

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

            // Flush any remaining transcript
            flushUserTranscript();
            flushModelTranscript();

            // Save Duration
            const durationSeconds = Math.round((Date.now() - callStartTime) / 1000);

            try {
                // Save quota
                await Conversation.findOneAndUpdate(
                    { sessionId },
                    {
                        $set: { "metadata.voiceLimitDate": todayStr },
                        $inc: { "metadata.voiceSecondsUsed": durationSeconds }
                    },
                    { upsert: true }
                );

                // Save transcript messages to conversation history
                if (transcriptMessages.length > 0) {
                    console.log(`[AudioLive] Saving ${transcriptMessages.length} transcript messages for session ${sessionId}`);

                    // Add a call separator message
                    await sessionCache.persistMessage(sessionId, 'web', 'model',
                        `📞 مكالمة صوتية (${Math.floor(durationSeconds / 60)}:${(durationSeconds % 60).toString().padStart(2, '0')} دقيقة)`
                    );

                    // Save each transcript message
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

                // Build setup config with transcription enabled
                const setupConfig = {
                    setup: {
                        model: modelName,
                        systemInstruction: { parts: [{ text: finalInstruction }] },
                        generationConfig: {
                            responseModalities: ["AUDIO"],
                            // Enable output audio transcription (model's speech → text)
                            outputAudioTranscription: {}
                        },
                        // Enable input audio transcription (user's speech → text)
                        inputAudioTranscription: {}
                    }
                };

                geminiWs.send(JSON.stringify(setupConfig));
            });

            geminiWs.on('message', (data) => {
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

                // ── Process Gemini messages: extract transcripts + forward audio ──
                try {
                    const parsed = JSON.parse(msgStr);

                    // 1. Input transcription (user's speech as text)
                    if (parsed.serverContent?.inputTranscription?.text) {
                        const userText = parsed.serverContent.inputTranscription.text;
                        // Flush any previous model transcript before adding user text
                        flushModelTranscript();
                        currentUserTranscript += userText;
                        // Don't forward transcript-only messages to client (just audio)
                    }

                    // 2. Output transcription (model's speech as text)
                    if (parsed.serverContent?.outputTranscription?.text) {
                        const modelText = parsed.serverContent.outputTranscription.text;
                        // Flush any previous user transcript before adding model text
                        flushUserTranscript();
                        currentModelTranscript += modelText;
                    }

                    // 3. Turn complete → flush current transcript
                    if (parsed.serverContent?.turnComplete) {
                        flushUserTranscript();
                        flushModelTranscript();
                    }

                } catch {
                    // Not JSON — ignore parse errors
                }

                // Always forward the message to client for audio playback
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
