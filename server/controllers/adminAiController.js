const { processAdminChat, generateChatTitle } = require('../services/adminAiService');
const AdminConversation = require('../models/AdminConversation');
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
            .sort({ lastActivity: -1 });
        res.json({ success: true, data: convs });
    } catch (err) {
        res.status(500).json({ success: false, message: 'خطأ في جلب بيانات المحادثات الإدارية' });
    }
};

// Post Chat
exports.chat = async (req, res) => {
    try {
        let { text, conversationId, messages } = req.body;
        const user = req.user;

        // Extract JSON messages if it came as FormData
        if (typeof messages === 'string') {
            try { messages = JSON.parse(messages); } catch (e) { }
        }

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
            conv = await AdminConversation.findOne({ _id: conversationId, userId: user.id });
            if (!conv) return res.status(404).json({ success: false, message: 'المحادثة غير موجودة' });
        } else {
            conv = new AdminConversation({ userId: user.id, messages: [] });
            isNew = true;
        }

        // Push user message
        conv.messages.push({ role: 'user', text });
        conv.lastActivity = Date.now();
        await conv.save();

        // If we didn't receive full messages state from frontend, use local length-limited fallback
        if (!messages || !Array.isArray(messages)) {
            messages = conv.messages;
            if (!text) text = "رسالة صوتية"; // default if only audio
        } else {
            // we have messages from frontend
            if (!text) text = messages[messages.length - 1].text || "رسالة صوتية";
        }

        // Pass to processAdminChat
        const reply = await processAdminChat(messages, user, fileBuffer, fileMimeType);

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

        // Generate title asynchronously if new
        if (isNew) {
            generateChatTitle(text).then(title => {
                conv.title = title || text.substring(0, 20) + '...';
                conv.save();
            }).catch(e => console.error("Title gen error:", e));
        }

    } catch (err) {
        console.error('[AdminAI] error in chat:', err);
        res.status(500).json({ success: false, message: 'تعذر الاتصال بالمساعد الذكي للإدارة', error: err.message });
    }
};
