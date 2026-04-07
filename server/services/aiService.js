const { GoogleGenerativeAI } = require('@google/generative-ai');
const SystemSetting = require('../models/SystemSetting');
const Package = require('../models/Package');
const Service = require('../models/Service');
const Booking = require('../models/Booking');

const MAX_BOOKINGS_PER_DAY = 12;

const DEFAULT_PROMPT = `أنت مساعد ذكي ولطيف لصالون تجميل (غرام سلطان بيوتي سنتر).
عليك الإجابة عن استفسارات العملاء بأدب وبطريقة احترافية بناءً على المعلومات المتاحة لك وبدون تأليف.`;

const MODEL_CANDIDATES = [
    'gemini-3-flash-preview',
    'gemini-3.1-flash-lite-preview',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.5-flash-lite',
    'gemini-3.1-pro-preview'
];

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
 * Process a chat request via Gemini
 * @param {Array} messages - Array of { role: 'user'|'model', text: '...' }
 * @param {Buffer} fileBuffer - Optional file buffer
 * @param {String} fileMimeType - Optional file mime type
 * @param {Boolean} formatForMessenger - If true, restricts markdown asterisks and limits length slightly.
 * @returns {Promise<String>} The generated response text
 */
const processAiChat = async (messages, fileBuffer = null, fileMimeType = null, formatForMessenger = false) => {
    const setting = await SystemSetting.findOne({ key: 'ai_system_prompt' });
    let systemPromptArr = [setting?.value || DEFAULT_PROMPT];

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

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

    for (const modelName of MODEL_CANDIDATES) {
        try {
            const model = genAI.getGenerativeModel({
                model: modelName,
                tools: tools,
                systemInstruction: finalSystemPrompt
            });

            const chat = model.startChat({ history: cleanHistory });
            let result = await chat.sendMessage(userMessageParts);
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
                    result = await chat.sendMessage(functionResponses);
                    response = result.response;
                }
                callCount++;
            }

            reply = response.text();
            console.log(`[AI] Success with model: ${modelName}`);
            break;
        } catch (modelErr) {
            lastError = modelErr;
            console.log(`[AI] Model ${modelName} failed: ${modelErr.message?.slice(0, 100)}`);
            if (modelErr.status === 400 || modelErr.status === 403) break; // Break for auth or bad request

        }
    }

    if (reply === null) {
        throw lastError || new Error('خطأ في التواصل مع الذكاء الاصطناعي');
    }

    return reply;
};

module.exports = {
    processAiChat,
    DEFAULT_PROMPT
};
