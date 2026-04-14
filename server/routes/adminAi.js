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

const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const { DEFAULT_PROMPT, publicTools, publicChatFunctions } = require('../services/aiService');
const { adminTools, createAdminFunctions } = require('../services/adminAiService');

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

// ============ HELPER: Convert Gemini tool schema to OpenAI format ============
function geminiToolsToOpenAI(geminiTools) {
    const openaiTools = [];
    for (const toolGroup of geminiTools) {
        for (const decl of toolGroup.functionDeclarations || []) {
            const params = { type: 'object', properties: {}, required: decl.parameters?.required || [] };
            for (const [key, val] of Object.entries(decl.parameters?.properties || {})) {
                params.properties[key] = {
                    type: val.type?.toLowerCase() === 'number' ? 'number' : 'string',
                    description: val.description || ''
                };
            }
            openaiTools.push({
                type: 'function',
                function: { name: decl.name, description: decl.description, parameters: params }
            });
        }
    }
    return openaiTools;
}

// POST /api/admin-ai/test-model — test a single model WITH real tools (function calling)
router.post('/test-model', authenticate, isAdmin, async (req, res) => {
    try {
        const { modelId, message, promptType } = req.body;
        // promptType: 'public' = ghazal bot tools, 'admin' = admin AI tools

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

        // Select tools and function handlers based on prompt type
        let geminiTools, functionHandlers;
        const toolsCalled = []; // Track which tools were called

        if (promptType === 'admin') {
            geminiTools = adminTools;
            functionHandlers = createAdminFunctions(req.user);
        } else {
            geminiTools = publicTools;
            functionHandlers = publicChatFunctions;
        }

        const startTime = Date.now();
        let reply = '';
        let error = null;
        let tokens = null;

        // Determine provider
        const isOpenAI = modelId.startsWith('gpt-');

        if (isOpenAI) {
            if (!process.env.OPENAI_API_KEY) {
                return res.json({ success: true, data: { reply: '', error: 'مفتاح OpenAI غير متوفر', latency: 0, model: modelId, toolsCalled: [] } });
            }
            try {
                const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
                const openaiToolDefs = geminiToolsToOpenAI(geminiTools);
                const messages = [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message }
                ];

                let callCount = 0;
                while (callCount < 5) {
                    const completionParams = {
                        model: modelId,
                        messages,
                        max_tokens: 1200
                    };
                    if (openaiToolDefs.length > 0) {
                        completionParams.tools = openaiToolDefs;
                    }

                    const completion = await openai.chat.completions.create(completionParams);
                    const choice = completion.choices[0];
                    tokens = completion.usage || null;

                    // Check if model wants to call tools
                    if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls?.length > 0) {
                        messages.push(choice.message); // Add assistant message with tool_calls

                        for (const toolCall of choice.message.tool_calls) {
                            const funcName = toolCall.function.name;
                            let args = {};
                            try { args = JSON.parse(toolCall.function.arguments || '{}'); } catch (e) { }

                            toolsCalled.push({ name: funcName, args: Object.keys(args) });

                            let toolResult = { error: `أداة ${funcName} غير معروفة` };
                            if (functionHandlers[funcName]) {
                                try {
                                    toolResult = await functionHandlers[funcName](args);
                                } catch (e) {
                                    toolResult = { error: e.message };
                                }
                            }

                            messages.push({
                                role: 'tool',
                                tool_call_id: toolCall.id,
                                content: JSON.stringify(toolResult)
                            });
                        }
                        callCount++;
                        continue; // Re-call with tool results
                    }

                    // No more tool calls — get the final response
                    reply = choice.message?.content || '';
                    break;
                }
            } catch (e) {
                error = e.message?.slice(0, 200);
            }
        } else {
            // ===== Gemini model with function calling =====
            const apiKeys = [process.env.GEMINI_API_KEY];
            if (process.env.GEMINI_API_KEY_2) apiKeys.push(process.env.GEMINI_API_KEY_2);

            for (const key of apiKeys) {
                try {
                    const genAI = new GoogleGenerativeAI(key);
                    const model = genAI.getGenerativeModel({
                        model: modelId,
                        systemInstruction: systemPrompt,
                        tools: geminiTools
                    });

                    const chat = model.startChat({ history: [] });
                    let result = await chat.sendMessage(message);
                    let response = result.response;

                    // Function calling loop (max 5 rounds)
                    let callCount = 0;
                    while (response.functionCalls()?.length && callCount < 5) {
                        const functionCalls = response.functionCalls();
                        const functionResponses = [];

                        for (const call of functionCalls) {
                            const funcName = call.name;
                            const args = call.args;
                            toolsCalled.push({ name: funcName, args: Object.keys(args || {}) });

                            if (functionHandlers[funcName]) {
                                const data = await functionHandlers[funcName](args);
                                functionResponses.push({
                                    functionResponse: {
                                        name: funcName,
                                        response: { content: data }
                                    }
                                });
                            }
                        }

                        if (functionResponses.length > 0) {
                            result = await chat.sendMessage(functionResponses);
                            response = result.response;
                        }
                        callCount++;
                    }

                    reply = response.text();
                    const usage = response.usageMetadata;
                    if (usage) {
                        tokens = {
                            prompt_tokens: usage.promptTokenCount,
                            completion_tokens: usage.candidatesTokenCount,
                            total_tokens: usage.totalTokenCount
                        };
                    }
                    error = null; // success — clear any previous key errors
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
                tokens,
                toolsCalled
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;

