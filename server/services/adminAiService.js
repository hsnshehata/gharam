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
const AdminConversation = require('../models/AdminConversation');

const DEFAULT_ADMIN_PROMPT = `أنت مساعد ذكي للمديرين والمشرفين في "غرام سلطان بيوتي سنتر".
مهمتك مساعدة الإدارة في الرد على جميع الأسئلة المتعلقة بقواعد البيانات والتقارير المالية والعمليات بدقة. 
دائماً اعتمد على الأدوات المتاحة لجلب أحدث البيانات، ولا تخمن أبداً.
تعليمات هامة جداً:
1. اقرأ التوجيه من المستخدم بتأني ومراجعة. الطلبات قد تحتوي على مهام مركبة تتطلب دمج معلومات مختلفة (مثلاً: بحث عن حجز + جلب سجل تعديلاته).
2. لديك القدرة على استدعاء الأداة المناسبة، وإذا اكتشفت نقص في المعلومات، قم باستدعاء أداة أخرى أو نفس الأداة مدخلات مختلفة قبل بناء الرد النهائي للمستخدم (Multi-step Tool Usage).
3. استعرض ما حصلت عليه من الأدوات، وحلله جيداً للتأكد من أنه يشمل إجابة كاملة للمستخدم، ثم صغ إجابتك.
4. كن احترافياً، استعمل جداول ملخصة (Markdown Tables) وقوائم لتسهيل القراءة على الإدارة.
5. يمكنك بناء تطبيقات مصغرة وتقارير مخصصة (واجهات) وحفظها للعميل باستخدام أداة build_afrakoush_page. وعندما تقوم بذلك، أخبر العميل بالرابط، فإذا كان عام سيكون /p/afrakoush/{name} وإذا كان إداري سيكون /admin/afrakoush/{name}.
6. عند كتابة كود JavaScript للأدوات الديناميكية (script)، يجب أن تستخدم فقط المسارات الحقيقية الموجودة في النظام. إليك الدليل الكامل لـ APIs المتاحة للاستخدام في الـ script:

=== دليل APIs النظام (بنية البيانات الحقيقية - اقرأها بدقة) ===

** التقارير - الأهم لاستخراج الإيرادات والإحصائيات **
- GET /api/reports/monthly?month=YYYY-MM
  الرد: {
    summary: { totalDeposit (إيرادات الحجوزات), totalInstantServices (إيرادات الفوري), totalExpenses, totalAdvances, net (الصافي) },
    analytics: {
      revenueStreams: [{ label, value }],
      topPackages: [{ name, count, amount }],
      topServices: [{ name, count, amount }],
      topEarners: [{ username, role, points }]  ← هذا هو أداء الموظفين بالنقاط!
    }
  }
- GET /api/reports/daily?date=YYYY-MM-DD → نفس البنية ليوم واحد
- GET /api/reports/range?from=YYYY-MM-DD&to=YYYY-MM-DD → نفس البنية لفترة

** الحجوزات - بنية حقيقية مهمة **
- GET /api/bookings?page=1&limit=15
  الرد: { bookings: [ { 
    clientName (اسم العميلة),
    eventDate (تاريخ المناسبة - Date),
    createdAt (تاريخ التسجيل - Date),
    deposit (المبلغ المدفوع),
    total (الإجمالي),
    remaining (المتبقي),
    receiptNumber (رقم الوصل),
    package: { name (اسم الباكدج), price } ← كائن بعد populate,
    packageServices: [{ name (اسم الخدمة), price, executed }] ← مصفوفة كائنات,
    createdBy: { username } ← كائن بعد populate
  }], total, pages }
  ⚠️ تحذير: packageServices هي مصفوفة كائنات وليست نصوص! لا تعرضها مباشرة.
  ✅ لعرضها: booking.packageServices.map(s => s.name).join(', ')
  ✅ لعرض اسم الباكدج: booking.package?.name
  ✅ لعرض منشئ الحجز: booking.createdBy?.username

** الخدمات الفورية - بنية حقيقية **
- GET /api/instant-services?page=1&limit=15
  الرد: { instantServices: [{
    clientName (اسم العميلة),
    createdAt (التاريخ),
    total (الإجمالي),
    receiptNumber,
    services: [{ name (اسم الخدمة), price, isCustom }] ← مصفوفة كائنات,
    employeeId: { username } ← كائن بعد populate (قد يكون null)
  }], total }
  ✅ لعرض الخدمات: svc.services.map(s => s.name).join(' + ')
  ✅ لعرض الموظف: service.employeeId?.username || 'غير محدد'

** الموظفين وأداؤهم **
- GET /api/users → [{ _id, username, role }]
- لجلب أداء الموظفين (النجوم): استخدم /api/reports/range أو /api/reports/monthly
  ثم data.analytics.topEarners ← هذا هو الترتيب الصحيح!
  كل عنصر: { username, role, points }

** التواريخ - كيفية التنسيق **
- لتنسيق تاريخ عربي: new Date(dateStr).toLocaleDateString('ar-EG')
- لحساب الشهر الحالي: new Date().toISOString().slice(0,7) → مثال "2026-04"
- لحساب آخر 30 يوم:
  const today = new Date();
  const toStr = today.toISOString().slice(0,10);
  const from = new Date(today); from.setDate(today.getDate()-30);
  const fromStr = from.toISOString().slice(0,10);

** للأرقام **
- للتنسيق العربي: (number || 0).toLocaleString('ar-EG') + ' ج.م'

=== المكتبات المتاحة للاستخدام في الـ script (لا تحتاج import، متوفرة عالمياً) ===

** Chart.js (للرسوم البيانية) - قاعدة مهمة جداً **
- ⚠️ لا تضع <script src="..."> في الـ html لأن innerHTML لا ينفذ script tags أبداً!
- بدلاً من ذلك، حمّل المكتبة ديناميكياً من الـ script بهذا النمط الإلزامي:

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ثم استخدمها هكذا:
loadScript('https://cdn.jsdelivr.net/npm/chart.js').then(() => {
  new Chart(document.getElementById('myChart'), {
    type: 'doughnut', // أو bar أو line أو pie
    data: { labels: [], datasets: [{ data: [], backgroundColor: ['#0d6efd','#20c997','#fd7e14'] }] }
  });
});

- ضع <canvas id="myChart"></canvas> في الـ html
- ألوان مقترحة: ['#0d6efd','#20c997','#fd7e14','#dc3545','#6f42c1','#ffc107']

** FontAwesome (أيقونات) - نفس القاعدة **
- ⚠️ لا تضع <link> في الـ html، بل حمّل الـ CSS ديناميكياً من الـ script:

function loadCSS(href) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}
loadCSS('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css');

- بعدها استخدم مباشرة في الـ html: <i class="fas fa-chart-bar"></i>

** القاعدة الذهبية: كل <script> و<link> خارجية تحملها من الـ JavaScript script بالدوال السابقة **

=== توقيع عفركوش الإلزامي في كل صفحة ===
في نهاية كل html تبنيه، يجب إضافة توقيع عفركوش بشكل إلزامي. ابتكر في كل مرة جملة كوميدية جديدة وفريدة من خيالك (غير ثابتة!) تعبر عن روح العفريت الذي بنى هذه الصفحة. أمثلة على الأسلوب (لا تكررها): "رحت جيت ولقيت البيانات مش نامة"، "فركت المصباح وطلعت تقرير"، "عفاريت الكود كانت معايا الليلة". لا تقل نفس الجملة مرتين!
<div style="text-align:center; padding: 30px 0 15px; margin-top:50px; border-top: 1px dashed #ddd; direction:rtl;">
  <img src="https://www.gharam.art/logo.png" alt="غرام سلطان" style="width:60px; opacity:0.6; margin-bottom:8px; filter: drop-shadow(0 2px 6px rgba(201,160,78,0.3));" />
  <div style="font-size: 1.6rem; animation: float 3s ease-in-out infinite; display:inline-block; margin: 0 8px;">🧞</div>
  <div style="font-family: monospace; font-size:13px; color:#888; margin-top:6px;">صُنع بيد عفركوش الذراع التقني لغرام سلطان  🔮</div>
  <div style="font-size:11px; color:#bbb; margin-top:4px; font-style:italic;">[ اكتب هنا جملتك الكوميدية المبتكرة ]</div>
  <style>@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }</style>
</div>

=== قواعد الروابط ===
- عند إخبار المستخدم برابط الأداة بعد بنائها، أرسل الرابط كاملاً بالدومين:
  - إذا كانت الصلاحية عامة (public): https://www.gharam.art/p/afrakoush/{name}
  - إذا كانت إدارية: https://www.gharam.art/admin/afrakoush/{name}`;

