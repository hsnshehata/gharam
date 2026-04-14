const { processAdminChat, generateChatTitle } = require('../services/adminAiService');
const AdminConversation = require('../models/AdminConversation');
const User = require('../models/User');
const googleTTS = require('google-tts-api');
const axios = require('axios');

// Fetch user's own conversations (list)
exports.getConversations = async (req, res) => {
    try {
        const convs = await AdminConversation.find({ userId: req.user.id })
            .select('title lastActivity')
            .sort({ lastActivity: -1 });
        res.json({ success: true, data: convs });
    } catch (err) {
        res.status(500).json({ success: false, message: 'تعذر جلب المحادثات' });
    }
};

// Fetch specific conversation
exports.getConversationById = async (req, res) => {
    try {
        const conv = await AdminConversation.findOne({ _id: req.params.id, userId: req.user.id });
        if (!conv) return res.status(404).json({ success: false, message: 'غير موجود' });
        res.json({ success: true, data: conv });
    } catch (err) {
        res.status(500).json({ success: false, message: 'خطأ في جلب المحادثة' });
    }
};

// Delete conversation
exports.deleteConversation = async (req, res) => {
    try {
        await AdminConversation.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        res.json({ success: true, message: 'تم الحذف' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'خطأ في الحذف' });
    }
};

// Admin only: Get ALL conversations from everyone
exports.getAllConversationsAdmin = async (req, res) => {
    try {
        // Only actual Admin
        if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'متاح للمدير فقط' });
        const convs = await AdminConversation.find({})
            .populate('userId', 'username role')
            .populate('telegramAccountId', 'name role')
            .sort({ lastActivity: -1 });
        res.json({ success: true, data: convs });
    } catch (err) {
        res.status(500).json({ success: false, message: 'خطأ في جلب بيانات المحادثات الإدارية' });
    }
};

// Post Chat (SSE Stream for real-time tool events)
exports.chat = async (req, res) => {
    try {
        let { text, conversationId, messages, additionalPrompt, fastMode, specificModel } = req.body;
        const fullUser = await User.findById(req.user.id);
        if (!fullUser) return res.status(401).json({ success: false, message: 'مستخدم غير موجود' });

        // Extract JSON messages if it came as FormData
        if (typeof messages === 'string') {
            try { messages = JSON.parse(messages); } catch (e) { }
        }
        // FormData sends fastMode as string
        if (typeof fastMode === 'string') fastMode = fastMode === 'true';

        if (!text && !req.file) {
            return res.status(400).json({ success: false, message: 'النص أو الصوت مطلوب' });
        }

        let fileBuffer = null;
        let fileMimeType = null;
        if (req.file) {
            fileBuffer = req.file.buffer;
            fileMimeType = req.file.mimetype;
        }

        let conv;
        let isNew = false;
        
        if (conversationId) {
            conv = await AdminConversation.findOne({ _id: conversationId, userId: req.user.id });
            if (!conv) return res.status(404).json({ success: false, message: 'المحادثة غير موجودة' });
        } else {
            conv = new AdminConversation({ userId: req.user.id, messages: [] });
            isNew = true;
        }

        // Set default text for audio messages before saving to DB to avoid validation errors
        if (!text) {
            if (messages && Array.isArray(messages) && messages.length > 0) {
                text = messages[messages.length - 1].text || "رسالة صوتية";
            } else {
                text = "رسالة صوتية";
            }
        }

        // Push user message
        conv.messages.push({ role: 'user', text });
        conv.lastActivity = Date.now();
        await conv.save();

        // Always use the database conversation history as the single source of truth
        messages = conv.messages;

        // Check if client supports SSE streaming
        const acceptsStream = req.headers.accept && req.headers.accept.includes('text/event-stream');

        if (acceptsStream) {
            // === SSE Stream Mode ===
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no',
                'Content-Encoding': 'identity'
            });
            res.flushHeaders();

            const sendSSE = (data) => {
                try {
                    res.write(`data: ${JSON.stringify(data)}\n\n`);
                    // Force flush for compression middleware & proxies
                    if (typeof res.flush === 'function') res.flush();
                } catch (e) { }
            };

            const onToolCall = (event) => {
                sendSSE(event);
            };

            // Process with streaming tool events
            const reply = await processAdminChat(messages, fullUser, fileBuffer, fileMimeType, additionalPrompt, onToolCall, !!fastMode, specificModel || null);

            // Push model message
            conv.messages.push({ role: 'model', text: reply });
            conv.lastActivity = Date.now();
            await conv.save();

            // Generate TTS
            let audioParts = [];
            try {
                const cleanReply = reply.replace(/[*#]/g, '').slice(0, 800);
                const urls = googleTTS.getAllAudioUrls(cleanReply, {
                    lang: 'ar',
                    slow: false,
                    host: 'https://translate.google.com',
                });
                for (const item of urls) {
                    try {
                        const audioRes = await axios.get(item.url, { responseType: 'arraybuffer' });
                        const base64 = Buffer.from(audioRes.data).toString('base64');
                        audioParts.push(`data:audio/mpeg;base64,${base64}`);
                    } catch (fetchErr) {
                        console.error('Error fetching TTS chunk:', fetchErr.message);
                    }
                }
            } catch (ttsErr) {
                console.error('TTS error:', ttsErr);
            }

            // Send final result
            sendSSE({ type: 'done', reply, audioParts, conversationId: conv._id, title: conv.title });
            res.end();

        } else {
            // === Legacy JSON Mode (for Telegram & other clients) ===
            const reply = await processAdminChat(messages, fullUser, fileBuffer, fileMimeType, additionalPrompt, null, !!fastMode, specificModel || null);

            // Push model message
            conv.messages.push({ role: 'model', text: reply });
            conv.lastActivity = Date.now();
            await conv.save();

            let audioParts = [];
            try {
                const cleanReply = reply.replace(/[*#]/g, '').slice(0, 800);
                const urls = googleTTS.getAllAudioUrls(cleanReply, {
                    lang: 'ar',
                    slow: false,
                    host: 'https://translate.google.com',
                });
                for (const item of urls) {
                    try {
                        const audioRes = await axios.get(item.url, { responseType: 'arraybuffer' });
                        const base64 = Buffer.from(audioRes.data).toString('base64');
                        audioParts.push(`data:audio/mpeg;base64,${base64}`);
                    } catch (fetchErr) {
                        console.error('Error fetching TTS chunk:', fetchErr.message);
                    }
                }
            } catch (ttsErr) {
                console.error('TTS error:', ttsErr);
            }

            res.json({ success: true, reply, audioParts, conversationId: conv._id, title: conv.title });
        }

        // Generate title asynchronously if new
        if (isNew) {
            generateChatTitle(text).then(title => {
                conv.title = title || text.substring(0, 20) + '...';
                conv.save();
            }).catch(e => console.error("Title gen error:", e));
        }

    } catch (err) {
        console.error('[AdminAI] error in chat:', err);
        // If headers already sent (SSE mode), try to send error event then close
        if (res.headersSent) {
            try {
                res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
                res.end();
            } catch (e) { }
        } else {
            res.status(500).json({ success: false, message: 'تعذر الاتصال بالمساعد الذكي للإدارة', error: err.message });
        }
    }
};
