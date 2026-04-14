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

// ============ MODEL COMPARISON & CONFIGURATION ============

const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const { DEFAULT_PROMPT } = require('../services/aiService');

// GET /api/admin-ai/model-config — get current model chain + all available models
router.get('/model-config', authenticate, isAdmin, async (req, res) => {
    try {
        const setting = await SystemSetting.findOne({ key: 'ai_model_chain' });
        const disabledSetting = await SystemSetting.findOne({ key: 'ai_disabled_models' });

        // All known models across the system
        const allModels = [
            { id: 'gemini-3-flash-preview', provider: 'google', label: 'Gemini 3 Flash Preview', tier: 'fast' },
            { id: 'gemini-2.5-flash', provider: 'google', label: 'Gemini 2.5 Flash', tier: 'fast' },
            { id: 'gemini-3.1-flash-lite-preview', provider: 'google', label: 'Gemini 3.1 Flash Lite', tier: 'lite' },
            { id: 'gemini-2.5-flash-lite', provider: 'google', label: 'Gemini 2.5 Flash Lite', tier: 'lite' },
            { id: 'gemini-3.1-pro-preview', provider: 'google', label: 'Gemini 3.1 Pro Preview', tier: 'pro' },
            { id: 'gemini-2.5-pro', provider: 'google', label: 'Gemini 2.5 Pro', tier: 'pro' },
            { id: 'gpt-4o-mini', provider: 'openai', label: 'GPT-4o Mini', tier: 'fast' },
        ];

        // Default chain if nothing saved
        const defaultChain = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-3.1-flash-lite-preview', 'gpt-4o-mini'];
        const currentChain = setting ? JSON.parse(setting.value) : defaultChain;
        const disabledModels = disabledSetting ? JSON.parse(disabledSetting.value) : [];

        res.json({
            success: true,
            data: {
                allModels,
                currentChain,
                disabledModels,
                hasOpenAI: !!process.env.OPENAI_API_KEY,
                hasGeminiBackup: !!process.env.GEMINI_API_KEY_2
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/admin-ai/model-config — save model chain order + disabled models
router.post('/model-config', authenticate, isAdmin, async (req, res) => {
    try {
        const { chain, disabledModels } = req.body;

        if (chain && Array.isArray(chain)) {
            await SystemSetting.findOneAndUpdate(
                { key: 'ai_model_chain' },
                { value: JSON.stringify(chain), updatedAt: Date.now() },
                { upsert: true, new: true }
            );
        }

        if (disabledModels && Array.isArray(disabledModels)) {
            await SystemSetting.findOneAndUpdate(
                { key: 'ai_disabled_models' },
                { value: JSON.stringify(disabledModels), updatedAt: Date.now() },
                { upsert: true, new: true }
            );
        }

        res.json({ success: true, message: 'تم حفظ ترتيب النماذج بنجاح' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/admin-ai/test-model — test a single specific model with a message
router.post('/test-model', authenticate, isAdmin, async (req, res) => {
    try {
        const { modelId, message, promptType } = req.body;
        // promptType: 'public' = ghazal bot prompt, 'admin' = admin AI prompt

        if (!modelId || !message) {
            return res.status(400).json({ success: false, message: 'النموذج والرسالة مطلوبين' });
        }

        // Load system prompt based on type
        let systemPrompt = '';
        if (promptType === 'admin') {
            const setting = await SystemSetting.findOne({ key: 'admin_ai_system_prompt' });
            systemPrompt = setting?.value || DEFAULT_ADMIN_PROMPT;
        } else {
            const setting = await SystemSetting.findOne({ key: 'ai_system_prompt' });
            systemPrompt = setting?.value || DEFAULT_PROMPT;
        }

        // Add current date context
        const now = new Date();
        const cairoDate = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Cairo' }));
        const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        systemPrompt += `\n\nمعلومات الوقت: اليوم ${dayNames[cairoDate.getDay()]} ${cairoDate.toISOString().split('T')[0]}`;

        const startTime = Date.now();
        let reply = '';
        let error = null;
        let tokens = null;

        // Determine provider
        const isOpenAI = modelId.startsWith('gpt-');

        if (isOpenAI) {
            if (!process.env.OPENAI_API_KEY) {
                return res.json({ success: true, data: { reply: '', error: 'مفتاح OpenAI غير متوفر', latency: 0, model: modelId } });
            }
            try {
                const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
                const completion = await openai.chat.completions.create({
                    model: modelId,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: message }
                    ],
                    max_tokens: 1200
                });
                reply = completion.choices[0]?.message?.content || '';
                tokens = completion.usage || null;
            } catch (e) {
                error = e.message?.slice(0, 200);
            }
        } else {
            // Gemini model
            const apiKeys = [process.env.GEMINI_API_KEY];
            if (process.env.GEMINI_API_KEY_2) apiKeys.push(process.env.GEMINI_API_KEY_2);

            for (const key of apiKeys) {
                try {
                    const genAI = new GoogleGenerativeAI(key);
                    const model = genAI.getGenerativeModel({
                        model: modelId,
                        systemInstruction: systemPrompt
                    });
                    const result = await model.generateContent(message);
                    reply = result.response.text();
                    const usage = result.response.usageMetadata;
                    if (usage) {
                        tokens = {
                            prompt_tokens: usage.promptTokenCount,
                            completion_tokens: usage.candidatesTokenCount,
                            total_tokens: usage.totalTokenCount
                        };
                    }
                    break;
                } catch (e) {
                    error = e.message?.slice(0, 200);
                }
            }
        }

        const latency = Date.now() - startTime;

        res.json({
            success: true,
            data: {
                model: modelId,
                reply,
                error,
                latency,
                tokens
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
