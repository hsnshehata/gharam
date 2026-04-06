const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const SystemSetting = require('../models/SystemSetting');
const Conversation = require('../models/Conversation');
const multer = require('multer');
const googleTTS = require('google-tts-api');
const { processAiChat, DEFAULT_PROMPT } = require('../services/aiService');
const sessionCache = require('../services/sessionCache');

// Configure multer for voice messages
const upload = multer({ storage: multer.memoryStorage() });

// ============ PROMPT MANAGEMENT ============

// GET /api/ai/prompt
router.get('/prompt', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    try {
        const setting = await SystemSetting.findOne({ key: 'ai_system_prompt' });
        res.json({ success: true, data: setting ? setting.value : DEFAULT_PROMPT });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/ai/prompt
router.post('/prompt', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ message: 'Prompt missing' });

        await SystemSetting.findOneAndUpdate(
            { key: 'ai_system_prompt' },
            { value: prompt, updatedAt: Date.now() },
            { upsert: true, new: true }
        );
        res.json({ success: true, message: 'تم الحفظ بنجاح' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============ BOT SETTINGS ============

// GET /api/ai/settings
router.get('/settings', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    try {
        const botEnabled = await SystemSetting.findOne({ key: 'ai_bot_enabled' });
        const memoryLimit = await SystemSetting.findOne({ key: 'ai_memory_limit' });
        
        res.json({
            success: true,
            data: {
                botEnabled: botEnabled ? botEnabled.value : true,
                memoryLimit: memoryLimit ? memoryLimit.value : 10
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/ai/settings
router.post('/settings', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    try {
        const { botEnabled, memoryLimit } = req.body;

        if (typeof botEnabled === 'boolean') {
            await SystemSetting.findOneAndUpdate(
                { key: 'ai_bot_enabled' },
                { value: botEnabled, updatedAt: Date.now() },
                { upsert: true, new: true }
            );
        }

        if (typeof memoryLimit === 'number' && memoryLimit >= 2 && memoryLimit <= 50) {
            await SystemSetting.findOneAndUpdate(
                { key: 'ai_memory_limit' },
                { value: memoryLimit, updatedAt: Date.now() },
                { upsert: true, new: true }
            );
        }

        res.json({ success: true, message: 'تم حفظ الإعدادات بنجاح' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============ CHAT ============

// POST /api/ai/chat
router.post('/chat', upload.single('audio'), async (req, res) => {
    try {
        // Check if bot is enabled
        const botEnabledSetting = await SystemSetting.findOne({ key: 'ai_bot_enabled' });
        if (botEnabledSetting && botEnabledSetting.value === false) {
            return res.status(503).json({ 
                success: false, 
                message: 'البوت متوقف حالياً. يرجى المحاولة لاحقاً.' 
            });
        }

        let { messages, sessionId } = req.body;
        // If coming from FormData, parse JSON strings
        if (typeof messages === 'string') {
            try { messages = JSON.parse(messages); } catch (e) { }
        }
        if (typeof sessionId === 'string' && !sessionId.trim()) sessionId = undefined;

        if (!messages || !messages.length) return res.status(400).json({ message: 'Missing messages' });

        // Get memory limit setting
        const memLimitSetting = await SystemSetting.findOne({ key: 'ai_memory_limit' });
        const memoryLimit = memLimitSetting ? memLimitSetting.value : 10;

        // If sessionId provided, load previous conversation and merge
        let fullMessages = messages;
        if (sessionId) {
            const previousMessages = await sessionCache.loadConversationHistory(sessionId, 'web');
            if (previousMessages.length > 0) {
                // Merge: previous history (trimmed) + current new messages
                // Avoid duplicates: only add history messages not already in current messages
                const currentTexts = new Set(messages.map(m => m.text));
                const uniquePrevious = previousMessages.filter(m => !currentTexts.has(m.text));
                fullMessages = [...uniquePrevious.slice(-(memoryLimit * 2)), ...messages];
            }
        }

        // Trim to memory limit (pairs of user+model = memoryLimit * 2 messages)
        if (fullMessages.length > memoryLimit * 2) {
            fullMessages = fullMessages.slice(-(memoryLimit * 2));
        }

        let fileBuffer = null;
        let fileMimeType = null;

        if (req.file) {
            fileBuffer = req.file.buffer;
            fileMimeType = req.file.mimetype;
        }

        let reply;
        try {
            reply = await processAiChat(fullMessages, fileBuffer, fileMimeType, false);
        } catch (genErr) {
            console.error('Gemini error:', genErr);
            return res.status(500).json({ message: genErr.message || 'خطأ في التواصل مع الذكاء الاصطناعي' });
        }

        // Persist messages to MongoDB (fire-and-forget)
        if (sessionId) {
            const lastUserMsg = messages[messages.length - 1];
            const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
            const userAgent = req.headers['user-agent'] || '';
            
            sessionCache.persistMessage(sessionId, 'web', 'user', lastUserMsg.text, {
                metadata: { ip: clientIp, userAgent }
            });
            sessionCache.persistMessage(sessionId, 'web', 'model', reply);
        }

        // Generate Audio Response (Base64 parts to avoid browser blocks)
        let audioParts = [];
        try {
            const axios = require('axios');
            // Split audio into chunks because Google TTS has 200 char limit
            const cleanReply = reply.replace(/[*#]/g, '').slice(0, 800); // Clean and limit for TTS stability
            const urls = googleTTS.getAllAudioUrls(cleanReply, {
                lang: 'ar',
                slow: false,
                host: 'https://translate.google.com',
            });

            // Fetch each chunk and convert to base64
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

        res.json({ success: true, reply, audioParts });
    } catch (err) {
        console.error('Request error:', err);
        res.status(500).json({ message: 'خطأ داخلي في الخادم' });
    }
});

// ============ CONVERSATION HISTORY (Admin Only) ============

// GET /api/ai/conversations/stats
router.get('/conversations/stats', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    try {
        const [webCount, messengerCount, commentCount, totalMessages] = await Promise.all([
            Conversation.countDocuments({ source: 'web' }),
            Conversation.countDocuments({ source: 'messenger' }),
            Conversation.countDocuments({ source: 'comment' }),
            Conversation.aggregate([
                { $project: { msgCount: { $size: '$messages' } } },
                { $group: { _id: null, total: { $sum: '$msgCount' } } }
            ])
        ]);

        res.json({
            success: true,
            data: {
                web: webCount,
                messenger: messengerCount,
                comment: commentCount,
                total: webCount + messengerCount + commentCount,
                totalMessages: totalMessages[0]?.total || 0
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/ai/conversations
router.get('/conversations', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    try {
        const { source, search, page = 1, limit = 30 } = req.query;
        const filter = {};
        
        if (source && ['web', 'messenger', 'comment'].includes(source)) {
            filter.source = source;
        }

        if (search) {
            filter.$or = [
                { senderName: { $regex: search, $options: 'i' } },
                { senderId: { $regex: search, $options: 'i' } },
                { sessionId: { $regex: search, $options: 'i' } },
                { 'messages.text': { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const [conversations, total] = await Promise.all([
            Conversation.find(filter)
                .sort({ lastActivity: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .select('sessionId source senderName senderId lastActivity metadata messages')
                .lean()
                .then(convs => convs.map(c => ({
                    ...c,
                    messageCount: c.messages?.length || 0,
                    lastMessage: c.messages?.length ? c.messages[c.messages.length - 1] : null,
                    firstMessage: c.messages?.length ? c.messages[0] : null,
                    messages: undefined // Don't send all messages in list view
                }))),
            Conversation.countDocuments(filter)
        ]);

        res.json({
            success: true,
            data: conversations,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/ai/conversations/:id
router.get('/conversations/:id', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    try {
        const conversation = await Conversation.findById(req.params.id).lean();
        if (!conversation) return res.status(404).json({ message: 'المحادثة غير موجودة' });
        res.json({ success: true, data: conversation });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/ai/conversations/:id
router.delete('/conversations/:id', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    try {
        const result = await Conversation.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ message: 'المحادثة غير موجودة' });
        res.json({ success: true, message: 'تم حذف المحادثة بنجاح' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/ai/conversations - Delete all conversations (with optional source filter)
router.delete('/conversations', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    try {
        const { source } = req.query;
        const filter = {};
        if (source && ['web', 'messenger', 'comment'].includes(source)) {
            filter.source = source;
        }
        const result = await Conversation.deleteMany(filter);
        res.json({ success: true, message: `تم حذف ${result.deletedCount} محادثة`, deletedCount: result.deletedCount });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/ai/chat/history/:sessionId - Load chat history for web client
router.get('/chat/history/:sessionId', async (req, res) => {
    try {
        const messages = await sessionCache.loadConversationHistory(req.params.sessionId, 'web');
        res.json({ success: true, data: messages });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
