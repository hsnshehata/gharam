const { GoogleGenerativeAI } = require('@google/generative-ai');
const User = require('../models/User');
const Booking = require('../models/Booking');
const InstantService = require('../models/InstantService');
const Expense = require('../models/Expense');
const Advance = require('../models/Advance');
const Deduction = require('../models/Deduction');
const Package = require('../models/Package');
const Service = require('../models/Service');
const ActivityLog = require('../models/ActivityLog');
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
                description: "يجلب قائمة بجميع الموظفين المسجلين في النظام مع النقاط التشغيلية الإجمالية والرواتب. لا يتطلب أي معاملات.",
                parameters: { type: "OBJECT", properties: {}, required: [] }
            },
            {
                name: "query_operations",
                description: "يستعلم عن العمليات المنفذة (حجوزات عرائس + خدمات سريعة) في نطاق تاريخي. يرجع عدد الحجوزات والخدمات مع تفاصيلها.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        startDate: { type: "STRING", description: "تاريخ البداية (YYYY-MM-DD)." },
                        endDate: { type: "STRING", description: "تاريخ النهاية (YYYY-MM-DD)." },
                        employeeName: { type: "STRING", description: "اسم الموظف للفلترة (اختياري)." }
                    },
                    required: ["startDate", "endDate"]
                }
            },
            {
                name: "query_financials_and_expenses",
                description: "يستعلم عن المصروفات والسلف الطارئة والخصومات في نطاق زمني.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        startDate: { type: "STRING", description: "تاريخ البداية (YYYY-MM-DD)." },
                        endDate: { type: "STRING", description: "تاريخ النهاية (YYYY-MM-DD)." },
                        employeeName: { type: "STRING", description: "اسم الموظف (اختياري)." }
                    },
                    required: ["startDate", "endDate"]
                }
            },
            {
                name: "get_financial_report",
                description: "تقرير مالي شامل: إيرادات الحجوزات المكتملة + الخدمات السريعة - المصروفات = صافي الربح.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        startDate: { type: "STRING", description: "تاريخ البداية (YYYY-MM-DD)." },
                        endDate: { type: "STRING", description: "تاريخ النهاية (YYYY-MM-DD)." }
                    },
                    required: ["startDate", "endDate"]
                }
            },
            {
                name: "get_packages_and_services",
                description: "يجلب جميع باقات التجميل والتصوير وخدماتها مع الأسعار وحالة التفعيل. لا يتطلب أي معاملات.",
                parameters: { type: "OBJECT", properties: {}, required: [] }
            },
            {
                name: "search_booking",
                description: "يبحث عن حجز معين برقم الإيصال أو رقم تليفون أو اسم العميلة. يرجع كل بيانات الحجز بالتفصيل.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        query: { type: "STRING", description: "رقم الإيصال أو رقم تليفون أو اسم العميلة." }
                    },
                    required: ["query"]
                }
            },
            {
                name: "get_activity_log",
                description: "يجلب سجل النشاط والعمليات الأخيرة (إنشاء/تعديل/حذف حجوزات وخدمات ومصروفات) مع اسم الموظف المنفذ.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        limit: { type: "NUMBER", description: "عدد السجلات المطلوب (اختياري، الافتراضي 20)." }
                    },
                    required: []
                }
            },
            {
                name: "get_client_details",
                description: "يجلب كل حجوزات عميلة معينة (بالاسم أو الهاتف) مع كل التفاصيل والمبالغ والسجل الكامل.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        query: { type: "STRING", description: "اسم العميلة أو رقم تليفونها." }
                    },
                    required: ["query"]
                }
            }
        ]
    }
];

