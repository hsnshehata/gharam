const express = require('express');
const router = express.Router();
const adminAiController = require('../controllers/adminAiController');
const authenticate = require('../middleware/authenticate');
const SystemSetting = require('../models/SystemSetting');
const { DEFAULT_ADMIN_PROMPT } = require('../services/adminAiService');

const isAdminOrSupervisor = (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.role !== 'supervisor' && req.user.role !== 'hallSupervisor') {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    next();
};

const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    next();
};

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Admin AI Conversations
router.get('/conversations', authenticate, isAdminOrSupervisor, adminAiController.getConversations);
router.get('/conversations/:id', authenticate, isAdminOrSupervisor, adminAiController.getConversationById);
router.delete('/conversations/:id', authenticate, isAdminOrSupervisor, adminAiController.deleteConversation);
router.get('/all-conversations', authenticate, isAdmin, adminAiController.getAllConversationsAdmin);

// Admin AI Chat
router.post('/chat', authenticate, isAdminOrSupervisor, upload.single('audio'), adminAiController.chat);

// Admin AI Prompt Management
router.get('/prompt', authenticate, isAdmin, async (req, res) => {
    try {
        const setting = await SystemSetting.findOne({ key: 'admin_ai_system_prompt' });
        res.json({ success: true, data: setting ? setting.value : DEFAULT_ADMIN_PROMPT });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/prompt', authenticate, isAdmin, async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ message: 'Prompt missing' });

        await SystemSetting.findOneAndUpdate(
            { key: 'admin_ai_system_prompt' },
            { value: prompt, updatedAt: Date.now() },
            { upsert: true, new: true }
        );
        res.json({ success: true, message: 'تم الحفظ بنجاح' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

const DynamicTool = require('../models/DynamicTool');

router.get('/dynamic-tools', authenticate, isAdmin, async (req, res) => {
    try {
        const tools = await DynamicTool.find().populate('createdBy', 'username').sort({ createdAt: -1 });
        res.json({ success: true, data: tools });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.delete('/dynamic-tools/:id', authenticate, isAdmin, async (req, res) => {
    try {
        await DynamicTool.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Tool deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
