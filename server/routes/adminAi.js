const express = require('express');
const router = express.Router();
const adminAiController = require('../controllers/adminAiController');
const { verifyToken, isAdmin, isAdminOrSupervisor } = require('../utils/authMiddleware');
const SystemSetting = require('../models/SystemSetting');
const { DEFAULT_ADMIN_PROMPT } = require('../services/adminAiService');

// Admin AI Conversations
router.get('/conversations', verifyToken, isAdminOrSupervisor, adminAiController.getConversations);
router.get('/conversations/:id', verifyToken, isAdminOrSupervisor, adminAiController.getConversationById);
router.delete('/conversations/:id', verifyToken, isAdminOrSupervisor, adminAiController.deleteConversation);
router.get('/all-conversations', verifyToken, isAdmin, adminAiController.getAllConversationsAdmin);

// Admin AI Chat
router.post('/chat', verifyToken, isAdminOrSupervisor, adminAiController.chat);

// Admin AI Prompt Management
router.get('/prompt', verifyToken, isAdmin, async (req, res) => {
    try {
        const setting = await SystemSetting.findOne({ key: 'admin_ai_system_prompt' });
        res.json({ success: true, data: setting ? setting.value : "أنت مساعد ذكي للمديرين والمشرفين في غرام سلطان بيوتي سنتر.\nمهمتك مساعدة الإدارة في الرد على جميع الأسئلة المتعلقة بقواعد البيانات والتقارير المالية والعمليات.\nدائماً اعتمد على الأدوات المتاحة لجلب أحدث البيانات.\nوكن احترافياً في عرض الجداول والبيانات." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/prompt', verifyToken, isAdmin, async (req, res) => {
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

module.exports = router;