const createFunctions = (user) => ({
    get_employees_overview: async () => {
        try {
            const usersDB = await User.find({}).select('-password').lean();
            const employees = usersDB.map(u => {
                const totalPoints = Array.isArray(u.points)
                    ? u.points.reduce((sum, p) => sum + (p.amount || 0), 0)
                    : 0;
                const base = { id: u._id, username: u.username, role: u.role, totalPoints };
                if (user.role !== 'supervisor') {
                    base.monthlySalary = u.monthlySalary || 0;
                    base.remainingSalary = u.remainingSalary || 0;
                }
                return base;
            });
            return { employees };
        } catch (err) {
            console.error('[AdminAI] get_employees_overview error:', err.message);
            return { error: "فشل في جلب الموظفين: " + err.message };
        }
    },
    query_operations: async ({ startDate, endDate, employeeName }) => {
        try {
            let start = new Date(startDate); start.setHours(0, 0, 0, 0);
            let end = new Date(endDate); end.setHours(23, 59, 59, 999);

            let empIds = [];
            if (employeeName) {
                const emps = await User.find({ username: { $regex: employeeName, $options: 'i' } }).lean();
                if (emps.length > 0) empIds = emps.map(e => e._id);
                else return { message: `لم يتم العثور على موظف باسم ${employeeName}` };
            }

            // Bookings: field is eventDate, services are in packageServices, executedBy is the employee
            const bQuery = { eventDate: { $gte: start, $lte: end } };
            if (empIds.length > 0) bQuery['packageServices.executedBy'] = { $in: empIds };
            const bookingsDB = await Booking.find(bQuery)
                .populate('packageServices.executedBy', 'username')
                .populate('package', 'name')
                .lean();

            const bookings = bookingsDB.map(b => ({
                receiptNumber: b.receiptNumber,
                client: b.clientName,
                phone: b.clientPhone,
                eventDate: b.eventDate?.toISOString().split('T')[0],
                total: b.total,
                remaining: b.remaining,
                packageName: b.package?.name || 'غير محدد',
                services: (b.packageServices || []).map(s => ({
                    name: s.name,
                    executed: s.executed,
                    executedBy: s.executedBy?.username || null
                }))
            }));

            // InstantServices: field is createdAt, employee is employeeId
            const iQuery = { createdAt: { $gte: start, $lte: end } };
            if (empIds.length > 0) iQuery['employeeId'] = { $in: empIds };
            const instantDB = await InstantService.find(iQuery)
                .populate('employeeId', 'username')
                .lean();

            const instant = instantDB.map(i => ({
                receiptNumber: i.receiptNumber,
                services: (i.services || []).map(s => s.name).join(', '),
                employee: i.employeeId?.username || 'غير محدد',
                date: i.createdAt?.toISOString().split('T')[0],
                total: i.total
            }));

            return {
                bookingsCount: bookings.length,
                instantCount: instant.length,
                bookings,
                instant_services: instant
            };
        } catch (err) {
            console.error('[AdminAI] query_operations error:', err.message);
            return { error: "فشل في جلب العمليات: " + err.message };
        }
    },
    query_financials_and_expenses: async ({ startDate, endDate, employeeName }) => {
        try {
            if (user.role === 'supervisor') {
                if (!isToday(startDate) || !isToday(endDate)) {
                    return { error: "عذراً، بصفتك (مشرف)، لديك صلاحية للاستعلام عن التقارير المالية لليوم الحالي فقط." };
                }
            }

            let start = new Date(startDate); start.setHours(0, 0, 0, 0);
            let end = new Date(endDate); end.setHours(23, 59, 59, 999);

            let empIds = [];
            if (employeeName) {
                const emps = await User.find({ username: { $regex: employeeName, $options: 'i' } }).lean();
                if (emps.length > 0) empIds = emps.map(e => e._id);
                else return { message: `لم يتم العثور على موظف باسم ${employeeName}` };
            }

            // Expenses: field is createdAt, description is details
            let filteredExpenses = [];
            if (empIds.length === 0) {
                const exps = await Expense.find({ createdAt: { $gte: start, $lte: end } }).lean();
                filteredExpenses = exps.map(e => ({
                    details: e.details, amount: e.amount,
                    date: e.createdAt?.toISOString().split('T')[0]
                }));
            }

            // Advances: field is createdAt, no reason field
            const advQuery = { createdAt: { $gte: start, $lte: end } };
            if (empIds.length > 0) advQuery['userId'] = { $in: empIds };
            const advs = await Advance.find(advQuery).populate('userId', 'username').lean();
            const filteredAdvances = advs.map(a => ({
                employee: a.userId?.username || 'غير معروف',
                amount: a.amount,
                date: a.createdAt?.toISOString().split('T')[0]
            }));

            // Deductions: field is createdAt
            const dedQuery = { createdAt: { $gte: start, $lte: end } };
            if (empIds.length > 0) dedQuery['userId'] = { $in: empIds };
            const deds = await Deduction.find(dedQuery).populate('userId', 'username').lean();
            const filteredDeductions = deds.map(d => ({
                employee: d.userId?.username || 'غير معروف',
                amount: d.amount,
                reason: d.reason || '',
                date: d.createdAt?.toISOString().split('T')[0]
            }));

            return { expenses: filteredExpenses, advances: filteredAdvances, deductions: filteredDeductions };
        } catch (err) {
            console.error('[AdminAI] query_financials error:', err.message);
            return { error: "فشل في جلب المصروفات والسلف: " + err.message };
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

            // Bookings revenue: uses eventDate
            const revBookings = await Booking.aggregate([
                { $match: { remaining: { $lte: 0 }, eventDate: { $gte: start, $lte: end } } },
                { $group: { _id: null, total: { $sum: "$total" } } }
            ]);

            // Instant revenue: uses createdAt
            const revInstant = await InstantService.aggregate([
                { $match: { createdAt: { $gte: start, $lte: end } } },
                { $group: { _id: null, total: { $sum: "$total" } } }
            ]);

            // Expenses: uses createdAt
            const expTotal = await Expense.aggregate([
                { $match: { createdAt: { $gte: start, $lte: end } } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]);

            // Advances: uses createdAt
            const advTotal = await Advance.aggregate([
                { $match: { createdAt: { $gte: start, $lte: end } } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]);

            const revB = revBookings[0]?.total || 0;
            const revI = revInstant[0]?.total || 0;
            const expT = expTotal[0]?.total || 0;
            const advT = advTotal[0]?.total || 0;
            const netRevenue = (revB + revI) - expT;

            return {
                summary: `إيرادات حجوزات مكتملة: ${revB} ج | إيرادات خدمات سريعة: ${revI} ج | مصروفات: ${expT} ج | سلف: ${advT} ج | صافي: ${netRevenue} ج`,
                data: { totalRevenue: revB + revI, totalExpenses: expT, totalAdvances: advT, netRevenue }
            };
        } catch (err) {
            console.error('[AdminAI] get_financial_report error:', err.message);
            return { error: "فشل حساب التقرير المالي: " + err.message };
        }
    },
    get_packages_and_services: async () => {
        try {
            const packages = await Package.find({}).lean();
            const services = await Service.find({}).populate('packageId', 'name').lean();
            return {
                packages: packages.map(p => ({
                    name: p.name, price: p.price, type: p.type,
                    isActive: p.isActive, showInPrices: p.showInPrices
                })),
                services: services.map(s => ({
                    name: s.name, price: s.price, type: s.type,
                    packageName: s.packageId?.name || null,
                    isActive: s.isActive, showInPrices: s.showInPrices
                }))
            };
        } catch (err) {
            console.error('[AdminAI] get_packages_and_services error:', err.message);
            return { error: "فشل في جلب الباقات والخدمات: " + err.message };
        }
    },
    search_booking: async ({ query }) => {
        try {
            const searchQuery = {
                $or: [
                    { receiptNumber: query },
                    { clientPhone: { $regex: query, $options: 'i' } },
                    { clientName: { $regex: query, $options: 'i' } }
                ]
            };
            const results = await Booking.find(searchQuery)
                .populate('package', 'name price')
                .populate('packageServices.executedBy', 'username')
                .populate('createdBy', 'username')
                .sort({ createdAt: -1 })
                .limit(10)
                .lean();

            if (results.length === 0) return { message: `لم يتم العثور على حجوزات تطابق "${query}"` };

            return {
                count: results.length,
                bookings: results.map(b => ({
                    receiptNumber: b.receiptNumber,
                    clientName: b.clientName,
                    clientPhone: b.clientPhone,
                    city: b.city,
                    eventDate: b.eventDate?.toISOString().split('T')[0],
                    packageName: b.package?.name || 'غير محدد',
                    total: b.total,
                    deposit: b.deposit,
                    remaining: b.remaining,
                    paymentMethod: b.paymentMethod,
                    installments: (b.installments || []).map(i => ({
                        amount: i.amount, date: i.date?.toISOString().split('T')[0], method: i.paymentMethod
                    })),
                    services: (b.packageServices || []).map(s => ({
                        name: s.name, price: s.price, executed: s.executed,
                        executedBy: s.executedBy?.username || null
                    })),
                    hairStraightening: b.hairStraightening ? { price: b.hairStraighteningPrice, executed: b.hairStraighteningExecuted } : null,
                    hairDye: b.hairDye ? { price: b.hairDyePrice, executed: b.hairDyeExecuted } : null,
                    createdBy: b.createdBy?.username || 'غير معروف',
                    createdAt: b.createdAt?.toISOString().split('T')[0],
                    updates: (b.updates || []).map(u => ({
                        date: u.date?.toISOString().split('T')[0],
                        changes: JSON.stringify(u.changes)
                    }))
                }))
            };
        } catch (err) {
            console.error('[AdminAI] search_booking error:', err.message);
            return { error: "فشل في البحث عن الحجز: " + err.message };
        }
    },
    get_activity_log: async ({ limit } = {}) => {
        try {
            const count = Math.min(limit || 20, 50);
            const logs = await ActivityLog.find({})
                .populate('performedBy', 'username')
                .sort({ createdAt: -1 })
                .limit(count)
                .lean();
            return {
                logs: logs.map(l => ({
                    action: l.action,
                    entityType: l.entityType,
                    details: l.details,
                    amount: l.amount,
                    paymentMethod: l.paymentMethod,
                    performedBy: l.performedBy?.username || 'غير معروف',
                    date: l.createdAt?.toISOString().replace('T', ' ').slice(0, 16)
                }))
            };
        } catch (err) {
            console.error('[AdminAI] get_activity_log error:', err.message);
            return { error: "فشل في جلب سجل النشاط: " + err.message };
        }
    },
    get_client_details: async ({ query }) => {
        try {
            const searchQuery = {
                $or: [
                    { clientPhone: { $regex: query, $options: 'i' } },
                    { clientName: { $regex: query, $options: 'i' } }
                ]
            };
            const bookings = await Booking.find(searchQuery)
                .populate('package', 'name')
                .sort({ eventDate: -1 })
                .lean();

            if (bookings.length === 0) return { message: `لم يتم العثور على عميلة باسم أو رقم "${query}"` };

            const totalSpent = bookings.reduce((s, b) => s + b.total, 0);
            const totalRemaining = bookings.reduce((s, b) => s + b.remaining, 0);

            return {
                clientName: bookings[0].clientName,
                clientPhone: bookings[0].clientPhone,
                totalBookings: bookings.length,
                totalSpent,
                totalRemaining,
                bookings: bookings.map(b => ({
                    receiptNumber: b.receiptNumber,
                    eventDate: b.eventDate?.toISOString().split('T')[0],
                    packageName: b.package?.name || 'غير محدد',
                    total: b.total,
                    remaining: b.remaining,
                    deposit: b.deposit
                }))
            };
        } catch (err) {
            console.error('[AdminAI] get_client_details error:', err.message);
            return { error: "فشل في جلب بيانات العميلة: " + err.message };
        }
    }
});

const processAdminChat = async (messages, user, fileBuffer = null, fileMimeType = null) => {
    const setting = await SystemSetting.findOne({ key: 'admin_ai_system_prompt' });
    let systemPrompt = setting?.value || DEFAULT_ADMIN_PROMPT;

    // Inject current date/time so the AI always knows "today"
    const now = new Date();
    const cairoOffset = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Cairo' }));
    const todayStr = cairoOffset.toISOString().split('T')[0]; // YYYY-MM-DD
    const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const dayName = dayNames[cairoOffset.getDay()];
    const timeStr = cairoOffset.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    systemPrompt += `\n\nمعلومات الوقت الحالي: اليوم هو ${dayName} ${todayStr} والساعة الآن ${timeStr} بتوقيت القاهرة. عندما يسأل المستخدم عن "اليوم" أو "انهاردة"، استخدم التاريخ ${todayStr}. لا تسأل المستخدم أبداً عن التاريخ الحالي.`;

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
