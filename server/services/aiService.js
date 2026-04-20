const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const SystemSetting = require('../models/SystemSetting');
const Package = require('../models/Package');
const Service = require('../models/Service');
const Booking = require('../models/Booking');

const MAX_BOOKINGS_PER_DAY = 12;

const DEFAULT_PROMPT = `أنت مساعد ذكي ولطيف لصالون تجميل (غرام سلطان بيوتي سنتر).
عليك الإجابة عن استفسارات العملاء بأدب وبطريقة احترافية بناءً على المعلومات المتاحة لك وبدون تأليف.`;

// Ordered model fallback chain:
// Phase 1: Gemini models (each tried with primary + backup API keys)
// Phase 2: OpenAI models (tried sequentially as multi-model fallback)
const GEMINI_MODEL_CHAIN = [
    'gemini-3-flash-preview',
    'gemini-2.5-flash',
    'gemini-3.1-flash-lite-preview'
];

// Default OpenAI fallback chain — tried in order if all Gemini fail
const OPENAI_MODEL_CHAIN = [
    'gpt-4o-mini',
    'gpt-4.1-nano',
    'gpt-5-nano'
];

// Timeout wrapper: rejects if the promise doesn't resolve within `ms` milliseconds
const withTimeout = (promise, ms) => {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timeout: exceeded ${ms}ms`)), ms);
        promise.then(
            (val) => { clearTimeout(timer); resolve(val); },
            (err) => { clearTimeout(timer); reject(err); }
        );
    });
};

const GEMINI_TIMEOUT_MS = 10000; // 10 seconds per Gemini attempt

const tools = [
    {
        functionDeclarations: [
            {
                name: "get_booking_count_by_date",
                description: "Returns the number of existing bookings for a specific date (YYYY-MM-DD). Use this to check if a day is full or available.",
                parameters: {
                    type: "OBJECT",
                    properties: { date: { type: "STRING", description: "The date in YYYY-MM-DD format." } },
                    required: ["date"]
                }
            },
            {
                name: "search_booking_by_query",
                description: "Searches for a specific booking using a receipt number or client phone number. Returns details like name, date, total, and remaining balance.",
                parameters: {
                    type: "OBJECT",
                    properties: { query: { type: "STRING", description: "The receipt number or phone number to search for." } },
                    required: ["query"]
                }
            }
        ]
    }
];

const chatFunctions = {
    get_booking_count_by_date: async ({ date }) => {
        try {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            const count = await Booking.countDocuments({ eventDate: { $gte: startOfDay, $lte: endOfDay } });
            const isFull = count >= MAX_BOOKINGS_PER_DAY;
            return {
                dateRequested: date,
                isFull: isFull,
                statusEn: isFull ? "Full/Completed" : "Available",
                statusAr: isFull ? "اليوم مكتمل العدد" : "اليوم متاح للحجز",
                importantInstructionForAI: "DO NOT MENTION ANY NUMBERS. DO NOT declare how many bookings are available or taken. If it is available, just say the day is available. If full, apologize and say the day is fully booked."
            };
        } catch (err) {
            return { error: "Failed to fetch bookings count" };
        }
    },
    search_booking_by_query: async ({ query }) => {
        try {
            const booking = await Booking.findOne({
                $or: [{ receiptNumber: query }, { clientPhone: query }]
            }).populate('package');

            if (!booking) return { message: "لم يتم العثور على حجز بهذا الرقم (وصل أو تليفون)" };

            return {
                clientName: booking.clientName,
                eventDate: booking.eventDate.toISOString().split('T')[0],
                packageName: booking.package?.name || "N/A",
                total: booking.total,
                remaining: booking.remaining,
                receiptNumber: booking.receiptNumber,
                status: booking.remaining <= 0 ? "مدفوع بالكامل" : "يوجد متبقي"
            };
        } catch (err) {
            return { error: "Failed to search booking" };
        }
    }
};

/**
 * Process a chat request via Gemini (with OpenAI fallback)
 * @param {Array} messages - Array of { role: 'user'|'model', text: '...' }
 * @param {Buffer} fileBuffer - Optional file buffer
 * @param {String} fileMimeType - Optional file mime type
 * @param {Boolean} formatForMessenger - If true, restricts markdown asterisks and limits length slightly.
 * @returns {Promise<String>} The generated response text
 */
const processAiChat = async (messages, fileBuffer = null, fileMimeType = null, formatForMessenger = false, additionalPrompt = null) => {
    const setting = await SystemSetting.findOne({ key: 'ai_system_prompt' });
    let systemPromptArr = [setting?.value || DEFAULT_PROMPT];

    if (additionalPrompt) {
        systemPromptArr.push(`\n[=== توجيه إضافي متزامن من تطبيق خارجي ===]\n${additionalPrompt}\n[=========================================]\n`);
    }

    const currentDate = new Date();
    const dayName = currentDate.toLocaleDateString('ar-EG', { weekday: 'long' });
    const formattedDate = currentDate.toISOString().split('T')[0];
    const formattedTime = currentDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });

    systemPromptArr.push(`معلومات هامة لك كذكاء اصطناعي لصالون التجميل:
- اليوم هو: ${dayName} الموافق ${formattedDate}
- الوقت الحالي: ${formattedTime}
- هام جداً بخصوص التواريخ: إذا سأل العميل عن تاريخ أو طلب حجزاً بتاريخ ولا يتضمن السنة (مثال 15 مارس أو 15/3)، افترض دائماً أنه يقصد العام الحالي ${currentDate.getFullYear()}. ولكن إذا كان هذا التاريخ قد مضى بالفعل بالنسبة لتاريخ اليوم، فافترض فوراً وبشكل مؤكد أنه يقصد نفس التاريخ ولكن في العام القادم ${currentDate.getFullYear() + 1}.
- عندما تقوم باستخدام أي أداة تتطلب تاريخ (YYYY-MM-DD)، يجب عليك تطبيق هذه القاعدة وإرسال التاريخ كاملاً بالصيغة الصحيحة.`);

    // Force strict URL formatting so the frontend can parse buttons consistently across all pages
    systemPromptArr.push(`IMPORTANT URL RULE:
When sharing links to the website pages (like prices, gallery, massage), YOU MUST provide the full absolute URL starting with https://. 
Example: https://gharam.art/prices. DO NOT use markdown format like [text](url). Just write the raw https:// URL.`);

    if (formatForMessenger) {
        systemPromptArr.push(`IMPORTANT FOR FACEBOOK MESSENGER: 
DO NOT use Markdown formatting like **bold** or *italic*. Return plain text only with standard paragraph breaks.
Keep your answers relatively concise, as users read this on a messenger app.`);
    }

    try {
        const activePackages = await Package.find({ isActive: true, showInPrices: true });
        const activeServices = await Service.find({ isActive: true, showInPrices: true });

        if (activePackages.length || activeServices.length) {
            let context = "\n\nإليكِ أحدث قائمة بالخدمات والأسعار المتاحة لدينا للتأكد من دقة المعلومات:\n";
            if (activePackages.length) {
                context += "الباكدجات:\n";
                activePackages.forEach(p => {
                    context += `- ${p.name}: ${p.price} ج (${p.type === 'makeup' ? 'ميك أب' : 'تصوير'})\n`;
                });
            }
            if (activeServices.length) {
                context += "الخدمات الفردية:\n";
                activeServices.forEach(s => {
                    context += `- ${s.name}: ${s.price} ج\n`;
                });
            }
            systemPromptArr.push(context);
        }
    } catch (dbErr) {
        console.error('Error fetching dynamic AI context:', dbErr);
    }

    const finalSystemPrompt = systemPromptArr.join('\n');

    if (!process.env.GEMINI_API_KEY) {
        throw new Error('Gemini API key not configured on server');
    }

    // Build Google API keys list: primary + optional backup
    const apiKeys = [process.env.GEMINI_API_KEY];
    if (process.env.GEMINI_API_KEY_2) apiKeys.push(process.env.GEMINI_API_KEY_2);

    // === Build Gemini-compatible history ===
    let cleanHistory = [];
    let prefixText = "";

    for (const m of messages.slice(0, -1)) {
        const role = m.role === 'user' ? 'user' : 'model';
        if (cleanHistory.length === 0) {
            if (role === 'user') {
                cleanHistory.push({ role, parts: [{ text: m.text }] });
            }
        } else {
            const last = cleanHistory[cleanHistory.length - 1];
            if (last.role === role) {
                last.parts[0].text += "\n" + m.text;
            } else {
                cleanHistory.push({ role, parts: [{ text: m.text }] });
            }
        }
    }

    if (cleanHistory.length > 0 && cleanHistory[cleanHistory.length - 1].role === 'user') {
        prefixText = cleanHistory.pop().parts[0].text + "\n";
    }

    const lastMessageObj = messages[messages.length - 1];
    const lastMessageText = prefixText + (lastMessageObj.text || "");
    const userMessageParts = [];

    if (lastMessageText.trim()) {
        userMessageParts.push({ text: lastMessageText });
    }

    if (fileBuffer && fileMimeType) {
        userMessageParts.push({
            inlineData: {
                data: fileBuffer.toString('base64'),
                mimeType: fileMimeType
            }
        });
    }

    if (userMessageParts.length === 0) throw new Error('Empty message');

    let reply = null;
    let lastError = null;

    // Load dynamic model chain from DB, fallback to defaults
    let activeModelChain = [...GEMINI_MODEL_CHAIN];
    let openaiModelChain = [...OPENAI_MODEL_CHAIN];
    try {
        const chainSetting = await SystemSetting.findOne({ key: 'ai_model_chain' });
        const disabledSetting = await SystemSetting.findOne({ key: 'ai_disabled_models' });
        if (chainSetting) {
            const savedChain = JSON.parse(chainSetting.value);
            const disabledModels = disabledSetting ? JSON.parse(disabledSetting.value) : [];
            // Filter out disabled models
            const filteredChain = savedChain.filter(m => !disabledModels.includes(m));
            // Split into Gemini and OpenAI
            // OpenAI models start with gpt-, o1-, o3-, o4-, or codex-
            const isOpenAIModel = (m) => /^(gpt-|o[0-9]+-|codex-)/.test(m);
            activeModelChain = filteredChain.filter(m => !isOpenAIModel(m));
            openaiModelChain = filteredChain.filter(m => isOpenAIModel(m));
        }
    } catch (dbErr) {
        console.error('[AI] Error loading model chain from DB:', dbErr.message);
    }

    // ======================================================
    // PHASE 1: Try Gemini models (with 10s timeout per attempt)
    // Order: model1 → key1, key2 → model2 → key1, key2
    // ======================================================
    for (const modelName of activeModelChain) {
        for (let keyIdx = 0; keyIdx < apiKeys.length; keyIdx++) {
            const currentKey = apiKeys[keyIdx];
            const keyLabel = keyIdx === 0 ? 'Primary' : 'Backup';
            const genAI = new GoogleGenerativeAI(currentKey);

            try {
                console.log(`[AI] 🔄 Trying Gemini model: ${modelName} (${keyLabel} key)...`);

                const model = genAI.getGenerativeModel({
                    model: modelName,
                    tools: tools,
                    systemInstruction: finalSystemPrompt
                });

                const chat = model.startChat({ history: cleanHistory });
                let result = await withTimeout(chat.sendMessage(userMessageParts), GEMINI_TIMEOUT_MS);
                let response = result.response;

                let callCount = 0;
                while (response.functionCalls()?.length && callCount < 5) {
                    const functionCalls = response.functionCalls();
                    const functionResponses = [];

                    for (const call of functionCalls) {
                        const functionName = call.name;
                        const args = call.args;
                        if (chatFunctions[functionName]) {
                            const data = await chatFunctions[functionName](args);
                            functionResponses.push({
                                functionResponse: {
                                    name: functionName,
                                    response: { content: data }
                                }
                            });
                        }
                    }

                    if (functionResponses.length > 0) {
                        result = await withTimeout(chat.sendMessage(functionResponses), GEMINI_TIMEOUT_MS);
                        response = result.response;
                    }
                    callCount++;
                }

                reply = response.text();
                if (reply) {
                    console.log(`[AI] ✅ Success with Gemini model: ${modelName} (${keyLabel} key)`);
                    break;
                }
            } catch (modelErr) {
                lastError = modelErr;
                console.log(`[AI] ❌ Gemini ${modelName} failed (${keyLabel} key): ${modelErr.message?.slice(0, 120)}`);
                if (modelErr.status === 400 || modelErr.status === 403) break;
            }
        }

        if (reply !== null) break;
    }

    // ======================================================
    // PHASE 2: OpenAI Multi-Model Fallback if all Gemini failed
    // Tries each OpenAI model in the chain sequentially
    // ======================================================
    if (reply === null && openaiModelChain.length > 0 && process.env.OPENAI_API_KEY) {
        console.log(`[AI] 🔄 All Gemini models failed. Trying OpenAI chain: [${openaiModelChain.join(', ')}]...`);

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        // Build OpenAI-format messages once (shared across attempts)
        const openaiMessages = [
            { role: 'system', content: finalSystemPrompt }
        ];
        for (const h of cleanHistory) {
            openaiMessages.push({
                role: h.role === 'model' ? 'assistant' : 'user',
                content: h.parts[0].text
            });
        }
        openaiMessages.push({ role: 'user', content: lastMessageText });

        for (const oaiModel of openaiModelChain) {
            try {
                console.log(`[AI] 🔄 Trying OpenAI model: ${oaiModel}...`);

                const completionParams = {
                    model: oaiModel,
                    messages: openaiMessages
                };

                // Configure per-model params
                // Reasoning models (o1/o3/o4)
                if (oaiModel.startsWith('o1-') || oaiModel.startsWith('o3-') || oaiModel.startsWith('o4-')) {
                    completionParams.reasoning_effort = 'low';
                    completionParams.max_completion_tokens = 4096;
                }
                // Newer models (gpt-5*, gpt-4.1*, codex-*) require max_completion_tokens
                else if (/^(gpt-5|gpt-4\.1|codex-)/.test(oaiModel)) {
                    completionParams.max_completion_tokens = 1200;
                }
                // Legacy models (gpt-4o-mini etc.) use max_tokens
                else {
                    completionParams.max_tokens = 1200;
                }

                const completion = await withTimeout(
                    openai.chat.completions.create(completionParams),
                    15000
                );

                reply = completion.choices[0]?.message?.content;

                if (reply) {
                    console.log(`[AI] ✅ Success with OpenAI ${oaiModel}`);
                    break;
                }
            } catch (openaiErr) {
                lastError = openaiErr;
                console.log(`[AI] ❌ OpenAI ${oaiModel} failed: ${openaiErr.message?.slice(0, 120)}`);
                // 400/403 = model-level reject, skip remaining
                if (openaiErr.status === 400 || openaiErr.status === 403) continue;
            }
        }
    }

    if (reply === null) {
        throw lastError || new Error('خطأ في التواصل مع الذكاء الاصطناعي');
    }

    return reply;
};

module.exports = {
    processAiChat,
    DEFAULT_PROMPT,
    publicTools: tools,
    publicChatFunctions: chatFunctions
};
