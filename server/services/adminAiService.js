const { GoogleGenerativeAI } = require('@google/generative-ai');
const store = require('./dataStore');
const SystemSetting = require('../models/SystemSetting');

const DEFAULT_ADMIN_PROMPT = `أنت مساعد ذكي للمديرين والمشرفين في "غرام سلطان بيوتي سنتر".
مهمتك مساعدة الإدارة في الرد على جميع الأسئلة المتعلقة بقواعد البيانات والتقارير المالية والعمليات. 
دائماً اعتمد على الأدوات المتاحة لجلب أحدث البيانات.
وكن احترافياً في عرض الجداول والبيانات.`;

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
            const employees = store.users.map(u => {
                const isSupervisor = user.role === 'supervisor';
                if (isSupervisor) {
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
            let start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            let end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            let empId = null;
            if (employeeName) {
                const emp = store.users.find(u => u.username.includes(employeeName));
                if (emp) empId = emp._id.toString();
                else return { message: `لم يتم العثور على موظف باسم ${employeeName}` };
            }

            const bookings = store.bookings.filter(b => {
                const bd = new Date(b.eventDate);
                let match = bd >= start && bd <= end;
                if (match && empId) {
                    match = b.executedServices?.some(s => s.employee?.toString() === empId);
                }
                return match;
            }).map(b => ({
                id: b.receiptNumber, client: b.clientName, date: b.eventDate.toISOString().split('T')[0],
                total: b.total, remaining: b.remaining,
                executed: b.executedServices?.map(ex => {
                    const eName = store.users.find(u => u._id.toString() === ex.employee?.toString())?.username || 'غير معروف';
                    return { serviceName: ex.name, employee: eName };
                })
            }));

            const instant = store.instantServices.filter(i => {
                const idt = new Date(i.date);
                let match = idt >= start && idt <= end;
                if (match && empId) match = i.employee?._id?.toString() === empId || i.employee?.toString() === empId;
                return match;
            }).map(i => {
                let eName = 'غير منطبق';
                if (i.employee) {
                    const eId = i.employee._id || i.employee;
                    eName = store.users.find(u => u._id.toString() === eId?.toString())?.username || 'غير معروف';
                }
                return { name: i.packageName || i.serviceName, employee: eName, date: i.date.toISOString().split('T')[0], total: i.total };
            });

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

            let empId = null;
            if (employeeName) {
                const emp = store.users.find(u => u.username.includes(employeeName));
                if (emp) empId = emp._id.toString();
            }

            let filteredExpenses = store.expenses.filter(e => {
                const d = new Date(e.date);
                return d >= start && d <= end;
            }).map(e => ({ item: e.item, amount: e.amount, date: e.date.toISOString().split('T')[0] }));

            let filteredAdvances = store.advances.filter(a => {
                const d = new Date(a.date);
                let match = d >= start && d <= end;
                if (match && empId) match = a.userId?._id?.toString() === empId || a.userId?.toString() === empId;
                return match;
            }).map(a => {
                const uid = a.userId?._id || a.userId;
                const eName = store.users.find(u => u._id.toString() === uid?.toString())?.username || 'غير معروف';
                return { employee: eName, amount: a.amount, reason: a.reason, date: a.date.toISOString().split('T')[0] };
            });

            let filteredDeductions = store.deductions.filter(d => {
                const dt = new Date(d.date);
                let match = dt >= start && dt <= end;
                if (match && empId) match = d.userId?._id?.toString() === empId || d.userId?.toString() === empId;
                return match;
            }).map(d => {
                const uid = d.userId?._id || d.userId;
                const eName = store.users.find(u => u._id.toString() === uid?.toString())?.username || 'غير معروف';
                return { employee: eName, amount: d.amount, reason: d.reason, date: d.date.toISOString().split('T')[0] };
            });

            if (employeeName && empId) {
                filteredExpenses = [];
            }

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

            const revBookings = store.bookings
                .filter(b => b.remaining <= 0 && new Date(b.eventDate) >= start && new Date(b.eventDate) <= end)
                .reduce((a, b) => a + b.total, 0);

            const revInstant = store.instantServices
                .filter(i => new Date(i.date) >= start && new Date(i.date) <= end)
                .reduce((a, b) => a + b.total, 0);

            const expTotal = store.expenses
                .filter(e => new Date(e.date) >= start && new Date(e.date) <= end)
                .reduce((a, b) => a + b.amount, 0);

            const advTotal = store.advances
                .filter(e => new Date(e.date) >= start && new Date(e.date) <= end)
                .reduce((a, b) => a + b.amount, 0);

            const netRevenue = (revBookings + revInstant) - expTotal;

            return {
                summary: `إجمالي الإيرادات من الحجوزات المكتملة: ${revBookings} ج | إيرادات الخدمات السريعة: ${revInstant} ج | إجمالي المصروفات: ${expTotal} ج | إجمالي السلف: ${advTotal} ج | صافي الربح: ${netRevenue} ج`,
                data: {
                    totalRevenue: revBookings + revInstant,
                    totalExpenses: expTotal,
                    netRevenue: netRevenue
                }
            };
        } catch (err) {
            return { error: "فشل حساب التقرير المالي" };
        }
    }
});

const processAdminChat = async (messages, user) => {
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

    let modelFeatures = {
        model: 'gemini-1.5-flash',
        systemInstruction: systemPrompt,
        tools: adminTools
    };

    const model = genAI.getGenerativeModel(modelFeatures, { apiVersion: "v1beta" });
    const chat = model.startChat({ history: cleanHistory });
    const localFunctions = createFunctions(user);

    let result = await chat.sendMessage(userMessageContent);
    let calls = result.response.functionCalls();

    if (calls && calls.length > 0) {
        for (const call of calls) {
            const funcName = call.name;
            const args = call.args;
            if (localFunctions[funcName]) {
                const apiResponse = await localFunctions[funcName](args);
                result = await chat.sendMessage([{
                    functionResponse: {
                        name: funcName,
                        response: apiResponse
                    }
                }]);
            }
        }
        calls = result.response.functionCalls();
    }

    return result.response.text();
};

const generateChatTitle = async (firstMessage) => {
    try {
        if (!process.env.GEMINI_API_KEY) return "محادثة جديدة";
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" }); // Or any small model
        const prompt = `أنت مساعد يقوم بتوليد عناوين للمحادثات.
اكتب عنوان قصير جداً (3 كلمات كحد أقصى) يعبر عن محتوى هذه الرسالة من مدير نظام. لا تضع نقطة في النهاية ولا تضف أي عبارات أخرى.
الرسالة: "${firstMessage}"`;
        const result = await model.generateContent(prompt);
        return result.response.text().trim().replace(/['"]+/g, '');
    } catch (err) {
        return "محادثة جديدة";
    }
};

module.exports = {
    processAdminChat,
    generateChatTitle,
    DEFAULT_ADMIN_PROMPT
};
