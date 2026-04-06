const { GoogleGenerativeAI } = require('@google/generative-ai');
const User = require('../models/User');
const Booking = require('../models/Booking');
const InstantService = require('../models/InstantService');
const Expense = require('../models/Expense');
const Advance = require('../models/Advance');
const Deduction = require('../models/Deduction');
const SystemSetting = require('../models/SystemSetting');

const DEFAULT_ADMIN_PROMPT = `أنت مساعد ذكي للمديرين والمشرفين في "غرام سلطان بيوتي سنتر".
مهمتك مساعدة الإدارة في الرد على جميع الأسئلة المتعلقة بقواعد البيانات والتقارير المالية والعمليات. 
دائماً اعتمد على الأدوات المتاحة لجلب أحدث البيانات.
وكن احترافياً في عرض الجداول والبيانات.`;

const MODEL_CANDIDATES = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-preview-04-17',
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-pro',
];

const isToday = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    return d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear();
};

const adminTools = [
    {
        functionDeclarations: [
            {
                name: "get_employees_overview",
                description: "يجلب قائمة بجميع الموظفين المسجلين في النظام، بما في ذلك بيانات مهمة مثل: نوع الموظف، والنقاط التشغيلية، والراتب المتبقي (إن كان للمدير صلاحية). لا يتطلب أي معاملات.",
                parameters: {
                    type: "OBJECT",
                    properties: {},
                    required: []
                }
            },
            {
                name: "query_operations",
                description: "يستعلم عن العمليات المنفذة (حجوزات، خدمات سريعة) في نطاق تاريخي معين أو لموظف معين بناءً على اسمه. يُرجع تفاصيل الخدمات التي تم تنفيذها.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        startDate: { type: "STRING", description: "تاريخ البداية (YYYY-MM-DD)." },
                        endDate: { type: "STRING", description: "تاريخ النهاية (YYYY-MM-DD)." },
                        employeeName: { type: "STRING", description: "اسم الموظف ككلمة بحث (اختياري)." }
                    },
                    required: ["startDate", "endDate"]
                }
            },
            {
                name: "query_financials_and_expenses",
                description: "يستعلم عن الحسابات المالية (المصروفات، السلف الطارئة، الخصومات) في نطاق زمني محدد.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        startDate: { type: "STRING", description: "تاريخ البداية (YYYY-MM-DD)." },
                        endDate: { type: "STRING", description: "تاريخ النهاية (YYYY-MM-DD)." },
                        employeeName: { type: "STRING", description: "اسم الموظف أو المستفيد (اختياري)." }
                    },
                    required: ["startDate", "endDate"]
                }
            },
            {
                name: "get_financial_report",
                description: "يقوم بجلب الإيرادات الإجمالية، المصروفات، السلف، وإجمالي الأرباح في نطاق زمني للحصول على تقرير مالي كامل.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        startDate: { type: "STRING", description: "تاريخ البداية (YYYY-MM-DD)." },
                        endDate: { type: "STRING", description: "تاريخ النهاية (YYYY-MM-DD)." }
                    },
                    required: ["startDate", "endDate"]
                }
            }
        ]
    }
];

