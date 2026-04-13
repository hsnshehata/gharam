const WebSocket = require('ws');
const Conversation = require('../models/Conversation');

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
        // Track the current message handler so we can remove it before adding a new one
        let currentClientMsgHandler = null;

        clientWs.on('close', async () => {
            isClosedByClient = true;
            if (currentGeminiWs && currentGeminiWs.readyState === WebSocket.OPEN) {
                currentGeminiWs.close();
            }
            // Save Duration
            const durationSeconds = Math.round((Date.now() - callStartTime) / 1000);
            try {
                await Conversation.findOneAndUpdate(
                    { sessionId },
                    {
                        $set: {
                            "metadata.voiceLimitDate": todayStr
                        },
                        $inc: {
                            "metadata.voiceSecondsUsed": durationSeconds
                        }
                    },
                    { upsert: true }
                );
            } catch (err) { console.error("[AudioLive] Error saving quota:", err); }
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
            let setupComplete = false; // Track when Gemini acknowledges the setup

            // Set a connection timeout — if Gemini doesn't open in 10s, try next
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

                geminiWs.send(JSON.stringify({
                    setup: {
                        model: modelName,
                        systemInstruction: { parts: [{ text: finalInstruction }] },
                        generationConfig: { responseModalities: ["AUDIO"] }
                    }
                }));
                // DON'T set setupComplete here — wait for Gemini's first response
            });

            geminiWs.on('message', (data) => {
                const msgStr = data.toString();

                // The very first message from Gemini after setup is the setupComplete confirmation
                if (!setupComplete) {
                    setupComplete = true;
                    console.log(`[AudioLive] ✅ Setup confirmed for ${modelName} (key #${keyIndex})`);

                    // NOW we tell the client we're ready and start forwarding audio
                    if (clientWs.readyState === WebSocket.OPEN) {
                        clientWs.send(JSON.stringify({ type: 'ready' }));
                    }

                    // IMPORTANT: Remove old message handler before adding new one (prevents duplicate sends)
                    if (currentClientMsgHandler) {
                        clientWs.removeListener('message', currentClientMsgHandler);
                    }
                    currentClientMsgHandler = (clientData) => {
                        if (geminiWs.readyState === WebSocket.OPEN && setupComplete) {
                            // Transform message format for new models
                            // Gemini 3.1+ uses realtimeInput.audio instead of deprecated realtimeInput.mediaChunks
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

                // Forward Gemini audio chunks to client
                if (clientWs.readyState === WebSocket.OPEN) {
                    clientWs.send(msgStr);
                }
            });

            geminiWs.on('error', (err) => {
                clearTimeout(connectionTimeout);
                console.error(`[AudioLive] Gemini WS Error (Key #${keyIndex}, Model: ${modelName}):`, err.message);
                // Don't close here — the 'close' event will handle retry
            });

            geminiWs.on('close', (code, reason) => {
                clearTimeout(connectionTimeout);
                const reasonStr = reason ? reason.toString() : '';
                console.log(`[AudioLive] Gemini WS closed (code: ${code}, reason: ${reasonStr}, setupDone: ${setupComplete})`);

                if (isClosedByClient) return;

                // If setup never completed, or abnormal close → retry
                if (!setupComplete || (code !== 1000 && code !== 1005)) {
                    console.log(`[AudioLive] Retrying... next key #${keyIndex + 1}`);
                    connectToGemini(keyIndex + 1, isFallbackModel);
                } else {
                    // Normal close after successful session
                    if (clientWs.readyState === WebSocket.OPEN) clientWs.close();
                }
            });
        };

        connectToGemini(0, false);
    });

    console.log('[AudioLive] Live Audio WebSocket endpoint registered at /api/live-audio');
};

module.exports = { setupLiveVoiceWebSocket };
