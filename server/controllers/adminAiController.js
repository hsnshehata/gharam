const { processAdminChat, generateChatTitle } = require('../services/adminAiService');
const AdminConversation = require('../models/AdminConversation');

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
        const { text, conversationId } = req.body;
        const user = req.user;

        if (!text) {
            return res.status(400).json({ success: false, message: 'النص مطلوب' });
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

        // Pass to processAdminChat
        const reply = await processAdminChat(conv.messages, user);

        // Push model message
        conv.messages.push({ role: 'model', text: reply });
        conv.lastActivity = Date.now();
        await conv.save();

        res.json({ success: true, reply, conversationId: conv._id, title: conv.title });

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