const createFunctions = (user) => ({
    get_employees_overview: async () => {
        try {
            const usersDB = await User.find({}).lean();
            const employees = usersDB.map(u => {
                if (user.role === 'supervisor') {
                    return { id: u._id, username: u.username, role: u.role, points: u.points || 0, isManager: u.isManager };
                }
                return {
                    id: u._id, username: u.username, role: u.role, isManager: u.isManager,
                    points: u.points || 0, baseSalary: u.baseSalary || 0, remainingSalary: u.remainingSalary || 0
                };
            });
            return { employees };
        } catch (err) {
            return { error: "فشل في جلب الموظفين" };
        }
    },
    query_operations: async ({ startDate, endDate, employeeName }) => {
        try {
            let start = new Date(startDate); start.setHours(0, 0, 0, 0);
            let end = new Date(endDate); end.setHours(23, 59, 59, 999);

            let empIds = [];
            if (employeeName) {
                const emps = await User.find({ username: { $regex: employeeName, $options: 'i' } });
                if (emps.length > 0) empIds = emps.map(e => e._id);
                else return { message: `لم يتم العثور على موظف باسم ${employeeName}` };
            }

            const bQuery = { eventDate: { $gte: start, $lte: end } };
            if (empIds.length > 0) bQuery['executedServices.employee'] = { $in: empIds };
            const bookingsDB = await Booking.find(bQuery).populate('executedServices.employee', 'username').lean();

            const bookings = bookingsDB.map(b => ({
                id: b.receiptNumber, client: b.clientName, date: b.eventDate.toISOString().split('T')[0],
                total: b.total, remaining: b.remaining,
                executed: b.executedServices?.map(ex => ({ serviceName: ex.name, employee: ex.employee?.username || 'غير معروف' }))
            }));

            const iQuery = { date: { $gte: start, $lte: end } };
            if (empIds.length > 0) iQuery['employee'] = { $in: empIds };
            const instantDB = await InstantService.find(iQuery).populate('employee', 'username').lean();

            const instant = instantDB.map(i => ({
                name: i.packageName || i.serviceName, employee: i.employee?.username || 'غير منطبق',
                date: i.date.toISOString().split('T')[0], total: i.total
            }));

            return { bookings, instant_services: instant };
        } catch (err) {
            return { error: "فشل في جلب العمليات" };
        }
    },
    query_financials_and_expenses: async ({ startDate, endDate, employeeName }) => {
        try {
            if (user.role === 'supervisor') {
                if (!isToday(startDate) || !isToday(endDate)) {
                    return { error: "عذراً، بصفتك (مشرف)، لديك صلاحية للاستعلام عن التقارير المالية لليوم الحالي فقط. لا يمكنك جلب بيانات لتاريخ ماضي وتذكر أن ترد على المستخدم بأدب بهذا العذر المحدد." };
                }
            }

            let start = new Date(startDate); start.setHours(0, 0, 0, 0);
            let end = new Date(endDate); end.setHours(23, 59, 59, 999);

            let empIds = [];
            if (employeeName) {
                const emps = await User.find({ username: { $regex: employeeName, $options: 'i' } });
                if (emps.length > 0) empIds = emps.map(e => e._id);
                else return { message: `لم يتم العثور على موظف باسم ${employeeName}` };
            }

            let filteredExpenses = [];
            if (empIds.length === 0) {
                const exps = await Expense.find({ date: { $gte: start, $lte: end } }).lean();
                filteredExpenses = exps.map(e => ({ item: e.item, amount: e.amount, date: e.date.toISOString().split('T')[0] }));
            }

            const advQuery = { date: { $gte: start, $lte: end } };
            if (empIds.length > 0) advQuery['userId'] = { $in: empIds };
            const advs = await Advance.find(advQuery).populate('userId', 'username').lean();
            const filteredAdvances = advs.map(a => ({
                employee: a.userId?.username || 'غير معروف', amount: a.amount, reason: a.reason, date: a.date.toISOString().split('T')[0]
            }));

            const dedQuery = { date: { $gte: start, $lte: end } };
            if (empIds.length > 0) dedQuery['userId'] = { $in: empIds };
            const deds = await Deduction.find(dedQuery).populate('userId', 'username').lean();
            const filteredDeductions = deds.map(d => ({
                employee: d.userId?.username || 'غير معروف', amount: d.amount, reason: d.reason, date: d.date.toISOString().split('T')[0]
            }));

            return { expenses: filteredExpenses, advances: filteredAdvances, deductions: filteredDeductions };
        } catch (err) {
            return { error: "فشل في جلب المصروفات والسلف" };
        }
    },
    get_financial_report: async ({ startDate, endDate }) => {
        try {
            if (user.role === 'supervisor') {
                if (!isToday(startDate) || !isToday(endDate)) {
                    return { error: "عذراً، بصفتك (مشرف)، لديك صلاحية للاستعلام عن التقرير المالي لليوم الحالي فقط." };
                }
            }

            let start = new Date(startDate); start.setHours(0, 0, 0, 0);
            let end = new Date(endDate); end.setHours(23, 59, 59, 999);

            const revBookings = await Booking.aggregate([
                { $match: { remaining: { $lte: 0 }, eventDate: { $gte: start, $lte: end } } },
                { $group: { _id: null, total: { $sum: "$total" } } }
            ]);

            const revInstant = await InstantService.aggregate([
                { $match: { date: { $gte: start, $lte: end } } },
                { $group: { _id: null, total: { $sum: "$total" } } }
            ]);

            const expTotal = await Expense.aggregate([
                { $match: { date: { $gte: start, $lte: end } } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]);

            const advTotal = await Advance.aggregate([
                { $match: { date: { $gte: start, $lte: end } } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]);

            const revB = revBookings[0]?.total || 0;
            const revI = revInstant[0]?.total || 0;
            const expT = expTotal[0]?.total || 0;
            const advT = advTotal[0]?.total || 0;

            const netRevenue = (revB + revI) - expT;

            return {
                summary: `إجمالي الإيرادات من الحجوزات المكتملة: ${revB} ج | إيرادات الخدمات السريعة: ${revI} ج | إجمالي المصروفات: ${expT} ج | إجمالي السلف: ${advT} ج | صافي الربح: ${netRevenue} ج`,
                data: {
                    totalRevenue: revB + revI,
                    totalExpenses: expT,
                    netRevenue: netRevenue
                }
            };
        } catch (err) {
            return { error: "فشل حساب التقرير المالي" };
        }
    }
});

const processAdminChat = async (messages, user, fileBuffer = null, fileMimeType = null) => {
    const setting = await SystemSetting.findOne({ key: 'admin_ai_system_prompt' });
    let systemPrompt = setting?.value || DEFAULT_ADMIN_PROMPT;

    if (user.role === 'supervisor') {
        systemPrompt += `\n\nتنويه هام: المستخدم الحالي هو 'مشرف' وليس مديراً، واسمه "${user.username}". خاطبه باسمه بشكل ودود. يجب عليك إعلامه بلطف أن صلاحياته تمنعه من رؤية تقارير أي يوم آخر سوى اليوم الحالي وأنه غير مصرح له برؤية رواتب أو خصومات زملائه.`;
    } else {
        systemPrompt += `\n\nتنويه: المستخدم الحالي هو مدير النظام واسمه "${user.username}". خاطبه باسمه.`;
    }

    if (!process.env.GEMINI_API_KEY) throw new Error("Missing Gemini API Key");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    let cleanHistory = [];
    let prefixText = "";

    for (const m of messages.slice(0, -1)) {
        const role = m.role === 'user' ? 'user' : 'model';
        if (cleanHistory.length === 0) {
            if (role === 'model') continue;
            prefixText += m.text + "\n\n";
        } else {
            cleanHistory.push({ role, parts: [{ text: m.text }] });
        }
    }

    if (prefixText && cleanHistory.length > 0 && cleanHistory[0].role === 'user') {
        cleanHistory[0].parts[0].text = prefixText + cleanHistory[0].parts[0].text;
    } else if (prefixText && cleanHistory.length === 0) {
        cleanHistory.push({ role: 'user', parts: [{ text: prefixText }] });
    }

    const lastMsgObj = messages[messages.length - 1];
    let userMessageContent = [{ text: lastMsgObj?.text || "مرحباً" }];

    if (fileBuffer && fileMimeType) {
        userMessageContent.push({
            inlineData: {
                data: fileBuffer.toString("base64"),
                mimeType: fileMimeType
            }
        });
    }

    const localFunctions = createFunctions(user);

    let replyText = null;
    let lastError = null;

    for (const modelName of MODEL_CANDIDATES) {
        try {
            let modelFeatures = {
                model: modelName,
                systemInstruction: systemPrompt,
                tools: adminTools
            };

            const model = genAI.getGenerativeModel(modelFeatures); // remove { apiVersion: "v1beta" } since new versions might not need it, or we rely on SDK default
            const chat = model.startChat({ history: cleanHistory });

            let result = await chat.sendMessage(userMessageContent);
            let response = result.response;
            let callCount = 0;

            while (response.functionCalls()?.length && callCount < 5) {
                const functionCalls = response.functionCalls();
                const functionResponses = [];

                for (const call of functionCalls) {
                    const funcName = call.name;
                    const args = call.args;
                    if (localFunctions[funcName]) {
                        const apiResponse = await localFunctions[funcName](args);
                        functionResponses.push({
                            functionResponse: {
                                name: funcName,
                                response: apiResponse
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

            replyText = response.text();
            break; // Success!

        } catch (err) {
            console.warn(`[AdminAI] Model ${modelName} failed. Reason: ${err.message}. Trying next model...`);
            lastError = err;
        }
    }

    if (!replyText) {
        console.error('[AdminAI] All models failed in fallback chain.', lastError);
        throw new Error(lastError ? lastError.message : 'جميع نماذج الذكاء الاصطناعي غير متاحة حالياً.');
    }

    return replyText;
};

const generateChatTitle = async (firstMessage) => {
    try {
        if (!process.env.GEMINI_API_KEY) return "محادثة جديدة";
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        let result = null;
        
        for (const modelName of MODEL_CANDIDATES) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const prompt = `أنت مساعد يقوم بتوليد عناوين للمحادثات.
اكتب عنوان قصير جداً (3 كلمات كحد أقصى) يعبر عن محتوى هذه الرسالة من مدير نظام. لا تضع نقطة في النهاية ولا تضف أي عبارات أخرى.
الرسالة: "${firstMessage}"`;
                result = await model.generateContent(prompt);
                break;
            } catch(e) {
                // Try next
            }
        }
        
        if (result) return result.response.text().trim().replace(/['"]+/g, '');
        return "محادثة جديدة";
    } catch (err) {
        return "محادثة جديدة";
    }
};

module.exports = {
    processAdminChat,
    generateChatTitle,
    DEFAULT_ADMIN_PROMPT
};