const MODEL_CANDIDATES = [
    'gemini-3.1-pro-preview',
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-3.1-flash-lite-preview',
    'gemini-2.5-flash-lite',
    'gemini-3-flash-preview'
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
                description: "تقرير مالي شامل ويعرض توزيع الأموال على قنوات الدفع (كاش، فودافون كاش، انستاباي، فيزا) وصافي الربح.",
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
                description: "يبحث عن الحجوزات برقم الإيصال أو رقم تليفون أو اسم العميلة أو الفلترة بنوع الخدمة وتواريخ محددة. يرجع كل بيانات الحجز. مفيد جداً للبحث والفلترة.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        query: { type: "STRING", description: "مؤشر بحث عن رقم الإيصال أو رقم تليفون أو اسم العميلة (اختياري)." },
                        serviceName: { type: "STRING", description: "اسم خدمة للبحث عنها داخله (مثل: تصوير، فرد، صبغة، ميكاب) (اختياري)." },
                        startDate: { type: "STRING", description: "تاريخ البداية للحجز (YYYY-MM-DD)." },
                        endDate: { type: "STRING", description: "تاريخ النهاية للحجز (YYYY-MM-DD)." }
                    },
                    required: []
                }
            },
            {
                name: "get_activity_log",
                description: "يجلب سجل النشاط والعمليات (إنشاء/تعديل/حذف حجوزات وخدمات ومصروفات) مع اسم الموظف المنفذ وتفاصيل التغييرات. يمكن الفلترة بالتاريخ ونوع الكيان.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        startDate: { type: "STRING", description: "تاريخ البداية (YYYY-MM-DD)." },
                        endDate: { type: "STRING", description: "تاريخ النهاية (YYYY-MM-DD)." },
                        entityType: { type: "STRING", description: "نوع الكيان (مثلاً: Booking, InstantService, Expense) (اختياري)." },
                        employeeName: { type: "STRING", description: "اسم الموظف لتتبع عملياته (اختياري)." },
                        limit: { type: "NUMBER", description: "عدد السجلات (الافتراضي 30)." }
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
            },
            {
                name: "evaluate_employee_performance",
                description: "تقييم أداء الموظفين وإيجاد الأفضل بحساب العائد الخاص بهم عبر تحديد فترة زمنية.",
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
                name: "detect_anomalies",
                description: "يكتشف الأخطاء أو التجاوزات مثل ديون العملاء لحجوزات منتهية، السلف العالية للموظفين، والخدمات المرتجعة الكثيرة.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        daysLimit: { type: "NUMBER", description: "آخر X عدد من الأيام للبحث (افتراضي 30)." }
                    },
                    required: []
                }
            },
            {
                name: "get_past_clients",
                description: "يجلب قائمة بالعميلات السابقات لإعادة استهدافهن مرة أخرى بناء أوقات حجوزاتهم.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        monthsAgo: { type: "NUMBER", description: "البحث عن العملاء الذين حجزوا منذ عدد أشهر معينة (مثلا 6)." }
                    },
                    required: ["monthsAgo"]
                }
            },
            {
                name: "predictive_scheduling",
                description: "يعرض حجم وتفاصيل الحجوزات القادمة في يوم محدد مع الموظفين المتاحين لاقتراح التوزيع العادل للشغل.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        targetDate: { type: "STRING", description: "تاريخ اليوم المطلوب (YYYY-MM-DD)." }
                    },
                    required: ["targetDate"]
                }
            },
            {
                name: "search_admin_conversations",
                description: "تبحث في أرشيف المحادثات. مسموح لمدير النظام البحث في محادثات المشرفين، وللمشرفين البحث في محادثاتهم الشخصية فقط.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        query: { type: "STRING", description: "كلمة مفتاحية للبحث داخل المحادثة أو عنوانها (اختياري)." },
                        username: { type: "STRING", description: "اسم المستخدم أو المشرف للبحث في محادثاته (اختياري للمشرف وتطبق صلاحيته تلقائياً)." },
                        startDate: { type: "STRING", description: "تاريخ البداية (YYYY-MM-DD) اختياري." },
                        endDate: { type: "STRING", description: "تاريخ النهاية (YYYY-MM-DD) اختياري." }
                    },
                    required: []
                }
            },
            {
                name: "build_afrakoush_page",
                description: "يبني أو يعدل صفحة واجهة مستخدم (HTML + JS) تعرض بيانات وأدوات مخصصة ويخزنها كأداة ديناميكية.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        name: { type: "STRING", description: "اسم مختصر للرابط بالانجليزية (مثال: yearly-report) يعبر عن الأداة." },
                        title: { type: "STRING", description: "اسم الصفحة بالعربية." },
                        html: { type: "STRING", description: "تصميم الواجهة باستخدام Bootstrap 5. ضع فقط محتوى الصفحة بدون <html> أو <body>." },
                        script: { type: "STRING", description: "كود جافاسكريبت نقي (Vanilla JS) يستخدم كائن apiClient (المجهز بـ axios) والـ container لجلب البيانات والتفاعل. مثلا: apiClient.get('/api/bookings').then..." },
                        allowedRole: { type: "STRING", description: "الصلاحية המسموحة: admin, supervisor, employee, أو public. الفتراضي هو supervisor." }
                    },
                    required: ["name", "title", "html", "script"]
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
            if (empIds.length > 0) {
                bQuery.$or = [
                    { 'packageServices.executedBy': { $in: empIds } },
                    { 'hairStraighteningExecutedBy': { $in: empIds } },
                    { 'hairDyeExecutedBy': { $in: empIds } }
                ];
            }
            const bookingsDB = await Booking.find(bQuery)
                .populate('packageServices.executedBy', 'username')
                .populate('hairStraighteningExecutedBy', 'username')
                .populate('hairDyeExecutedBy', 'username')
                .populate('extraServices', 'name')
                .populate('package', 'name')
                .populate('photographyPackage', 'name')
                .populate('hennaPackage', 'name')
                .lean();

            const bookings = bookingsDB.map(b => ({
                receiptNumber: b.receiptNumber,
                client: b.clientName,
                phone: b.clientPhone,
                eventDate: b.eventDate?.toISOString().split('T')[0],
                total: b.total,
                remaining: b.remaining,
                packageName: b.package?.name || 'غير محدد',
                photographyPackage: b.photographyPackage?.name || null,
                hennaPackage: b.hennaPackage?.name || null,
                extraServices: (b.extraServices || []).map(s => s.name).join('، '),
                services: (b.packageServices || []).map(s => ({
                    name: s.name,
                    executed: s.executed,
                    executedBy: s.executedBy?.username || null
                })),
                hairStraightening: b.hairStraightening ? { executed: b.hairStraighteningExecuted, executedBy: b.hairStraighteningExecutedBy?.username || null } : null,
                hairDye: b.hairDye ? { executed: b.hairDyeExecuted, executedBy: b.hairDyeExecutedBy?.username || null } : null
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
                    return { message: "لا توجد بيانات متاحة في هذا النطاق الزمني." };
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
                    return { message: "لا توجد بيانات متاحة في هذا النطاق الزمني." };
                }
            }

            let start = new Date(startDate); start.setHours(0, 0, 0, 0);
            let end = new Date(endDate); end.setHours(23, 59, 59, 999);

            const paymentBreakdown = { cash: 0, vodafone: 0, visa: 0, instapay: 0 };
            const toNumber = (v) => Number(v) || 0;

            // === Revenue from NEW bookings created in this period ===
            // Revenue = deposit - sum(installments) = only the INITIAL deposit that was paid
            const newBookings = await Booking.find({ createdAt: { $gte: start, $lte: end } }).lean();
            let depositRevenue = 0;
            for (const b of newBookings) {
                const installmentsSum = (b.installments || []).reduce((s, i) => s + (toNumber(i.amount)), 0);
                const initialDeposit = (toNumber(b.deposit)) - installmentsSum;
                const finalDeposit = Math.max(0, initialDeposit);
                depositRevenue += finalDeposit;
                paymentBreakdown[b.paymentMethod || 'cash'] = (paymentBreakdown[b.paymentMethod || 'cash'] || 0) + finalDeposit;
            }

            // === Revenue from INSTALLMENTS paid in this period (from any booking) ===
            const bookingsWithInstallments = await Booking.find({
                'installments.date': { $gte: start, $lte: end }
            }).lean();
            let installmentRevenue = 0;
            for (const b of bookingsWithInstallments) {
                for (const inst of (b.installments || [])) {
                    const instDate = new Date(inst.date);
                    if (instDate >= start && instDate <= end) {
                        const amt = toNumber(inst.amount);
                        installmentRevenue += amt;
                        paymentBreakdown[inst.paymentMethod || 'cash'] = (paymentBreakdown[inst.paymentMethod || 'cash'] || 0) + amt;
                    }
                }
            }

            const totalBookingRevenue = depositRevenue + installmentRevenue;

            // === Revenue from instant services in this period ===
            const instantServices = await InstantService.find({ createdAt: { $gte: start, $lte: end } }).lean();
            let revI = 0;
            for (const is of instantServices) {
                const amt = toNumber(is.total);
                revI += amt;
                paymentBreakdown[is.paymentMethod || 'cash'] = (paymentBreakdown[is.paymentMethod || 'cash'] || 0) + amt;
            }

            // === Expenses ===
            const expenses = await Expense.find({ createdAt: { $gte: start, $lte: end } }).lean();
            let expT = 0;
            for (const e of expenses) {
                const amt = toNumber(e.amount);
                expT += amt;
                paymentBreakdown[e.paymentMethod || 'cash'] = (paymentBreakdown[e.paymentMethod || 'cash'] || 0) - amt;
            }

            // === Advances ===
            const advances = await Advance.find({ createdAt: { $gte: start, $lte: end } }).lean();
            let advT = 0;
            for (const a of advances) {
                const amt = toNumber(a.amount);
                advT += amt;
                paymentBreakdown[a.paymentMethod || 'cash'] = (paymentBreakdown[a.paymentMethod || 'cash'] || 0) - amt;
            }

            const totalIncome = totalBookingRevenue + revI;
            const net = totalIncome - expT - advT;

            return {
                summary: `عربون حجوزات جديدة: ${depositRevenue} ج | أقساط مدفوعة: ${installmentRevenue} ج | خدمات سريعة: ${revI} ج | إجمالي الدخل: ${totalIncome} ج | مصروفات: ${expT} ج | سلف: ${advT} ج | صافي: ${net} ج | كاش: ${paymentBreakdown.cash} ج | فودافون: ${paymentBreakdown.vodafone} ج | فيزا: ${paymentBreakdown.visa} ج | انستاباي: ${paymentBreakdown.instapay} ج`,
                data: {
                    newBookingDeposits: depositRevenue,
                    installmentsPaid: installmentRevenue,
                    instantServicesRevenue: revI,
                    totalIncome,
                    totalExpenses: expT,
                    totalAdvances: advT,
                    net,
                    paymentBreakdown
                }
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
    search_booking: async ({ query, serviceName, startDate, endDate }) => {
        try {
            const searchQuery = {};
            if (query) {
                searchQuery.$or = [
                    { receiptNumber: query },
                    { clientPhone: { $regex: query, $options: 'i' } },
                    { clientName: { $regex: query, $options: 'i' } }
                ];
            }
            if (startDate || endDate) {
                searchQuery.eventDate = {};
                if (startDate) {
                    let start = new Date(startDate);
                    if (!isNaN(start.getTime())) {
                        start.setHours(0, 0, 0, 0);
                        searchQuery.eventDate.$gte = start;
                    }
                }
                if (endDate) {
                    let end = new Date(endDate);
                    if (!isNaN(end.getTime())) {
                        end.setHours(23, 59, 59, 999);
                        searchQuery.eventDate.$lte = end;
                    }
                }
                if (Object.keys(searchQuery.eventDate).length === 0) delete searchQuery.eventDate;
            }

            const resultsDb = await Booking.find(searchQuery)
                .populate('package', 'name price type')
                .populate('photographyPackage', 'name price')
                .populate('hennaPackage', 'name price')
                .populate('packageServices.executedBy', 'username')
                .populate('createdBy', 'username')
                .populate('extraServices', 'name')
                .sort({ eventDate: -1 })
                .limit(50)
                .lean();

            let results = resultsDb;

            if (serviceName) {
                const serviceRegex = new RegExp(serviceName, 'i');
                results = results.filter(b => {
                    if (b.package?.name?.match(serviceRegex)) return true;
                    if (b.packageServices?.some(s => s.name?.match(serviceRegex))) return true;
                    if (b.extraServices?.some(s => s.name?.match(serviceRegex))) return true;
                    if (serviceName.includes('فرد') && b.hairStraightening) return true;
                    if (serviceName.includes('صبغة') && b.hairDye) return true;
                    if (serviceName.includes('بروتين') && b.hairStraightening) return true;
                    if (serviceName.includes('تصوير') && b.photographyPackage) return true;
                    if (serviceName.includes('حنة') && b.hennaPackage) return true;
                    if (b.photographyPackage?.name?.match(serviceRegex)) return true;
                    if (b.hennaPackage?.name?.match(serviceRegex)) return true;
                    return false;
                });
            }

            if (results.length === 0) return { message: `لم يتم العثور على حجوزات تطابق المعايير.` };

            return {
                count: results.length,
                bookings: results.slice(0, 20).map(b => ({
                    receiptNumber: b.receiptNumber,
                    clientName: b.clientName,
                    clientPhone: b.clientPhone,
                    eventDate: b.eventDate?.toISOString().split('T')[0],
                    packageName: b.package?.name || 'غير محدد',
                    photographyPackage: b.photographyPackage?.name || null,
                    hennaPackage: b.hennaPackage?.name || null,
                    total: b.total,
                    deposit: b.deposit,
                    remaining: b.remaining,
                    paymentMethod: b.paymentMethod,
                    services: (b.packageServices || []).map(s => s.name).join('، '),
                    extraServices: (b.extraServices || []).map(s => s.name).join('، '),
                    hairStraightening: b.hairStraightening ? { price: b.hairStraighteningPrice } : null,
                    hairDye: b.hairDye ? { price: b.hairDyePrice } : null,
                    createdBy: b.createdBy?.username || 'غير معروف',
                    createdAt: b.createdAt?.toISOString().split('T')[0],
                    updatesCount: b.updates?.length || 0
                }))
            };
        } catch (err) {
            console.error('[AdminAI] search_booking error:', err.message);
            return { error: "فشل في البحث عن الحجز: " + err.message };
        }
    },
    get_activity_log: async ({ startDate, endDate, entityType, employeeName, limit }) => {
        try {
            const count = Math.min(limit || 30, 100);
            const query = {};

            if (startDate || endDate) {
                query.createdAt = {};
                if (startDate) {
                    let start = new Date(startDate);
                    if (!isNaN(start.getTime())) {
                        start.setHours(0, 0, 0, 0);
                        query.createdAt.$gte = start;
                    }
                }
                if (endDate) {
                    let end = new Date(endDate);
                    if (!isNaN(end.getTime())) {
                        end.setHours(23, 59, 59, 999);
                        query.createdAt.$lte = end;
                    }
                }
                if (Object.keys(query.createdAt).length === 0) delete query.createdAt;
            }
            if (entityType) {
                query.entityType = { $regex: entityType, $options: 'i' };
            }
            if (employeeName) {
                const emps = await User.find({ username: { $regex: employeeName, $options: 'i' } }).lean();
                if (emps.length > 0) {
                    query.performedBy = { $in: emps.map(e => e._id) };
                } else {
                    return { message: `لم يتم العثور على موظف باسم ${employeeName}` };
                }
            }

            const logs = await ActivityLog.find(query)
                .populate('performedBy', 'username')
                .sort({ createdAt: -1 })
                .limit(count)
                .lean();

            return {
                count: logs.length,
                logs: logs.map(l => ({
                    action: l.action,
                    entityType: l.entityType,
                    details: l.details,
                    amount: l.amount || null,
                    employee: l.performedBy?.username || 'غير معروف',
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
                .populate('photographyPackage', 'name')
                .populate('hennaPackage', 'name')
                .populate('extraServices', 'name')
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
                    photographyPackage: b.photographyPackage?.name || null,
                    hennaPackage: b.hennaPackage?.name || null,
                    extraServices: (b.extraServices || []).map(s => s.name).join('، '),
                    hasHairStraightening: b.hairStraightening ? true : false,
                    hasHairDye: b.hairDye ? true : false,
                    total: b.total,
                    remaining: b.remaining,
                    deposit: b.deposit
                }))
            };
        } catch (err) {
            console.error('[AdminAI] get_client_details error:', err.message);
            return { error: "فشل في جلب بيانات العميلة: " + err.message };
        }
    },
    evaluate_employee_performance: async ({ startDate, endDate }) => {
        try {
            let start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
            let end = new Date(); end.setHours(23, 59, 59, 999);

            if (startDate) {
                const s = new Date(startDate);
                if (!isNaN(s.getTime())) { s.setHours(0, 0, 0, 0); start = s; }
            }
            if (endDate) {
                const e = new Date(endDate);
                if (!isNaN(e.getTime())) { e.setHours(23, 59, 59, 999); end = e; }
            }

            const users = await User.find({ role: { $in: ['employee', 'supervisor', 'admin'] } }).lean();

            const results = await Promise.all(users.map(async u => {
                const bCount = await Booking.countDocuments({
                    eventDate: { $gte: start, $lte: end },
                    $or: [
                        { 'packageServices.executedBy': u._id },
                        { 'hairStraighteningExecutedBy': u._id },
                        { 'hairDyeExecutedBy': u._id }
                    ]
                });

                const iResult = await InstantService.aggregate([
                    { $match: { employeeId: u._id, createdAt: { $gte: start, $lte: end } } },
                    { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } }
                ]);
                const instantRevenue = iResult[0]?.total || 0;
                const instantCount = iResult[0]?.count || 0;

                const advResult = await Advance.aggregate([
                    { $match: { userId: u._id, createdAt: { $gte: start, $lte: end } } },
                    { $group: { _id: null, total: { $sum: "$amount" } } }
                ]);
                const advTotal = advResult[0]?.total || 0;

                const dedResult = await Deduction.aggregate([
                    { $match: { userId: u._id, createdAt: { $gte: start, $lte: end } } },
                    { $group: { _id: null, total: { $sum: "$amount" } } }
                ]);
                const dedTotal = dedResult[0]?.total || 0;

                const employeeInfo = {
                    name: u.username,
                    role: u.role,
                    bookingsParticipated: bCount,
                    instantServicesCount: instantCount,
                    instantServicesRevenue: instantRevenue,
                    advancesTaken: advTotal,
                    deductions: dedTotal,
                    monthlySalary: u.monthlySalary || 0
                };
                if (user.role === 'supervisor') {
                    delete employeeInfo.deductions;
                    delete employeeInfo.monthlySalary;
                }
                return employeeInfo;
            }));

            const activeResults = results.filter(u => u.bookingsParticipated > 0 || u.instantServicesCount > 0 || u.advancesTaken > 0 || u.deductions > 0);
            return {
                totalEmployees: results.length,
                activeEmployeesCount: activeResults.length,
                employeesPerformance: activeResults.slice(0, 20)
            };
        } catch (err) {
            console.error('[AdminAI] evaluate_employee_performance error:', err.message);
            return { error: "فشل التقييم: " + err.message };
        }
    },
    detect_anomalies: async ({ daysLimit = 30 }) => {
        try {
            const days = parseInt(daysLimit) || 30;
            let limitDate = new Date();
            limitDate.setDate(limitDate.getDate() - days);
            let today = new Date(); today.setHours(0, 0, 0, 0);

            const debts = await Booking.find({
                eventDate: { $gte: limitDate, $lt: today },
                remaining: { $gt: 0 }
            }).select('receiptNumber clientName clientPhone remaining eventDate total').lean();

            const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            const users = await User.find({}).lean();
            const advancesIssues = [];
            for (const u of users) {
                if (!u.monthlySalary) continue;
                const advSum = await Advance.aggregate([
                    { $match: { userId: u._id, createdAt: { $gte: currentMonthStart } } },
                    { $group: { _id: null, total: { $sum: "$amount" } } }
                ]);
                const totalAdv = advSum[0]?.total || 0;
                if (totalAdv > (u.monthlySalary * 0.4)) {
                    advancesIssues.push({ name: u.username, salary: u.monthlySalary, totalAdvances: totalAdv });
                }
            }

            const returns = await Booking.find({
                createdAt: { $gte: limitDate },
                returnedServices: { $exists: true, $not: { $size: 0 } }
            }).select('receiptNumber clientName returnedServices createdAt').populate('returnedServices', 'name').lean();

            return {
                debtsCount: debts.length,
                debts: debts.slice(0, 15).map(d => ({ ...d, eventDate: d.eventDate?.toISOString().split('T')[0] })),
                highAdvancesCount: advancesIssues.length,
                highAdvances: advancesIssues.slice(0, 15),
                returnedServicesCount: returns.length,
                returns: returns.slice(0, 15).map(r => ({ receiptNumber: r.receiptNumber, clientName: r.clientName, services: r.returnedServices.map(s => s.name).join('، ') }))
            };
        } catch (err) {
            console.error('[AdminAI] detect_anomalies error:', err.message);
            return { error: "فشل التدقيق: " + err.message };
        }
    },
    get_past_clients: async ({ monthsAgo }) => {
        try {
            const m = parseInt(monthsAgo) || 6;
            let start = new Date();
            start.setMonth(start.getMonth() - m);
            start.setHours(0, 0, 0, 0);

            let end = new Date(start);
            end.setMonth(end.getMonth() + 1);

            const pastBookings = await Booking.find({
                eventDate: { $gte: start, $lte: end }
            }).populate('package', 'name').populate('extraServices', 'name').select('clientName clientPhone eventDate package extraServices').lean();

            const uniqueClients = [];
            const seenPhones = new Set();
            for (const b of pastBookings) {
                if (!seenPhones.has(b.clientPhone)) {
                    seenPhones.add(b.clientPhone);
                    uniqueClients.push({
                        name: b.clientName,
                        phone: b.clientPhone,
                        date: b.eventDate?.toISOString().split('T')[0],
                        package: b.package?.name,
                        extraServices: (b.extraServices || []).map(s => s.name).join('، ')
                    });
                }
            }
            return {
                targetPeriodFilter: { from: start.toISOString().split('T')[0], to: end.toISOString().split('T')[0] },
                clientsFound: uniqueClients.length,
                clients: uniqueClients.slice(0, 15),
                systemMessage: uniqueClients.length > 15 ? `تم جلب أول 15 عميلة من أصل ${uniqueClients.length} لتوفير مساحة الذاكرة، أخبر المديرة بذلك.` : ``
            };
        } catch (err) {
            console.error('[AdminAI] get_past_clients error:', err.message);
            return { error: "فشل استخراج العميلات: " + err.message };
        }
    },
    predictive_scheduling: async ({ targetDate }) => {
        try {
            let start = new Date();
            if (targetDate) {
                const td = new Date(targetDate);
                if (!isNaN(td.getTime())) { start = td; }
            }
            start.setHours(0, 0, 0, 0);
            let end = new Date(start);
            end.setHours(23, 59, 59, 999);

            const bookings = await Booking.find({ eventDate: { $gte: start, $lte: end } })
                .populate('package', 'name').populate('photographyPackage', 'name').populate('hennaPackage', 'name').populate('extraServices', 'name').lean();

            const activeStaff = await User.find({ role: { $in: ['employee', 'supervisor'] } }).select('username role').lean();

            const summary = {
                bridesCount: 0,
                hairDyeCount: 0,
                hairStraighteningCount: 0,
                photographyCount: 0,
                otherPackages: 0,
                bookingsDetails: []
            };

            for (const b of bookings) {
                if (b.package?.name?.includes('عروس')) summary.bridesCount++;
                else summary.otherPackages++;

                if (b.hairDye) summary.hairDyeCount++;
                if (b.hairStraightening) summary.hairStraighteningCount++;
                if (b.photographyPackage) summary.photographyCount++;

                summary.bookingsDetails.push({
                    client: b.clientName,
                    package: b.package?.name,
                    photographyPackage: b.photographyPackage?.name || null,
                    hennaPackage: b.hennaPackage?.name || null,
                    hasHairDye: !!b.hairDye,
                    hasHairStraightening: !!b.hairStraightening,
                    extraServices: (b.extraServices || []).map(s => s.name).join('، ')
                });
            }

            return {
                targetDate,
                workloadSummary: summary,
                availableStaffCount: activeStaff.length,
                staff: activeStaff.map(s => s.username)
            };
        } catch (err) {
            console.error('[AdminAI] predictive_scheduling error:', err.message);
            return { error: "فشل جلب الجدولة: " + err.message };
        }
    },
    search_admin_conversations: async ({ query, username, startDate, endDate }) => {
        try {
            const searchQuery = {};
            if (user.role !== 'admin') {
                searchQuery.userId = user._id; // enforce logic natively
            } else if (username) {
                const targetUsers = await User.find({ username: { $regex: username, $options: 'i' } }).lean();
                if (targetUsers.length > 0) {
                    searchQuery.userId = { $in: targetUsers.map(u => u._id) };
                } else {
                    return { message: `لم يتم العثور على مستخدم باسم ${username}` };
                }
            }

            if (startDate || endDate) {
                searchQuery.createdAt = {};
                if (startDate) {
                    let start = new Date(startDate);
                    if (!isNaN(start.getTime())) { start.setHours(0, 0, 0, 0); searchQuery.createdAt.$gte = start; }
                }
                if (endDate) {
                    let end = new Date(endDate);
                    if (!isNaN(end.getTime())) { end.setHours(23, 59, 59, 999); searchQuery.createdAt.$lte = end; }
                }
                if (Object.keys(searchQuery.createdAt).length === 0) delete searchQuery.createdAt;
            }

            if (query) {
                searchQuery.$or = [
                    { title: { $regex: query, $options: 'i' } },
                    { 'messages.text': { $regex: query, $options: 'i' } }
                ];
            }

            const convos = await AdminConversation.find(searchQuery)
                .populate('userId', 'username role')
                .sort({ lastActivity: -1 })
                .limit(5)
                .lean();

            if (convos.length === 0) return { message: "لم يتم العثور على محادثات تطابق معايير البحث." };

            return {
                count: convos.length,
                conversations: convos.map(c => ({
                    title: c.title,
                    user: c.userId?.username || 'المدير العام',
                    role: c.userId?.role || 'admin',
                    lastActivity: c.lastActivity?.toISOString().replace('T', ' ').slice(0, 16),
                    messagesCount: c.messages?.length || 0,
                    preview: c.messages?.length ? c.messages.map(m => `[${m.role === 'user' ? 'المستخدم' : 'الذكاء'}]: ${m.text}`).join('\\n').slice(0, 800) + '...' : 'لا توجد رسائل مسجلة'
                }))
            };
        } catch (err) {
            console.error('[AdminAI] search_admin_conversations error:', err.message);
            return { error: "فشل استرجاع المحادثات: " + err.message };
        }
    },
    build_afrakoush_page: async ({ name, title, html, script, allowedRole }) => {
        try {
            if (user.role !== 'admin') {
                return { error: "صلاحية بناء الأدوات مخصصة للمدير (Admin) فقط." };
            }
            const role = allowedRole || 'supervisor';
            const AfrakoushPage = require('../models/AfrakoushPage');
            const page = await AfrakoushPage.findOneAndUpdate(
                { name },
                {
                    title: title || 'صفحة بدون عنوان',
                    html: html || '<div class="p-5 text-center">لا يوجد محتوى</div>',
                    script: script || '',
                    allowedRole: role,
                    createdBy: user._id
                },
                { new: true, upsert: true }
            );
            return {
                success: true,
                message: "تم حفظ الصفحة بنجاح والتخزين.",
                public_url: role === 'public' ? `/p/afrakoush/${name}` : `غير متاح عام للإدارة فقط`,
                admin_url: `/admin/afrakoush/${name}`
            };
        } catch (err) {
            console.error('[AdminAI] build_afrakoush_page error:', err.message);
            return { error: "فشل بناء الأداة: " + err.message };
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
        systemPrompt += `\n\nتنويه: المستخدم الحالي هو 'مشرف'، واسمه "${user.username}". خاطبه باسمه بشكل ودود ومحترم. أجب على أسئلته وطلباته بشكل طبيعي تماماً بناءً على البيانات التي تستردها من الأدوات. لا تذكر أو تشر أبداً تحت أي ظرف إلى كلمات مثل "صلاحيات"، "قيود"، "ممنوع"، أو أن هناك معلومات محجوبة عنه. إذا أرجعت الأدوات رسالة تفيد بعدم وجود بيانات، أخبره ببساطة أنه لا توجد بيانات أو إيرادات متاحة للإستعلام المطلوب بدون أي تفسيرات.`;
    } else {
        systemPrompt += `\n\nتنويه: المستخدم الحالي هو مدير النظام (Admin) واسمه "${user.username}". لديك صلاحية مطلقة لمراجعة والبحث في محادثات المشرفين الآخرين وأرشيف الذكاء الاصطناعي الخاص بهم بغرض المراقبة. استخدم أداة search_admin_conversations متى طلب منك ذلك ونظم النتائج بأسلوب احترافي.`;
    }

    if (!process.env.GEMINI_API_KEY) throw new Error("Missing Gemini API Key");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Build proper alternating history: user, model, user, model...
    // Gemini requires the first message to be 'user' and roles must alternate.
    let cleanHistory = [];
    const historyMessages = messages.slice(0, -1); // exclude the last (current) message

    for (const m of historyMessages) {
        if (!m.text) continue;
        const role = m.role === 'user' ? 'user' : 'model';

        if (cleanHistory.length === 0) {
            // First message MUST be 'user' for Gemini
            if (role === 'model') continue;
            cleanHistory.push({ role, parts: [{ text: m.text }] });
        } else {
            const last = cleanHistory[cleanHistory.length - 1];
            if (last.role === role) {
                // Merge consecutive same-role messages
                last.parts[0].text += "\n" + m.text;
            } else {
                cleanHistory.push({ role, parts: [{ text: m.text }] });
            }
        }
    }

    // Ensure history ends with 'model' (so last message we send is 'user')
    if (cleanHistory.length > 0 && cleanHistory[cleanHistory.length - 1].role === 'user') {
        cleanHistory.pop(); // Remove trailing user message that would conflict
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
            } catch (e) {
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
