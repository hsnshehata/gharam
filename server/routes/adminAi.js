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
router.get('/debug-tools-dump', async (req, res) => {
    try {
        const pages = await require('../models/AfrakoushPage').find({}).lean();
        const tools = await require('../models/DynamicTool').find({}).lean();
        res.json({pages, tools});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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

// Execute a Dynamic Tool natively without LLM overhead
router.post('/execute-tool/:name', authenticate, async (req, res) => {
    try {
        const toolName = req.params.name;
        const tool = await DynamicTool.findOne({ name: toolName });
        if (!tool) return res.status(404).json({ success: false, message: 'Tool not found' });
        
        // Security check: Only allow employees to run survey tools. Other tools require admin/supervisor.
        const isSurveyTool = toolName.startsWith('employee_quick_survey_');
        const role = req.user.role;
        if (!isSurveyTool && role !== 'admin' && role !== 'supervisor' && role !== 'hallSupervisor') {
             return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const fs = require('fs');
        const path = require('path');
        const models = {};
        const modelsDir = path.join(__dirname, '../models');
        fs.readdirSync(modelsDir).forEach(file => {
             if (file.endsWith('.js')) {
                 const mName = file.replace('.js', '');
                 models[mName] = require(`../models/${mName}`);
             }
        });

        const safeRequire = (mod) => {
            if (mod === 'mongoose') return require('mongoose');
            if (mod === 'axios') return require('axios');
            if (mod === 'moment') return require('moment');
            throw new Error('Module Not Allowed: ' + mod);
        };
        
        let scriptBody = tool.script.trim();
        scriptBody = scriptBody.replace(/module\.exports\s*=\s*/, '');
        if (scriptBody.startsWith('async function') || scriptBody.startsWith('function')) {
            scriptBody = `const fn = ${scriptBody};\nreturn await fn(models, args, require);`;
        } else {
            scriptBody = `
                return (async function(models, args, require) {
                    ${scriptBody}
                })(models, args, require);
            `;
        }

        const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
        const executeTool = new AsyncFunction('models', 'args', 'require', scriptBody);
        
        // Execute script with request body as args
        const result = await executeTool(models, req.body, safeRequire);
        
        // Update statistics
        tool.runCount = (tool.runCount || 0) + 1;
        tool.lastRun = new Date();
        await tool.save();

        res.json({ success: true, result });
    } catch (err) {
        console.error('Error executing tool natively:', err);
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
        const adminFastSetting = await SystemSetting.findOne({ key: 'admin_fast_chain' });
        const adminProSetting = await SystemSetting.findOne({ key: 'admin_pro_chain' });

        // All known models across the system
        let allModels = [
            // ── Google Gemini ──
            { id: 'gemini-3-flash-preview', provider: 'google', label: 'Gemini 3 Flash Preview', tier: 'fast', family: 'google', subfamily: 'flash' },
            { id: 'gemini-2.5-flash', provider: 'google', label: 'Gemini 2.5 Flash', tier: 'fast', family: 'google', subfamily: 'flash' },
            { id: 'gemini-3.1-flash-lite-preview', provider: 'google', label: 'Gemini 3.1 Flash Lite', tier: 'lite', family: 'google', subfamily: 'flash-lite' },
            { id: 'gemini-2.5-flash-lite', provider: 'google', label: 'Gemini 2.5 Flash Lite', tier: 'lite', family: 'google', subfamily: 'flash-lite' },
            { id: 'gemini-3.1-pro-preview', provider: 'google', label: 'Gemini 3.1 Pro Preview', tier: 'pro', family: 'google', subfamily: 'pro' },
            { id: 'gemini-2.5-pro', provider: 'google', label: 'Gemini 2.5 Pro', tier: 'pro', family: 'google', subfamily: 'pro' },
            // ── OpenAI Flagship ──
            { id: 'gpt-5.4', provider: 'openai', label: 'GPT-5.4', tier: 'pro', family: 'openai', subfamily: 'flagship' },
            // ── OpenAI Nano (cheapest & fastest) ──
            { id: 'gpt-4.1-nano', provider: 'openai', label: 'GPT-4.1 Nano', tier: 'fast', family: 'openai', subfamily: 'nano', comparisonGroup: 'openai-10m-shared', eligibleForSharedFreeTraffic: true, pricing: { inputPer1M: 0.10, outputPer1M: 0.40, currency: 'USD' } },
            { id: 'gpt-5-nano', provider: 'openai', label: 'GPT-5 Nano', tier: 'fast', family: 'openai', subfamily: 'nano', comparisonGroup: 'openai-10m-shared', eligibleForSharedFreeTraffic: true, pricing: { inputPer1M: 0.20, outputPer1M: 1.25, currency: 'USD' } },
            { id: 'gpt-5.4-nano', provider: 'openai', label: 'GPT-5.4 Nano', tier: 'fast', family: 'openai', subfamily: 'nano', comparisonGroup: 'openai-10m-shared', eligibleForSharedFreeTraffic: true, pricing: { inputPer1M: 0.20, outputPer1M: 1.25, currency: 'USD' } },
            // ── OpenAI Mini ──
            { id: 'gpt-4o-mini', provider: 'openai', label: 'GPT-4o Mini', tier: 'fast', family: 'openai', subfamily: 'mini', comparisonGroup: 'openai-10m-shared', eligibleForSharedFreeTraffic: true, pricing: { inputPer1M: 0.15, outputPer1M: 0.60, currency: 'USD' } },
            { id: 'gpt-4.1-mini', provider: 'openai', label: 'GPT-4.1 Mini', tier: 'lite', family: 'openai', subfamily: 'mini', comparisonGroup: 'openai-10m-shared', eligibleForSharedFreeTraffic: true, pricing: { inputPer1M: 0.40, outputPer1M: 1.60, currency: 'USD' } },
            { id: 'gpt-5-mini', provider: 'openai', label: 'GPT-5 Mini', tier: 'lite', family: 'openai', subfamily: 'mini', comparisonGroup: 'openai-10m-shared', eligibleForSharedFreeTraffic: true, pricing: { inputPer1M: 0.25, outputPer1M: 2.00, currency: 'USD' } },
            { id: 'gpt-5.4-mini', provider: 'openai', label: 'GPT-5.4 Mini', tier: 'pro', family: 'openai', subfamily: 'mini', comparisonGroup: 'openai-10m-shared', eligibleForSharedFreeTraffic: true, pricing: { inputPer1M: 0.75, outputPer1M: 4.50, currency: 'USD' } },
            // NOTE: Codex Mini models (gpt-5.1-codex-mini, codex-mini-latest) excluded — they only support /v1/responses, not /v1/chat/completions
            // ── OpenAI Reasoning Mini ──
            { id: 'o1-mini', provider: 'openai', label: 'o1 Mini', tier: 'pro', family: 'openai', subfamily: 'reasoning-mini', category: 'reasoning', comparisonGroup: 'openai-10m-shared', eligibleForSharedFreeTraffic: true, pricing: { inputPer1M: 1.10, outputPer1M: 4.40, currency: 'USD' } },
            { id: 'o3-mini', provider: 'openai', label: 'o3 Mini', tier: 'pro', family: 'openai', subfamily: 'reasoning-mini', category: 'reasoning', comparisonGroup: 'openai-10m-shared', eligibleForSharedFreeTraffic: true, pricing: { inputPer1M: 1.10, outputPer1M: 4.40, currency: 'USD' } },
            { id: 'o4-mini', provider: 'openai', label: 'o4 Mini', tier: 'pro', family: 'openai', subfamily: 'reasoning-mini', category: 'reasoning', comparisonGroup: 'openai-10m-shared', eligibleForSharedFreeTraffic: true, pricing: { inputPer1M: 1.10, outputPer1M: 4.40, currency: 'USD' } },
        ];

        try {
            if (process.env.OPENROUTER_API_KEY) {
                const axios = require('axios');
                const response = await axios.get('https://openrouter.ai/api/v1/models', {
                    headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}` }
                });
                const CHAT_INCOMPATIBLE = ['lyria', 'llama-guard', 'whisper', 'dall-e'];
                const openRouterModels = response.data.data
                    .filter(m => !CHAT_INCOMPATIBLE.some(x => m.id.includes(x)))
                    .map(m => {
                        const isFree = m.pricing && m.pricing.prompt === "0" && m.pricing.completion === "0";
                        return {
                            id: m.id,
                            provider: 'openrouter',
                            label: m.name,
                            tier: isFree ? 'fast' : (m.pricing.prompt > 0.001 ? 'pro' : 'lite'),
                            isFree: isFree
                        };
                    });
                allModels = [...allModels, ...openRouterModels];
            }
        } catch (e) {
            console.error('Error fetching OpenRouter models:', e.message);
        }


        // Default chains
        const defaultPublicChain = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-3.1-flash-lite-preview', 'gpt-4o-mini', 'gpt-4.1-nano', 'gpt-5-nano'];
        const defaultAdminFastChain = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-3.1-flash-lite-preview', 'gpt-4o-mini', 'gpt-4.1-nano', 'gpt-5-nano'];
        const defaultAdminProChain = ['gemini-3.1-pro-preview', 'gemini-2.5-pro', 'o4-mini', 'o3-mini', 'gpt-5.4-mini', 'gpt-5-mini', 'gpt-4.1-mini'];

        const currentChain = setting ? JSON.parse(setting.value) : defaultPublicChain;
        const disabledModels = disabledSetting ? JSON.parse(disabledSetting.value) : [];
        const adminFastChain = adminFastSetting ? JSON.parse(adminFastSetting.value) : defaultAdminFastChain;
        const adminProChain = adminProSetting ? JSON.parse(adminProSetting.value) : defaultAdminProChain;

        res.json({
            success: true,
            data: {
                allModels,
                currentChain,
                disabledModels,
                adminFastChain,
                adminProChain,
                hasOpenAI: !!process.env.OPENAI_API_KEY,
                hasGeminiBackup: !!process.env.GEMINI_API_KEY_2,
                hasOpenRouter: !!process.env.OPENROUTER_API_KEY
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/admin-ai/model-config — save model chain order + disabled models
router.post('/model-config', authenticate, isAdmin, async (req, res) => {
    try {
        const { chain, disabledModels, adminFastChain, adminProChain } = req.body;

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

        if (adminFastChain && Array.isArray(adminFastChain)) {
            await SystemSetting.findOneAndUpdate(
                { key: 'admin_fast_chain' },
                { value: JSON.stringify(adminFastChain), updatedAt: Date.now() },
                { upsert: true, new: true }
            );
        }

        if (adminProChain && Array.isArray(adminProChain)) {
            await SystemSetting.findOneAndUpdate(
                { key: 'admin_pro_chain' },
                { value: JSON.stringify(adminProChain), updatedAt: Date.now() },
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
        const isOpenRouter = modelId.includes('/');
        const isOpenAI = modelId.startsWith('gpt-') || modelId.startsWith('o4-') || modelId.startsWith('o3-') || modelId.startsWith('o1-') || modelId.startsWith('codex-');

        if (isOpenAI || isOpenRouter) {
            if (isOpenAI && !process.env.OPENAI_API_KEY) {
                return res.json({ success: true, data: { reply: '', error: 'مفتاح OpenAI غير متوفر', latency: 0, model: modelId, toolsCalled: [] } });
            }
            if (isOpenRouter && !process.env.OPENROUTER_API_KEY) {
                return res.json({ success: true, data: { reply: '', error: 'مفتاح OpenRouter غير متوفر', latency: 0, model: modelId, toolsCalled: [] } });
            }
            try {
                const baseURL = isOpenRouter ? 'https://openrouter.ai/api/v1' : undefined;
                const apiKey = isOpenRouter ? process.env.OPENROUTER_API_KEY : process.env.OPENAI_API_KEY;
                const openai = new OpenAI({ 
                    apiKey, 
                    baseURL,
                    defaultHeaders: isOpenRouter ? {
                        'HTTP-Referer': 'https://gharam.art',
                        'X-OpenRouter-Title': 'Gharam Admin AI'
                    } : undefined
                });

                const openaiToolDefs = geminiToolsToOpenAI(geminiTools);
                const messages = [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message }
                ];

                let callCount = 0;
                while (callCount < 5) {
                    const completionParams = {
                        model: modelId,
                        messages
                    };

                    if (modelId.includes('nemotron') || modelId.includes('minimax') || modelId.includes('gpt-oss')) {
                        completionParams.reasoning = { enabled: true };
                    }

                    if (modelId.startsWith('o4-') || modelId.startsWith('o3-') || modelId.startsWith('o1-')) {
                        completionParams.reasoning_effort = 'high';
                        completionParams.max_completion_tokens = 25000;
                    } else if (modelId === 'gpt-5.4-mini' || modelId === 'gpt-5.4') {
                        if (modelId === 'gpt-5.4-mini') {
                            completionParams.reasoning_effort = 'medium';
                            completionParams.max_completion_tokens = 16000;
                        } else {
                            completionParams.max_completion_tokens = 4096;
                        }
                    } else if (modelId === 'gpt-5-mini') {
                        completionParams.reasoning_effort = 'high';
                        completionParams.max_completion_tokens = 16000;
                    } else if (/^(gpt-5|gpt-4\.1|codex-)/.test(modelId)) {
                        // Newer models (nano, gpt-4.1-mini, codex-*) require max_completion_tokens
                        completionParams.max_completion_tokens = 4096;
                    } else {
                        // Legacy models (gpt-4o-mini etc.)
                        completionParams.max_tokens = 1200;
                    }

                    if (openaiToolDefs.length > 0) {
                        completionParams.tools = openaiToolDefs;
                    }

                    let completion = null;
                    let lastErr = null;
                    let retryCount = 0;
                    
                    while (retryCount < 2 && !completion) {
                        try {
                            completion = await openai.chat.completions.create(completionParams);
                        } catch (err) {
                            lastErr = err;
                            const errStatus = err.status || err.error?.status || err.response?.status;
                            const errMsg = (err.message || '').toLowerCase();
                            
                            const isToolError = completionParams.tools && completionParams.tools.length > 0 && 
                                (
                                    (errStatus && [400, 402, 403, 404, 422].includes(errStatus)) || 
                                    errMsg.includes('tool') || 
                                    errMsg.includes('schema') ||
                                    errMsg.includes('no endpoints found')
                                );
                            
                            if (isToolError) {
                                // Drop tools immediately and retry without incrementing rate-limit retry counter
                                delete completionParams.tools;
                                reply += `\n\n*(ملاحظة: هذا النموذج لا يدعم استخدام الأدوات وتم تجربته في وضع الدردشة العادية)*`;
                            } else if (errStatus === 429 || errMsg.includes('429')) {
                                retryCount++;
                                if (retryCount < 2) {
                                    const delay = 1500 + Math.random() * 2000;
                                    console.log(`Got 429 Rate Limit for model ${modelId} - Retrying in ${(delay/1000).toFixed(1)}s...`);
                                    await new Promise(r => setTimeout(r, delay));
                                }
                            } else {
                                throw err;
                            }
                        }
                    }
                    
                    if (!completion && lastErr) {
                        throw lastErr;
                    }
                    const choice = completion.choices[0];
                    tokens = completion.usage || null;

                    // Check if model wants to call tools
                    if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls?.length > 0) {
                        const assistantMsg = choice.message;
                        if (choice.message.reasoning_details) {
                            assistantMsg.reasoning_details = choice.message.reasoning_details;
                        }
                        messages.push(assistantMsg); // Add assistant message with tool_calls

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

