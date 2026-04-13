const WebSocket = require('ws');
const Conversation = require('../models/Conversation');

const API_KEYS = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_FALLBACK
].filter(Boolean);

const HOST = 'generativelanguage.googleapis.com';

const SYSTEM_INSTRUCTION = `
أنتِ مساعدة ذكية وصوتية اسمك "غزل"، تعملين في "سنتر غرام" للتجميل. 
ردودك يجب أن تكون قصيرة جداً (سطر أو سطرين) ومباشرة وبصيغة المؤنث، لأنك في مكالمة صوتية حية مع العملاء.
دائماً استخدمي لغة مرحة، دافئة وشعبية محترمة مثل "يا حبيبتي"، "يا قمر"، "أكيد طبعاً".
تجنبي الإطالة أو الشرح المعقد. السنتر يقدم خدمات ميك اب، زفاف، عروض، وجلسات تصوير.
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
        } else {
            // we don't block new sessions
            usedSeconds = 0;
        }

        if (usedSeconds >= 300) {
            clientWs.send(JSON.stringify({ type: 'quota_exceeded', msg: 'استهلكت الخمس دقائق الصوتية اليوم، كمل معايا نصي يا قمر!' }));
            clientWs.close();
            return;
        }

        const callStartTime = Date.now();
        let currentGeminiWs = null;
        let isClosedByClient = false;

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
            } catch(err) { console.error("[AudioLive] Error saving quota:", err); }
        });

        const connectToGemini = (keyIndex, isFallbackModel) => {
            if (keyIndex >= API_KEYS.length) {
                if (!isFallbackModel) {
                    console.log("[AudioLive] Primary model failed all keys, trying fallback model...");
                    return connectToGemini(0, true);
                }
                if (!isClosedByClient) {
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
            
            const geminiWs = new WebSocket(wsUrl);
            currentGeminiWs = geminiWs;
            let setupSent = false;

            geminiWs.on('open', () => {
                console.log(`[AudioLive] Connected to ${modelName}`);
                geminiWs.send(JSON.stringify({
                    setup: {
                        model: modelName,
                        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
                        generationConfig: { responseModalities: ["AUDIO"] }
                    }
                }));
                setupSent = true;
                clientWs.send(JSON.stringify({ type: 'ready' }));
            });

            geminiWs.on('message', (data) => {
                if (clientWs.readyState === WebSocket.OPEN) {
                    clientWs.send(data.toString());
                }
            });

            geminiWs.on('error', (err) => {
                console.error(`[AudioLive] Gemini WS Error (Key ${keyIndex}, FB: ${isFallbackModel}):`, err.message);
                geminiWs.close();
            });

            geminiWs.on('close', (code) => {
                if (!setupSent || code !== 1000) {
                    // Abnormal close, try next key
                    if (!isClosedByClient) connectToGemini(keyIndex + 1, isFallbackModel);
                } else {
                    if (!isClosedByClient) clientWs.close();
                }
            });

            clientWs.on('message', (data) => {
                if (geminiWs.readyState === WebSocket.OPEN && setupSent) {
                    geminiWs.send(data);
                }
            });
        };

        connectToGemini(0, false);
    });
    
    console.log('[AudioLive] Live Audio WebSocket endpoint registered at /api/live-audio');
};

module.exports = { setupLiveVoiceWebSocket };
