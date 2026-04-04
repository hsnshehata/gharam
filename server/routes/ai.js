const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const SystemSetting = require('../models/SystemSetting');
const Package = require('../models/Package');
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const multer = require('multer');
const googleTTS = require('google-tts-api');

// Configure multer for voice messages
const upload = multer({ storage: multer.memoryStorage() });

const MAX_BOOKINGS_PER_DAY = 12;

const DEFAULT_PROMPT = `أنت مساعد ذكي ولطيف لصالون تجميل (غرام سلطان بيوتي سنتر).
عليك الإجابة عن استفسارات العملاء بأدب وبطريقة احترافية بناءً على المعلومات المتاحة لك وبدون تأليف.`;

// Model names to try in order (first available wins)
const MODEL_CANDIDATES = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-preview-04-17',
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-pro',
];

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

// Tool definitions for Gemini
const tools = [
    {
        functionDeclarations: [
            {
                name: "get_booking_count_by_date",
                description: "Returns the number of existing bookings for a specific date (YYYY-MM-DD). Use this to check if a day is full or available.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        date: { type: "STRING", description: "The date in YYYY-MM-DD format." }
                    },
                    required: ["date"]
                }
            },
            {
                name: "search_booking_by_query",
                description: "Searches for a specific booking using a receipt number or client phone number. Returns details like name, date, total, and remaining balance.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        query: { type: "STRING", description: "The receipt number or phone number to search for." }
                    },
                    required: ["query"]
                }
            }
        ]
    }
];

// Implementation of functions called by Gemini
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

// Helper: Handle Tool Calls
async function handleToolCalls(model, chat, responseText) {
    const result = await chat.sendMessage(responseText);
    return result;
}

// POST /api/ai/chat
router.post('/chat', upload.single('audio'), async (req, res) => {
    try {
        let { messages } = req.body;
        // If coming from FormData, messages might be a JSON string
        if (typeof messages === 'string') {
            try { messages = JSON.parse(messages); } catch (e) { }
        }

        if (!messages || !messages.length) return res.status(400).json({ message: 'Missing messages' });

        const setting = await SystemSetting.findOne({ key: 'ai_system_prompt' });
        let systemPromptArr = [setting?.value || DEFAULT_PROMPT];

        // Enrich system prompt with live packages/services from DB
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
            return res.status(500).json({ message: 'Gemini API key not configured on server' });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        // Robust history cleaning for Gemini (alternating roles, start with user, end with model)
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

        // If history ends with a user message, we must move it to the current message
        // because Gemini expects history to end with 'model' when a new 'user' message is sent.
        if (cleanHistory.length > 0 && cleanHistory[cleanHistory.length - 1].role === 'user') {
            prefixText = cleanHistory.pop().parts[0].text + "\n";
        }

        // Prepare current request parts (Text + Audio if exists)
        const lastMessageObj = messages[messages.length - 1];
        const lastMessageText = prefixText + (lastMessageObj.text || "");
        const userMessageParts = [];
        
        if (lastMessageText.trim()) {
            userMessageParts.push({ text: lastMessageText });
        }

        if (req.file) {
            userMessageParts.push({
                inlineData: {
                    data: req.file.buffer.toString('base64'),
                    mimeType: req.file.mimetype
                }
            });
        }
        
        // If nothing to send, error out
        if (userMessageParts.length === 0) return res.status(400).json({ message: 'Empty message' });

        let reply = null;
        let lastError = null;

        for (const modelName of MODEL_CANDIDATES) {
            try {
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    tools: tools, // Register tools here
                    systemInstruction: finalSystemPrompt
                });

                // Use chat history for stateful conversation with tools
                const chat = model.startChat({ history: cleanHistory });
                
                let result = await chat.sendMessage(userMessageParts);
                let response = result.response;
                
                // Handle tools calls
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
                if (modelErr.status && modelErr.status !== 404) break;
            }
        }

        if (reply === null) {
            console.error('Gemini error (all models failed):', lastError);
            return res.status(500).json({ message: 'خطأ في التواصل مع الذكاء الاصطناعي' });
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
        console.error('Gemini error:', err);
        res.status(500).json({ message: 'خطأ في التواصل مع الذكاء الاصطناعي' });
    }
});

module.exports = router;
