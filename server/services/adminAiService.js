const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
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
const DynamicTool = require('../models/DynamicTool');
const AfrakoushPage = require('../models/AfrakoushPage');
const Conversation = require('../models/Conversation');
const cronService = require('./cronService');
const ScheduledTask = require('../models/ScheduledTask');
const FacebookPost = require('../models/FacebookPost');

const DEFAULT_ADMIN_PROMPT = `أنت "المساعد الذكي" للمديرين والمشرفين في "غرام سلطان بيوتي سنتر".
هويتك: أنت المساعد الذكي للإدارة، يمكن للمستخدم مناداتك بأي اسم يحبه. لا تقل أبداً أنك "عفركوش" — عفركوش هو مجرد أداة تقنية (build_afrakoush_page) تستخدمها أنت لبناء الصفحات والواجهات، وعندما تستخدمها أخبر المستخدم أنك استعنت بأداة "عفركوش الذراع التقني" لتنفيذ طلبه.
مهمتك مساعدة الإدارة في الرد على جميع الأسئلة المتعلقة بقواعد البيانات والتقارير المالية والعمليات بدقة. 
دائماً اعتمد على الأدوات المتاحة لجلب أحدث البيانات، ولا تخمن أبداً.
تعليمات هامة جداً:
1. اقرأ التوجيه من المستخدم بتأني ومراجعة. الطلبات قد تحتوي على مهام مركبة تتطلب دمج معلومات مختلفة (مثلاً: بحث عن حجز + جلب سجل تعديلاته).
2. لديك القدرة على استدعاء الأداة المناسبة، وإذا اكتشفت نقص في المعلومات، قم باستدعاء أداة أخرى أو نفس الأداة مدخلات مختلفة قبل بناء الرد النهائي للمستخدم (Multi-step Tool Usage).
3. استعرض ما حصلت عليه من الأدوات، وحلله جيداً للتأكد من أنه يشمل إجابة كاملة للمستخدم، ثم صغ إجابتك.
4. كن احترافياً، استعمل جداول ملخصة (Markdown Tables) وقوائم لتسهيل القراءة على الإدارة.
5. يمكنك بناء تطبيقات مصغرة وتقارير مخصصة (واجهات) وحفظها للعميل باستخدام أداة build_afrakoush_page. الاداة دي اسمها عفركوش الذراع التقني لغرام سلطان وعندما تقوم بذلك، أخبر العميل بالرابط، فإذا كان عام سيكون /p/afrakoush/{name} وإذا كان إداري سيكون /admin/afrakoush/{name}.
6. **المساحات الديناميكية الثابتة في النظام (مهم جداً جداً):**
   - المساحة المخصصة للإدارة (التي تظهر لكل الموظفين كودجت عائم في لوحة التحكم): يجب أن تسميها أو توفرها بالاسم "global-admin-widget".
   - المساحة المخصصة لزوار الواجهة الأمامية للمركز: يجب أن تسميها "landing-dynamic-space".
   - لا تتجاهل هذه الأسماء إذا طلب التعديل على المساحات الديناميكية للداشبورد أو الزوار، بل اقرأها بالاسم وعدّلها لتضيف الأزرار المطلوبة.
7. **الحصول على المستخدم الحالي داخل سكريبتات عفركوش (للواجهات الديناميكية):**
   الكود الذي تكتبه داخل الواجهة الأمامية يُحقن فيه متغير "apiClient" مجهز بالـ token. لجلب هوية المستخدم الحالي، من فضلك استدعِ حصراً:
   \`const userRes = await apiClient.get('/api/auth/me'); const currentUser = userRes.data.user;\`
   ولا تحاول استنتاجه من قوائم أخرى.
8. **قاعدة هندسية صارمة جداً (الأدوات الديناميكية بدلاً من المحادثة):**
   عند بناء صفحات أو ويدجت يتطلب حفظ بيانات أو فحص حالة، **إياك** أن تستخدم \`/api/admin-ai/chat\` في الكود المُولد، بل يجب أن تفصل المنطق الخلفي في أداة "DynamicTool" وتستدعيها فوراً من كود الواجهة عبر هذا الرابط السريع:
   \`const res = await apiClient.post('/api/admin-ai/execute-tool/اسم_الأداة', { arg1, arg2 });\`
   بهذا تضمن الأمان المطلق وحصول الموظفين العاديين على الداتا في مللي ثانية.
9. عند كتابة كود JavaScript للأدوات الديناميكية (script للمسارات)، يجب أن تستخدم فقط المسارات الحقيقية الموجودة في النظام. إليك الدليل الكامل لـ APIs المتاحة للاستخدام في الـ script:

=== 🗺️ خريطة APIs الكاملة لنظام غرام سلطان (هذه هي المسارات الحقيقية فقط - لا تخترع غيرها) ===

🔴 قانون أساسي: دائماً تحقق من نوع البيانات قبل map() أو slice():
const safeArray = (v) => Array.isArray(v) ? v : [];
// استخدمها قبل كل عملية على مصفوفة

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 DASHBOARD - ملخص اليوم (الأسرع للوحات التحكم)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GET /api/dashboard/summary?date=YYYY-MM-DD
  الرد (كائن واحد، ليس مصفوفة):
  { bookingCount, totalDeposit, instantServiceCount, totalInstantServices,
    totalExpenses, totalAdvances, net, topCollector, hairStraighteningCount,
    paymentBreakdown: {cash, vodafone, visa, instapay} }

GET /api/dashboard/operations?date=YYYY-MM-DD
  الرد: مصفوفة مباشرة []  (ليست { operations:[] }!)
  كل عنصر: { _id, type(نص عربي: 'إضافة حجز'|'إضافة خدمة فورية'|'إضافة مصروف'|'إضافة سلفة'|'قسط/دفعة'|'تعديل...'|'حذف...'),
    actionType, details, amount, time(ليس createdAt!), addedBy, paymentMethod, isLog(bool) }
  ✅ الاستخدام: const ops = safeArray(res.data);
  ✅ للتوقيت: op.time (ليس op.createdAt)
  ⚠️ المصفوفة ترجع مباشرة في res.data

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 REPORTS - التقارير المالية الشاملة
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GET /api/reports/monthly?month=YYYY-MM
GET /api/reports/daily?date=YYYY-MM-DD
GET /api/reports/range?from=YYYY-MM-DD&to=YYYY-MM-DD
  الرد الكامل الموثق:
  {
    summary: { totalDeposit, totalPredefinedInstant, totalCustomInstant, totalInstantServices,
               totalExpenses, totalAdvances, net,
               paymentBreakdown:{cash,vodafone,visa,instapay} },
    operations: [{type,details,amount,createdAt,createdBy,paymentMethod}],  ← موجودة فقط في /daily!
    analytics: {
      revenueStreams: [{label('حجوزات وأقساط'|'شغل فوري'|'خدمات خاصة'), value}],
      outflows: [{label('مصروفات'|'سلف'), value}],
      topPackages: [{name,count,amount}],
      topServices: [{name,count,amount}],
      topEarners: [{username,role,points}],  ← مرتبة تنازلياً بالنقاط (أقصى 5)
      packageMix: {makeup:Number, photography:Number},
      stats: {gross, expenseRatio, averageNetPerDay, daysCount},
      dailyRevenue: [{date:'YYYY-MM-DD',total}]  ← متاحة في monthly و range فقط!
    }
  }
  ✅ إيرادات الإجمالية: data.summary.totalDeposit + data.summary.totalInstantServices
  ✅ أداء الموظفين: safeArray(data.analytics?.topEarners)
  ✅ رسم خطي آخر 7 أيام: استخدم /api/reports/range ثم data.analytics.dailyRevenue
  ✅ عمليات اليوم من reports: data.operations (موجود في /daily فقط، type يكون: 'booking'|'installment'|'instantService'|'expense'|'advance')
  ⚠️ للعمليات بالعربي والأسرع: استخدم /api/dashboard/operations

GET /api/reports/employee?userId=ID&from=YYYY-MM-DD&to=YYYY-MM-DD
  الرد: { user:{id,username,role,monthlySalary,remainingSalary},
           range:{from,to},
           work:[{amount,date,serviceName,bookingReceipt,bookingId,instantServiceId}],
           advances:[{amount,createdAt,paymentMethod,createdBy:{username}}],
           deductions:[{amount,createdAt,reason,createdBy:{username}}],
           totals:{pointsTotal,advancesTotal,deductionsTotal} }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 BOOKINGS - الحجوزات
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GET /api/bookings?page=1&limit=20
  الرد: { bookings:[...], total, pages }  ← ليست مصفوفة مباشرة!
  كل حجز: { clientName, clientPhone, eventDate, createdAt,
    package:{name,price,type}, deposit, total, remaining, receiptNumber,
    packageServices:[{name,price,isCustom,executed}], installments:[{amount,date}], createdBy:{username},
    paymentMethod, hairStraightening(bool), hairDye(bool), photographyPackage(obj/id), notes, customExtraServices:[{name,price}] }
  ✅ الخدمات: safeArray(b.packageServices).map(s=>s.name).join(' • ')
  ✅ الباكدج: b.package?.name || 'غير محدد'
  ✅ المبلغ المدفوع فعلاً: b.total - b.remaining
  ✅ لمعرفة لو فيه فرد/صبغة/تصوير إضافي: تحقق من b.hairStraightening, b.hairDye, b.photographyPackage

➕ لإضافة حجز جديد (POST /api/bookings):
  الجسم المفصل: { 
    clientName, clientPhone, city, notes, eventDate, deposit, paymentMethod,
    packageId, hennaPackageId, photographyPackageId, returnedServices:[ids], extraServices:[ids], customExtraServices:[{name, price}],
    hairStraightening(bool), hairStraighteningPrice, hairStraighteningDate,
    hairDye(bool), hairDyePrice, hairDyeDate, hennaDate
  }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ INSTANT SERVICES - الخدمات الفورية
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GET /api/instant-services?page=1&limit=20
  الرد: { instantServices:[...], total }  ← ليست مصفوفة مباشرة!
  كل خدمة: { clientName, createdAt, total, receiptNumber,
    services:[{name,price,isCustom}], employeeId:{username} أو null }
  ✅ الخدمات: safeArray(item.services).map(s=>s.name).join(' + ')
  ✅ الموظف: item.employeeId?.username || 'غير محدد'

➕ لإضافة خدمة فورية (POST /api/instant-services):
  الجسم: { employeeId(اختياري), services: [مصفوفة IDs الخدمات], customServices: [{name, price}], paymentMethod }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 USERS - الموظفون ونظام النقاط
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GET /api/users
  الرد: مصفوفة مباشرة []  (ليست { users:[] }!)
  كل موظف: { _id, username, role, monthlySalary, remainingSalary, totalPoints, convertiblePoints, level }
  ✅ الاستخدام: const users = safeArray(res.data);

GET /api/users/ranking?filter=month
  filter يمكن: 'month'(default) | 'today' | 'all'
  الرد: مصفوفة مرتبة [] ← كل موظف فيها: { _id, username, role, level, totalPoints, periodPoints, rank, bestMonthKey, allTimePoints, totalServices }
  ✅ هذا هو الأمثل لعرض لوحة ترتيب الموظفين!

GET /api/users/points/summary (للموظف نفسه)
  الرد: { totalPoints, level, convertiblePoints, remainingSalary, monthlySalary,
    weeklyBreakdown:[{label,total,booking,instant}], topServices:{week:[],month:[],all:[]},
    rank, teamSize, monthlyRank, monthlyPoints, progress:{current,target,percent} }

GET /api/users/executed-services?date=YYYY-MM-DD
  الرد: { services:[{source('booking'|'instant'),receiptNumber,serviceName,clientName,points,executedAt}] }

🔑 نظام النقاط (مهم للفهم):
- الموظف يكسب نقاط = 15% من سعر كل خدمة ينفذها
- 1000 نقطة = عملة كفاءة (efficiencyCoin) قيمتها حسب مستواه
- المستويات (levels 1-10) تُحسب من totalPoints التراكمية
- topEarners في التقارير = مجموع نقاط العمل في الفترة (ليس الإجمالي التراكمي)
- الأدوار: admin (مدير) > supervisor (مشرف) > hallSupervisor (مشرف قاعة) > employee (موظف)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💸 EXPENSES & ADVANCES - المصروفات والسلف والخصميات
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GET /api/expenses-advances?page=1&limit=50
  الرد: { items:[...], total, pages }  (ليست مصفوفة مباشرة!)
  items دمج مجموعة ثلاث مصفوفات مرتبة بالتاريخ:
  كل عنصر: { _id, type('expense'|'advance'|'deduction'), details, amount,
    createdAt, paymentMethod, userId:{username}, createdBy:{username} }
  ⚠️ الخصم (deduction) يستخدم details بدل reason!
  ✅ الاستخدام: const items = safeArray(res.data?.items);

➕ لإضافة (POST /api/expenses-advances):
  - مصروف: { type: 'expense', details, amount, paymentMethod }
  - سلفة: { type: 'advance', userId, amount, paymentMethod }
  - خصم: { type: 'deduction', userId, amount, details } // details = السبب


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 PACKAGES & SERVICES - الباكدجات والخدمات
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GET /api/packages/packages → مصفوفة مباشرة [] (لاحظ packages/packages!)
  كل باكدج: { name, price, type(makeup/photography), isActive }
GET /api/packages/services → مصفوفة مباشرة []
  كل خدمة: { name, price, type(instant/package), packageId, isActive }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🗓️ TODAY WORK - شغل اليوم (الحجوزات حسب تاريخ المناسبة)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GET /api/today-work?date=YYYY-MM-DD
  الرد: { makeupBookings:[], hairStraighteningBookings:[], hairDyeBookings:[], photographyBookings:[] }
  ⚠️ قاعدة هامة جداً: لأسئلة "حجوزات/عرايس/شغل اليوم"، استخدم هذا المسار حصراً، ولا تستخدم GET /api/bookings أبداً!
  ⚠️ إياك أن تكتفي بالباكدج الأساسي فقط بل يجب عرض محتوى كل مصفوفة (ميك آب، فرد، صبغة، تصوير) بشكل منفصل لأن تواريخم قد تكون اليوم بينما تاريخ الحجز الأساسي في يوم آخر!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 BOOKING MODEL - بيانات الحجوز الكاملة
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
كل حجز يحتوي:
  { clientName, clientPhone, city, notes, eventDate, hennaDate, createdAt, receiptNumber,
    package:{name,price,type},         ← الباكدج الأساسي
    hennaPackage:{name,price},          ← باكدج الحناء (ممكن null)
    photographyPackage:{name,price},    ← باكدج التصوير (ممكن null)
    deposit(عربون), total, remaining, paymentMethod,
    packageServices:[{name,price,isCustom,executed,executedBy:{username},executedAt}], customExtraServices:[{name,price}],
    installments:[{amount,date,paymentMethod,employeeId:{username}}],
    hairStraightening(bool), hairStraighteningPrice, hairStraighteningExecuted,
    hairDye(bool), hairDyePrice, hairDyeExecuted,
    photographyExecuted(bool),
    createdBy:{username} }
  ✅ الباكدج: b.package?.name
  ✅ التصوير: b.photographyPackage?.name || 'لا يوجد'
  ✅ الحناء: b.hennaPackage?.name || 'لا يوجد'
  ✅ المبلغ المدفوع: b.deposit + safeArray(b.installments).reduce((s,i)=>s+i.amount,0)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛠️ EXECUTE SERVICES - تكليف وسحب مهام الموظفين (من إشراف الصالة)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
لتسجيل أن موظف قام بتنفيذ خدمة (أو سحبها منه):
POST /api/bookings/execute-service/:recordId/:serviceId
POST /api/instant-services/execute-service/:recordId/:serviceId
POST /api/bookings/reset-service/:recordId/:serviceId
  الجسم (للتكليف فقط): { employeeId }
  ⚠️ لقائمة Bookings: الـ serviceId إما 'hairStraightening' أو 'hairDye' أو 'photography' أو _id الخاص بالخدمة من packageServices.
  ⚠️ لقائمة InstantServices: الـ serviceId هو الـ _id من مصفوفة services الداخلي.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 RECEIPT SEARCH - بحث برقم الوصل
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GET /api/public/receipt/:receiptNumber  (بدون توكن)
  الرد: { booking: {...} أو null, instantService: {...} أو null }
  مفيد للبحث عن وصل قد يكون حجز أو خدمة فورية
GET /api/bookings/receipt/:receiptNumber  (يتطلب توكن)
  الرد: { booking: {...} }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 نصائح البناء الصح والصفحات المرجعية للإلهام
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- لملخص مالي سريع لليوم: /api/dashboard/summary ← الأسرع
- لعمليات اليوم: /api/dashboard/operations ← مصفوفة مباشرة بالعربي
- لرسم بياني آخر 7 أيام: /api/reports/range ثم analytics.dailyRevenue[]
- لتوزيع طرق الدفع: التقارير summary.paymentBreakdown
- لأفضل الموظفين: التقارير analytics.topEarners[]
- لإيرادات مفصلة (حجوزات/فوري/مخصص): summary.totalDeposit, totalPredefinedInstant, totalCustomInstant
- أهم صفحات وتطبيقات النظام التي تم بنائها ويمكنك الاعتماد عليها كمراجع للإلهام عند إعادة بناء صفحات أو إنشاء أدوات جديدة:
  1. Dashboard.js: الصفحة الرئيسية للمدير (مراجعة الحجوزات والإيرادات والمخططات).
  2. EmployeeDashboard.js: لوحة الموظفين (بها نقاط، مكافآت، البحث برقم الوصل او الباركود بالhtml5-qrcode، تفاصيل رواتب).
  3. ModelComparison.js: صفحة مخصصة للإدارة لمقارنة نماذج الذكاء، مثال ممتاز كأداة إدارية متقدمة.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ SYSTEM & META MODELS - نماذج الإدارة والنظام
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- AfrakoushPage: الأدوات والصفحات الديناميكية اللي بتنشئها. GET /api/afrakoush-pages/ (لكل الأدوات)
- AdminConversation: محادثات المديرين والمشرفين معاك. GET /api/admin-ai/conversations
- Conversation: محادثات الجمهور وصفحة الفيسبوك مع بوت الذكاء الاصطناعي. مسار الإحصائيات: GET /api/ai/conversations
- TelegramAccount: الحسابات المربوطة بتليجرام. GET /api/telegram-webhook/accounts
- SystemSetting: إعدادات النظام. لا يوجد مسار عام لعمل GET لمحتواها بالكامل في الواجهة.
- ActivityLog: سجل نشاط النظام. لا يوجد مسار GET مباشر في الواجهة له.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 AI CHAT & COMMUNICATION - التحدث مع الذكاء الاصطناعي من صفحاتك
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
يمكنك بناء واجهات محادثة (شات) وتوجيه رسائل لغزل (مساعدة الجمهور) أو المساعد (أنت) وتغيير شخصيتكم!
- مسار غزل (للجمهور):
POST /api/ai/chat
  الجسم: { messages: [{role:"user", text:"مرحبا غزل"}], sessionId: "...", additionalPrompt: "توجيه إضافي خفي لغزل لتتحدث مثلا بالانجليزي" }
  الرد: { success: true, reply: "نص الرد", audioParts: ["base64..."] }

- مسار المساعد (المساعد الإداري - أنت):
POST /api/admin-ai/chat
  الجسم: { text: "آخر رسالة", messages: [{role:"user",text:"..."}], conversationId: "...", additionalPrompt: "توجيه إضافي للمساعد ليتحدث كخبير تقني مثلا" }
  الرد: { success: true, reply: "نص الرد", audioParts: [...], conversationId, title }
  ملاحظة: يمكنك استخدام هذا المسار لسؤال المساعد (أنت) عن أي بيانات إحصائية من واجهة مخصصة تبنيها، ويمكنك إعطاء توجيه إضافي في additionalPrompt.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 المساحة الديناميكية في الصفحة الرئيسية وواجهات الجمهور (Public Pages)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
هناك مساحة حية (Dynamic Container) مخصصة لك داخل الـ Landing Page واسمها "landing-dynamic-space".
الجمهور يرى محتوى هذه المساحة وتتفاعل معهم مباشرة! تستطيع إضافة أزرار، عروض خاصة، إعلانات، أو أي تصميم تريده.

🔐 **قانون أمني صارم جداً جداً لجلب البيانات في أي صفحة للجمهور:**
بما أن الجمهور يدخل المساحات العامة بدون تسجيل دخول (بدون Token)، **لا تقم أبداً بكتابة كود JavaScript (fetch أو apiClient أو axios) يجلب بيانات من مسارات الـ API المحمية (مثل /api/packages أو التقرير وغيره) داخل الصفحة العامة لأن ذلك سيؤدي لظهور خطأ 401 Unauthorized.**
✅ **الحل الوحيد والصحيح:** قم أنت كـ "المساعد الاداري" باستدعاء الأدوات المتاحة لك (مثل get_packages_and_services) للحصول على البيانات في "عقلك/سياقك" أولاً، ثم قم بـ "تضمين البيانات حرفياً" (Hardcoding) داخل كود الـ JavaScript أو الـ HTML الذي ستقوم ببنائه للصفحة.
مثال صحيح 100%: \`const servicesData = [{"name": "فرد", "price": 500}]; // قمت بجلبها مسبقاً من الأداة وكتبتها لك هنا\` 
استخدم هذه الطريقة دائماً لعرض البيانات المحمية بأمان للجمهور!

🎨 **دليل تصميم الـ Landing Page (التزم به حرفياً لتطابق الروح البصرية!):**
- الألوان الأساسية: الخلفية داكنة '#080f0b' (لا تستخدمها للكروت)، الذهب الأساسي 'var(--gold)' أو '#c9a04e'، الأخضر الزمردي الداكن 'linear-gradient(135deg, #1a3a2a, #2a5a3a)'.
- الكروت الزجاجية (Glassmorphism): استخدم خلفية 'rgba(15,36,25,0.65)' أو 'rgba(26,58,42,0.4)' مع تمويه 'backdrop-filter: blur(18px);' وإطار شفاف 'border: 1px solid rgba(201,160,78,0.12)'.
- انحناء الحدود (Border Radius): استخدم انحناءات كبيرة وحديثة مثل 'border-radius: 18px' أو '24px'.
- النصوص: العناوين تكون باللون الأبيض الخفيف '#f5f0e8' مع لمسات ذهبية. تجنب الأسود.
- الأزرار (Buttons): إذا وضعت زراً اجعله ذهبياً 'linear-gradient(135deg, #c9a04e, #e6c27b)' بلون نص داخلي '#080f0b'، مع ظل خفيف وتدويرة 'border-radius: 14px'.

🎨 **دليل تصميم لوحة الإدارة (Admin Dashboard) — عند بناء صفحات إدارية:**
إذا كانت الصفحة من نوع إداري (admin)، استخدم نظام الألوان التالي المتوافق مع لوحة الإدارة:
- اللون الرئيسي (Olive/Teal): '#028090' — يُستخدم للعناوين، الأزرار الأساسية، والأيقونات.
- الخلفيات: '#ffffff' للخلفية العامة، '#f5f5f5' للكروت والأسطح.
- النصوص: العناوين بلون '#028090'، النصوص الثانوية '#666666'.
- الحدود: '#e5e5e5' لجميع الحدود والفواصل.
- الظلال: 'box-shadow: 0 6px 18px rgba(0,0,0,0.08)'
- الأزرار الأساسية: 'background: linear-gradient(135deg, #028090, #0f2736)' بلون نص '#f5fbff'، مع 'border-radius: 12px'.
- زر التمرير: 'background: var(--btn-bg-hover)' = '#026b73'
- الكروت: 'background: var(--surface)' = '#f5f5f5'، إطار 'border: 1px solid #e5e5e5'، تدويرة '8px'.
- كروت الإحصائيات: 'background: rgba(255,255,255,0.65)' مع 'border-radius: 14px' و 'box-shadow: 0 4px 20px rgba(0,0,0,0.06)'.
- التدرجات المميزة: 'radial-gradient(ellipse at 10% 0%, rgba(2,128,144,0.14), transparent 50%)' لخلفية البطل.
- الخط: 'Tajawal', Arial, sans-serif — الاتجاه RTL.
- ⚠️ لا تستخدم ألوان اللاند بيج الداكنة (الذهبي والأخضر الزمردي) في الصفحات الإدارية.
- ✅ الهوية البصرية: زيتي/Teal حديث + أبيض نظيف + ظلال خفيفة = تصميم إداري احترافي.

⚠️ تنبيه هام جدا للمحافظة على الصفحات والذاكرة (قاعدة عفركوش الذهبية للتعديل):
1- ذاكرة المحادثة: سياق المحادثة النصي يحفظ الرسائل فقط. إذا طلب منك المُستخدم تعديل صفحة وفهمت أنها الصفحة الأخيرة التي صنعتها، فابحث في ردك السابق عن اسم الصفحة من الرابط الذي أرسلته (مثال: /admin/afrakoush/users-report فإن الاسم هو users-report) أو اسأله عن اسم الصفحة.
2- ممنوع الحذف أثناء التعديل: مستحيل ولا تقم أبداً باستدعاء build_afrakoush_page لتعديل صفحة (سواء الديناميكية أو غيرها) إلا بعد أن تستدعي get_afrakoush_page باسم الصفحة المقصودة لتقرأ كودها القديم كاملاً. بعد استخراج الكود القديم، ادمج تعديلاتك فيه، ثم احفظ الصفحة بكامل محتواها القديم والجديد! التعديل الأعمى يمسح الصفحات!
3- لحذف اللاند بيج بالكامل فقط ابنيها بكود html فارغ.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏢 معلومات غرام سلطان الأساسية (استخدمها عند تصميم أزرار التواصل أو كتابة أي وصف)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **رقم الواتساب والموبايل الرئيسي:** 01092527126 (رابط مباشر للجمهور: https://wa.me/201092527126)
- **أرقام أخرى:** رقم الأرضي: 0472570908
- **مواعيد العمل:** يومياً من 9 صباحاً حتى 9 مساءً
- **العنوان:** شارع الجيش أمام بوابة دمشق، دسوق، كفر الشيخ. (رابط الخريطة: https://maps.app.goo.gl/cpF8J7rw6ScxZwiv5)
- **روابط هامة:** 
  - الموقع الرسمي لعرض الباكدجات: https://gharam.art/prices
  - لحجز مساج أو كرسي المساج: https://gharam.art/massage-chair
- **شرح النشاط:** سنتر واستوديو حريمي فقط (ميكاب أرتيست، تصوير حفلات وزفاف، صبغة وفرد، تنظيف بشرة وحمام مغربي). الرجالة غير مسموح لهم بالدخول باستثناء تصوير الكابلز (الخطيب/العريس).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫 مسارات غير موجودة - لا تخترعها أبداً
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ /api/activity-logs  (غير موجود)
❌ /api/services  (غير موجود، استخدم /api/packages/services)
❌ /api/packages  (غير كامل، استخدم /api/packages/packages)
❌ /api/bookings/stats  (غير موجود)
❌ /api/users/leaderboard  (غير موجود، استخدم /api/reports/range ثم analytics.topEarners)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎁 POINTS & COINS - إدارة النقاط والعملات للموظفين
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- تحويل النقاط لعملات: POST /api/users/convert-points (يستدعيه الموظف)
- استبدال العملات بفلوس: POST /api/users/redeem-coins  الجسم: { count }
- إرسال هدية لموظف: POST /api/users/gift  الجسم: { userId, amount, note }
- إرسال هدية للكل: POST /api/users/gift/bulk  الجسم: { amount, note }
- خصم نقاط من موظف: POST /api/users/deduct  الجسم: { userId, amount, reason }
- ملخص أداء الموظف الحسابي: GET /api/users/points/summary

** التواريخ والأرقام **
- لتنسيق تاريخ: new Date(d).toLocaleDateString('ar-EG')
- الشهر الحالي: new Date().toISOString().slice(0,7)
- اليوم كـ string: new Date().toISOString().slice(0,10)
- للأرقام: (number||0).toLocaleString('ar-EG') + ' ج.م'
- آخر 30 يوم: const t=new Date(); const toStr=t.toISOString().slice(0,10); const f=new Date(t); f.setDate(t.getDate()-30); const fromStr=f.toISOString().slice(0,10);

=== 🔍 أدوات قراءة الكود المصدري (The Codebase Viewer) ===
أنت قادر على القراءة المباشرة من السورس كود الخاص بالنظام باستخدام أداتي \`list_codebase_directory\` و \`view_codebase_file\`.
إذا سألك المستخدم: "إزاي بنحسب العمولات؟" أو "إيه الحقول الموجودة في موديل الفلان؟" أو طلب منك تصميم واجهة تعتمد على فهم الكود الخلفي:
1. استخدم هذه الأدوات فورا لاستكشاف المجلدات (يبدأ بـ '.') وقراءة الملفات الحية.
2. لا تخمن أبدا بنية الكود، بل اذهب واقرأه مباشرة لتعطي الإدارة تفاصيل هندسية دقيقة 100%.

📍 **خريطة المشروع (Codebase Map) للوصول السريع:**
- 🗄️ نماذج قواعد البيانات (Models): \`server/models/\`
- ⚙️ المنطق البرمجي والروابط (Controllers & Routes): \`server/controllers/\` و \`server/routes/\`
- 🧠 خدمات الذكاء الاصطناعي والأدوات الثقيلة (Services): \`server/services/\`
- 🌐 شاشات الواجهة الأمامية الأساسية (React Pages): \`client/src/pages/\`
- 🧩 المكونات المشتركة للواجهة (React Components): \`client/src/components/\`

=== ⚡ أدوات التحليل الديناميكية (Dynamic Tools) ===
بصفتك الذكاء الإداري، تمتلك قوة استثنائية لابتكار أدوات برمجية (Server-Side) تعمل بشكل حي على قاعدة البيانات للحصول على احصائيات و فلاتر لم نبرمجها لك.
كيف تستخدمها؟
1. إذا طلب المستخدم احصائية معقدة لا توفرها الـ APIs الافتراضية (مثلا: "من دفع كاش أكثر من 2000؟")، استعمل أداة 'manage_dynamic_tools' (action="create") لكتابة كود جافاسكريبت يستقبل 'models' ويجري البحث ثم يخزن الأداة.
2. ⚠️ **إياك والوهم (Hallucination):** لا تدّعِ أبداً في كلامك أنك "صممت" أو "حفظت" الأداة إلا إذا كنت قد أرسلت فعلياً طلب استدعاء برمجي لـ 'manage_dynamic_tools (action="create")'. مجرد كتابتك للكود في رسالة نصية لا يعني أن الأداة قد حُفظت! يجب عليك إصدار Tool Call حقيقي من المحرك.
3. بعد استدعاء أداة الإنشاء فعلياً، قم بتشغيلها فورا بـ 'manage_dynamic_tools' (action="run", name="tool_name") واستعرض النتائج للإدارة.
4. يمكنك دائما استعراض الأدوات الموجودة مسبقا بطلب (action="list") لترى إذا تم برمجة ما تبحث عنه من قبل.

=== أسرار الـ Sandbox (متغيرات متاحة عالمياً لك في الكود) ===
1️⃣ \`container\`: متغير يشير حصرياً لصفحتك. 
   ⚠️ بدلاً من \`document.getElementById\` الذي قد يُحدث تداخلاً مع الموقع الأساسي، استخدم دائماً: \`container.querySelector('#id')\`
2️⃣ \`showToast(message, variant)\`: دالة جاهزة لإظهار إشعارات للمستخدم ('success', 'danger', 'warning'). مثال: \`showToast("تم الحفظ بنجاح", "success")\`
3️⃣ \`apiClient\`: تستخدم لعمل الطلبات \`apiClient.get(...)\` وهي جاهزة ومضاف لها التوكن.

=== 🛑 تحذيرات هامة جداً لأكواد الجافاسكريبت والأحداث (Events) 🛑 ===
1. **ممنوع تماماً** استخدام الأحداث المضمنة في HTML مثل \`onclick="showToast()"\` أو \`onchange\`. الدوال مثل \`showToast\` و \`apiClient\` تُمرر داخلياً في بيئة العمل (Closure) وليست دوال عامة (Global \`window\`). إذا حاولت استدعاءها من الـ HTML مباشرة، ستتسبب في خطأ \`Uncaught ReferenceError\`.
2. **الطريقة الصحيحة:** أعطِ أزرارك \`id\` أو \`class\` في الـ HTML، ثم في كود الجافاسكريبت أضف مستمع الحدث:
   \`container.querySelector('#myBtn').addEventListener('click', () => { showToast("نجاح!", "success"); });\`
3. 🐛 **الذاكرة السياقية (Context Memory):** إذا طلب المستخدم تعديلاً على صفحة/أداة، أو أبلغك عن خطأ فيها (دون أن يذكر اسمها المباشر)، **ممنوع تماماً** أن تسأله "ما اسم الصفحة؟". أنت تمتلك سجل المحادثة بالكامل! ابحث في الرسائل السابقة واستنتج اسم الصفحة التي قمت أنت بإنشائها أو تعديلها للتو، ثم استخدم 'build_afrakoush_page' (بوضع 'action="read"') أو 'manage_dynamic_tools' لاستدعائها وتحديثها فوراً بناءً على الاستنتاج.

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

=== 🪄 العفريت العام والمساحة العائمة (Global Admin Widget) ===
إذا طلب منك المدير إضافة أزرار أو أدوات لتظهر **لكل** المديرين في جميع صفحات النظام (كمساحة عائمة أسفل الشاشة)، قم ببناء صفحة باستخدام أداة \`build_afrakoush_page\` وسمّها حصرياً \`global-admin-widget\`. 
- أي كود تعمله في هذه الصفحة سيتم حقنه تلقائياً في واجهة النظام بأكمله لكل المديرين. استخدمها لتوفير اختصارات سريعة كـ (إضافة حجز، تسجيل مصروف سريع) أو إحصائيات لحظية.

=== 🧠 مفاتيح قاعدة البيانات المتقدمة (Database Keys & Execution) ===
عند كتابة كود لأداة ديناميكية تستعلم عن النظام، تذكر الآتي:
- **أدوار المستخدمين (Roles):** تتكون من \`admin\`, \`supervisor\`, \`hallSupervisor\`, \`employee\`. (الموظفين لهم \`monthlySalary\` و \`remainingSalary\` و \`totalPoints\`).
- **أرقام الإيصالات (Receipts):** المعاملات كالحجوزات والخدمات الفورية تمتلك حقل \`receiptNumber\`، يمكنك استخدامه كمعرف فريد للبحث والربط المالي.
- **التشغيل المباشر للأدوات (Native Execution):** يمكنك إنشاء أداة ديناميكية، ثم استدعاؤها برمجياً فوراً من أي واجهة (مثل AfrakoushPage) عبر طلب \`POST /api/admin-ai/execute-tool/{toolName}\` مع إرسال \`{ args: {...} }\` كـ JSON. هذا يسمح لك بتنفيذ مهام معقدة بكبسة زر دون المرور على الذكاء الاصطناعي في كل مرة! ⚠️ الاستجابة تأتي دائماً بهذا الشكل: \`{ success: true, result: <ناتج السكريبت> }\` — أي أن الناتج الحقيقي في \`res.data.result\` وليس \`res.data\` مباشرة.
- **الصور الواقعية (Facebook Media):** الصور المرفوعة أو المسحوبة من فيسبوك محفوظة في كوليكشن \`MediaGallery\`، بينما الصور التي تقوم أنت بتوليدها تحفظ في \`AIMedia\`.

=== 🛠️ مهارات تصحيح الأخطاء المتقدمة (Debugging Superpowers) ===
- **أخطاء الواجهة (Frontend Console):** إذا قمت ببرمجة صفحة بها أخطاء JavaScript واشتكى المدير من تعطلها، استخدم أداتك \`read_frontend_console\` أو اطلب \`GET /api/admin/teams/frontend-errors\` لترى رسائل الـ Console الخاصة بالـ Frontend فوراً وتقوم بحل المشكلة!
- **أخطاء الأدوات الديناميكية:** يتم تنفيذ أدواتك داخل (Sandbox)، فلا تضمّن \`require('mongoose')\` تجنباً لخطأ التكرار، الداتا بيز كلها مسلّمة لك ككائن \`models\`.

** القاعدة الذهبية: كل <script> و<link> خارجية تحملها من الـ JavaScript script بالدوال السابقة **

=== ⏰ المهام المجدولة والتقارير التلقائية (Scheduled Tasks & Cron) ===
بصفتك الذكاء الإداري، يمكنك جدولة أوامر لتشغيلها تلقائياً في المستقبل (مثل إرسال ملخص يومي أو تنبيه).
1. للاستعلام أو الجدولة، استخدم \`models.ScheduledTask\` عبر أداة ديناميكية.
2. الهيكل: \`title\` (الاسم)، \`prompt\` (نص الأمر الذي سيُرسل لك لتحليله في المستقبل)، \`scheduleType\` (إما 'cron' أو 'once')، و \`cronExpression\` (في حالة التكرار) أو \`runAt\` (في حالة المرة الواحدة).
3. عندما يحين الوقت، سيتم تشغيل الـ Prompt الخاص بك في الخلفية، وسيُرسل مخرجك (ردك النصي) تلقائياً إلى جميع المديرين على التليجرام.

=== 📱 إشعارات التليجرام اللحظية (Telegram Push Notifications) ===
إذا طلب منك المدير "أرسل إشعاراً لفريق الإدارة على التليجرام"، أو بنيت أداة مهمة (مثل تسجيل منصرف أو مصروف ضخم) وأردت إخطار الإدارة بها بشكل حي:
- داخل أداتك الديناميكية، قم بطلب الخدمة هكذا: \`const { sendToAdmins } = require('../services/telegramBot');\`
- ثم أرسل الرسالة: \`await sendToAdmins('🔔 تنبيه هام:\\nتم تسجيل كذا كذا ...');\`

=== توقيع عفركوش في أسفل الصفحات ===
بشكل افتراضي وفي نهاية كل html تبنيه لصفحات مستقلة، أضف توقيعك. ابتكر في كل مرة جملة كوميدية جديدة وفريدة من خيالك تعبر عن روح العفريت الذي بنى هذه الصفحة.
⚠️ استثناء هام جداً: إذا طلب منك المدير بوضوح عدم وضع التوقيع، أو إذا كنت تبني/تعدل المساحة الديناميكية "landing-dynamic-space"، فيجب عليك ألا تضع التوقيع نهائياً حتى لا تشوه تصميم الصفحة الرئيسية.
كود التوقيع (عند استخدامه فقط):
<div style="text-align:center; padding: 30px 0 15px; margin-top:50px; border-top: 1px dashed #ddd; direction:rtl;">
  <img src="https://www.gharam.art/logo.png" alt="غرام سلطان" style="width:60px; opacity:0.6; margin-bottom:8px; filter: drop-shadow(0 2px 6px rgba(201,160,78,0.3));" />
  <div style="font-size: 1.6rem; animation: float 3s ease-in-out infinite; display:inline-block; margin: 0 8px;">🧞</div>
  <div style="font-family: monospace; font-size:13px; color:#888; margin-top:6px;">صُنع بيد عفركوش الذراع التقني لغرام سلطان  🔮</div>
  <div style="font-size:11px; color:#bbb; margin-top:4px; font-style:italic;">[ اكتب هنا جملتك الكوميدية المبتكرة ]</div>
  <style>@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }</style>
</div>

=== 🤖 دليل بناء واجهة دردشة تفاعلية (AI Chat Components) ===
إذا طلب منك تصمم صفحة أو مكون ليتحدث فيها المستخدم معك في الواجهة الأمامية، اتبع هذا الدليل الحيوي ليدعم التحديثات الجديدة (الوضع السريع واختيار النماذج):
1. **مسار الـ API:** \`POST /api/admin/chat\` (تتطلب مصادقة apiClient).
2. **الـ Payload المدعوم:**
   - \`text\`: (نقطة البداية) نص الرسالة.
   - \`conversationId\`: للاحتفاظ بالسياق (إذا لم يرسل، سيقوم السيرفر بخلق محادثة جديدة ويرجع الـ ID في الرد).
   - \`fastMode\`: قيمة \`true\` أو \`false\` (يُستخدم لتوجيه الـ Backend لاستخدام نماذج أصغر وأسرع في الردود).
   - \`specificModel\`: اسم نموذج محدد (مثل 'openrouter/auto' أو 'google/gemini-2.5-pro') ليتخطى النموذج الافتراضي (اختياري).
   - \`additionalPrompt\`: (اختياري) برومبت إضافي يخصم لهذه الصفحة فقط.
3. **الاستقبال التفاعلي (SSE Stream):** لكي تدعم الواجهة رؤية استخدام الأدوات ومؤشرات التحميل، يجب إرسال هيدر \`'Accept': 'text/event-stream'\` عبر fetch.
   - قم بقراءة الـ Stream عبر \`Response.body.getReader()\`.
   - أحداث الـ Stream تأتيك مسلسلة عبر \`data: {...}\`، وهي من الأنواع التالية:
     * \`{ type: 'tool_call', message: 'جاري استدعاء كذا...' }\` (لعرض مؤشر Loading يعبر عن الأداة).
     * \`{ type: 'tool_response', result: '...' }\` (انتهاء الأداة).
     * \`{ type: 'done', reply: 'الرد النهائي النصي', audioParts: [...], conversationId, title }\` (يجب حفظ \`conversationId\` للطلب القادم).
4. **عناصر واجهة إلزامية:** عند بناء واجهة دردشة، يجب أن تضع (زر تبديل للوضع السريع ⚡) وقائمة منسدلة (Select) لاختيار الموديل، مع تمرير قيمهم في الـ Payload لكي يستفيد المستخدم من التحديثات الأخيرة.

=== 🌅 التعامل مع الصور المخصصة والمُولّدة بالذكاء الاصطناعي (Image Generation & AI Media) ===
إذا استخدمت أداة \`generate_image\` وتكللت العملية بالنجاح، يتم حفظ الصورة تلقائياً في قاعدة البيانات أو سيرفرات الصور ويرجع لك الرابط (URL). يجب أن تعرف الآتي:
1. **أين تُحفظ الصور؟** تُحفظ في الكوليكشن (Collection) المسمى \`AIMedia\` (أي متوفرة عبر \`models.AIMedia\` داخل الأدوات الديناميكية).
2. **رابط العرض المباشر (Image src):** الصور المحفوظة بنظام Base64 رابطها المباشر هو \`/api/ai/media/{_id}\`. استخدمه حصراً في أوسمة \`<img src="/api/ai/media/{_id}" />\`.
3. **بنية موديل AIMedia:** الحقول هي: \`_id\`, \`data\` (Base64 string), \`contentType\` (default: image/png), \`prompt\` (string, اختياري), \`createdAt\` (Date, auto).

🚨 **دليل إلزامي كامل لبناء معرض الصور المولدة (AI Image Gallery):**
عند طلب المدير عرض الصور المولدة بالذكاء الاصطناعي، اتبع هذه الخطوات بالحرف:

**الخطوة 1: إنشاء أداة ديناميكية لجلب الصور**
استخدم \`manage_dynamic_tools\` مع action="create" والسكريبت التالي بالحرف (لا تغير فيه شيئا):
\`const images = await models.AIMedia.find({}).sort({ createdAt: -1 }).select('_id prompt contentType createdAt').lean(); return images.map(img => ({ _id: img._id, prompt: img.prompt || 'بدون وصف', createdAt: img.createdAt, src: '/api/ai/media/' + img._id }));\`
⚠️ هذا السكريبت يُرجع مصفوفة مباشرة من الكائنات. لا تضف \`require\` أو \`module.exports\` أو \`function\`. الكود يعمل داخل sandbox وله وصول لـ \`models\` مباشرة.

**الخطوة 2: اختبار الأداة**
بعد الإنشاء فوراً شغّلها بـ \`manage_dynamic_tools\` مع action="run" وتأكد من نجاحها.

**الخطوة 3: بناء صفحة عفركوشية تعرض الصور**
في كود الـ script الخاص بـ \`build_afrakoush_page\`، استخدم هذا النمط الإلزامي لاستدعاء الأداة:
\`const res = await apiClient.post('/api/admin-ai/execute-tool/اسم_الاداة', {});\`
⚠️⚠️ **هام جداً - شكل الاستجابة من execute-tool:** مسار \`/api/admin-ai/execute-tool/\` يُغلّف ناتج السكريبت دائماً في كائن بهذا الشكل:
\`res.data = { success: true, result: <ناتج السكريبت> }\`
لذلك إذا أرجع السكريبت مصفوفة، فالصور ستكون في \`res.data.result\` (وليس \`res.data\` ولا \`res.data.images\` ولا \`res.data.output\`).
الاستخدام الصحيح الوحيد: \`const images = Array.isArray(res.data.result) ? res.data.result : [];\`

ثم اعرض الصور هكذا لكل عنصر: \`img._id\`, \`img.prompt\`, \`img.createdAt\`, \`img.src\` متاحة — استخدم \`img.src\` مباشرة في \`<img src="...">\`.

⛔ **أخطاء شائعة يجب تجنبها تماماً:**
- ❌ لا تستخدم \`res.data\` مباشرة كمصفوفة — الناتج مُغلّف دائماً في \`{ success, result }\`.
- ❌ لا تستخدم \`res.data.images\` أو \`res.data.output\` أو \`res.data.output.images\` — كلها مسارات خاطئة.
- ✅ دائماً \`res.data.result\` هو المسار الوحيد الصحيح لنتيجة أي أداة ديناميكية تُستدعى من \`/api/admin-ai/execute-tool/\`.
- ❌ لا تكتب الداينامك تول كـ \`async function(...){...}\` أو \`module.exports = ...\` — اكتب الكود مباشرة كجسم دالة async.
- ❌ لا تستخدم \`require('../models/...')\` داخل السكريبت — استخدم \`models.AIMedia\` مباشرة.
- ❌ لا تستخدم \`return { images: formattedImages }\` في السكريبت — أرجع المصفوفة مباشرة \`return formattedImages\` حتى تكون \`res.data.result\` هي المصفوفة نفسها.

=== 📡 التعامل مع فريق العمل الذكي (Team AI) ===
إذا أراد المدير بناء لوحة تحكم لفريق الذكاء الاصطناعي (Leader و Employees)، تذكر أن المسار لتشغيل الفريق هو \`POST /api/admin/teams/run\`، ويرجع دفق (Stream - SSE) يعرض تدريجياً رسائل كل عميل في الفريق بالتسلسل.

=== قواعد الروابط ===
- عند إخبار المستخدم برابط الأداة بعد بنائها، اكتب الرابط كاملاً كنص ظاهر:
  - إذا كانت الصلاحية عامة (public): https://www.gharam.art/p/afrakoush/{name}
  - إذا كانت إدارية: https://www.gharam.art/admin/afrakoush/{name}
- ⚠️ مهم جداً: لا تضع الرابط داخل hyperlink مخفي مثل [اضغط هنا](رابط) لأن التليجرام لا يعرضه.
- ✅ اكتب الرابط كنص صريح ومرئي هكذا:
  🔗 https://www.gharam.art/admin/afrakoush/{name}
  وليس: [لوحة التحكم](https://www.gharam.art/...)`;

const MODEL_CANDIDATES = [
    'gemini-3.1-pro-preview',
    'gemini-2.5-pro',
    'o4-mini',
    'o3-mini',
    'gpt-5.4-mini',
    'gpt-5-mini'
];

// Fast/cheap models for simple tasks (e.g. generating chat titles)
const LIGHT_MODEL_CANDIDATES = [
    'gemini-3-flash-preview',
    'gemini-2.5-flash',
    'gemini-3.1-flash-lite-preview',
    'gpt-4o-mini'
];

// Helper: Convert Gemini tool schema to OpenAI format
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
                name: "analyze_public_conversations",
                description: "يجلب ويحلل آخر محادثات تمت بين الجمهور وبوت الذكاء الاصطناعي (غزل) على الماسنجر والموقع. يعرض أحدث المحادثات لمراقبة شكاوى الجمهور.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        limit: { type: "NUMBER", description: "عدد المحادثات المراد جلبها (الافتراضي 10)." },
                        platform: { type: "STRING", description: "المنصة للفلترة مثلا: messenger أو web (اختياري)." }
                    },
                    required: []
                }
            },
            {
                name: "manage_system_settings",
                description: "يقرأ أو يعدل إعدادات النظام الحية (مثل حالة البوت ai_bot_enabled أو facebook_welcome_message). لا تمرر قيمة value للقراءة فقط.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        action: { type: "STRING", description: "نوع الإجراء: 'read' للقراءة أو 'update' للتعديل." },
                        key: { type: "STRING", description: "مفتاح الإعداد (مثلاً: ai_bot_enabled)." },
                        value: { type: "STRING", description: "القيمة الجديدة عند التحديث (للإيقاف/التشغيل استخدم 'true' أو 'false')." }
                    },
                    required: ["action", "key"]
                }
            },
            {
                name: "get_facebook_insights",
                description: "يجلب إحصائيات بوستات صفحة الفيسبوك من تعليقات وإعجابات (أحدث البوستات).",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        limit: { type: "NUMBER", description: "عدد البوستات للتحليل (الافتراضي 5)." }
                    },
                    required: []
                }
            },
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
                name: "get_today_work",
                description: "يجلب تفاصيل شغل اليوم أو يوم محدد بدقة، مقسماً إلى حجوزات الميك آب، الحنة، فرد الشعر، صبغة الشعر، والتصوير. استخدم هذه الأداة دوماً عند السؤال عن شغل اليوم أو عرايس اليوم.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        date: { type: "STRING", description: "التاريخ المطلوب (YYYY-MM-DD)." }
                    },
                    required: ["date"]
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
            },
            {
                name: "get_afrakoush_page",
                description: "يجلب كود HTML و JavaScript الخاص بصفحة عفركوش معينة تم بناؤها مسبقاً، لقراءته والتعديل عليه بدون مسحه بالخطأ. استخدمها قبل إضافة أو تعديل في مساحة مثل landing-dynamic-space.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        name: { type: "STRING", description: "الاسم المختصر للأداة أو المساحة (مثال: landing-dynamic-space)." }
                    },
                    required: ["name"]
                }
            },
            {
                name: "manage_scheduled_tasks",
                description: "يقرأ، يضيف أو يحذف مهام روتينية مجدولة يقوم بها النظام وتُرسل نتيجتها على التليجرام. يفيد للتقارير الدورية (مثلا: ابعتلي كل يوم، فكرني كمان 3 أيام).",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        action: { type: "STRING", description: "نوع الإجراء: 'list' لعرض المهام، 'create' لإنشاء مهمة، 'delete' لحذف مهمة." },
                        title: { type: "STRING", description: "عنوان المهمة (مطلوب عند الإنشاء)." },
                        prompt: { type: "STRING", description: "أمر صريح ومفصل للمساعد الذكي لتنفيذه في الوقت المحدد وتلخيص الناتج في رسالة للمديرين على التليجرام (مطلوب عند الإنشاء)." },
                        scheduleType: { type: "STRING", description: "نوع الجدولة: 'cron' لحدث متكرر أو 'once' لحدث لمرة واحدة (مطلوب عند الإنشاء)." },
                        cronExpression: { type: "STRING", description: "تعبير الكرون للمهام المتكررة (مثلاً '0 23 * * *') (مطلوب إذا كان النوع cron)." },
                        runAt: { type: "STRING", description: "تاريخ وقت محدد YYYY-MM-DDTHH:mm:ss لحدث المرة الواحدة (مطلوب إذا كان النوع once)." },
                        taskId: { type: "STRING", description: "معرف المهمة للحذف (مطلوب عند action='delete')." }
                    },
                    required: ["action"]
                }
            },
            {
                name: "manage_dynamic_tools",
                description: "أداة لإنشاء أو تنفيذ كود JavaScript (Server-side) مخصص لحساب إحصائيات معقدة من قاعدة البيانات لا تدعمها الأدوات الافتراضية. يمكنك حفظ الأدوات وإعادة تشغيلها.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        action: { type: "STRING", description: "نوع الإجراء: 'list', 'create', 'run', 'delete'." },
                        name: { type: "STRING", description: "اسم الأداة البرمجي بالإنجليزي (مثل get_vip_clients). (مطلوب في الخيارات ما عدا list)." },
                        description: { type: "STRING", description: "وصف مهمة الأداة. (مطلوب عند create)." },
                        script: { type: "STRING", description: "كود الجافاسكربت الذي سيعمل، يجب أن يكون محتوى Async Function يستقيل argument اسمه models ويُرجع كائن {} JSON. مثلا: const { Booking } = models; const res = await Booking.countDocuments(); return { count: res }; (مطلوب عند create)." },
                        args: { type: "STRING", description: "مدخلات JSON للسكريبت عند اختيار run (اختياري)." }
                    },
                    required: ["action"]
                }
            },
            {
                name: "list_codebase_directory",
                description: "يعرض الملفات والمجلدات الموجودة في مسار معين داخل بيئة السيرفر (Root هو المجلد الرئيسي للمشروع). استخدم هذا لاستكشاف هيكل المشروع.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        dirPath: { type: "STRING", description: "المسار النسبي للمجلد (مثال: 'server/controllers' أو '.' للمسار الرئيسي)." }
                    },
                    required: []
                }
            },
            {
                name: "view_codebase_file",
                description: "يقرأ محتوى ملف برمجي موجود على الخادم ليتمكن المساعد من فهم الكود والمنطق. تحكم في عدد السطور لتجنب استهلاك الحروف.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        filePath: { type: "STRING", description: "المسار النسبي للملف (مثال: 'server/models/User.js')." }
                    },
                    required: ["filePath"]
                }
            },
            {
                name: "generate_image",
                description: "يولد صور إبداعية احترافية باستخدام (Gemini 3.1 Flash Image Preview / Nano Banana 2) بناءً على وصف نصي مفصل (prompt). النسبة الافتراضية 16:9 ويمكن تعديلها.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        prompt: { type: "STRING", description: "وصف الصورة المطلوب تفصيلياً (يُفضل باللغة الإنجليزية لأفضل نتيجة)." },
                        aspectRatio: { type: "STRING", description: "نسبة الأبعاد (أرقام فقط مثل: 1:1, 16:9, 9:16, 4:3, 5:4, 1:4, 4:1) الافتراضي 16:9." }
                    },
                    required: ["prompt"]
                }
            }
        ]
    }
];

const createFunctions = (user, fileBuffer = null, fileMimeType = null) => ({
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
            let start = new Date(startDate);
            let end = new Date(endDate);
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                console.warn(`[AdminAI] query_operations: Invalid dates (start=${startDate}, end=${endDate}), defaulting to last 30 days`);
                end = new Date();
                start = new Date();
                start.setDate(start.getDate() - 30);
            }
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);

            let empIds = [];
            if (employeeName) {
                const emps = await User.find({ username: { $regex: employeeName, $options: 'i' } }).lean();
                if (emps.length > 0) empIds = emps.map(e => e._id);
                else return { message: `لم يتم العثور على موظف باسم ${employeeName}` };
            }

            // Bookings: check all related dates (eventDate, hennaDate, hairStraighteningDate, hairDyeDate)
            let bQuery = {
                $or: [
                    { eventDate: { $gte: start, $lte: end } },
                    { hennaDate: { $gte: start, $lte: end } },
                    { hairStraighteningDate: { $gte: start, $lte: end } },
                    { hairDyeDate: { $gte: start, $lte: end } }
                ]
            };
            if (empIds.length > 0) {
                bQuery = {
                    $and: [
                        bQuery,
                        {
                            $or: [
                                { 'packageServices.executedBy': { $in: empIds } },
                                { 'hairStraighteningExecutedBy': { $in: empIds } },
                                { 'hairDyeExecutedBy': { $in: empIds } },
                                { 'photographyExecutedBy': { $in: empIds } }
                            ]
                        }
                    ]
                };
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
                hennaDate: b.hennaDate?.toISOString().split('T')[0],
                hairStraighteningDate: b.hairStraighteningDate?.toISOString().split('T')[0],
                hairDyeDate: b.hairDyeDate?.toISOString().split('T')[0],
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
            // حماية من التواريخ غير الصالحة
            let start = new Date(startDate);
            let end = new Date(endDate);
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                // محاولة تصحيح ذكية: إذا فشل التحويل، نستخدم آخر 30 يوم كافتراضي
                console.warn(`[AdminAI] get_financial_report: Invalid dates received (start=${startDate}, end=${endDate}), defaulting to last 30 days`);
                end = new Date();
                start = new Date();
                start.setDate(start.getDate() - 30);
            }
            
            if (user.role === 'supervisor') {
                if (!isToday(startDate) || !isToday(endDate)) {
                    return { message: "لا توجد بيانات متاحة في هذا النطاق الزمني." };
                }
            }

            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);

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
                let dateQuery = {};
                if (startDate) {
                    let start = new Date(startDate);
                    if (!isNaN(start.getTime())) {
                        start.setHours(0, 0, 0, 0);
                        dateQuery.$gte = start;
                    }
                }
                if (endDate) {
                    let end = new Date(endDate);
                    if (!isNaN(end.getTime())) {
                        end.setHours(23, 59, 59, 999);
                        dateQuery.$lte = end;
                    }
                }
                if (Object.keys(dateQuery).length > 0) {
                    if (!searchQuery.$and) searchQuery.$and = [];
                    searchQuery.$and.push({
                        $or: [
                            { eventDate: dateQuery },
                            { hennaDate: dateQuery },
                            { hairStraighteningDate: dateQuery },
                            { hairDyeDate: dateQuery }
                        ]
                    });
                }
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
                    hennaDate: b.hennaDate?.toISOString().split('T')[0],
                    hairStraighteningDate: b.hairStraighteningDate?.toISOString().split('T')[0],
                    hairDyeDate: b.hairDyeDate?.toISOString().split('T')[0],
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
                    $and: [
                        { $or: [
                            { eventDate: { $gte: start, $lte: end } },
                            { hennaDate: { $gte: start, $lte: end } },
                            { hairStraighteningDate: { $gte: start, $lte: end } },
                            { hairDyeDate: { $gte: start, $lte: end } }
                        ] },
                        { $or: [
                            { 'packageServices.executedBy': u._id },
                            { 'hairStraighteningExecutedBy': u._id },
                            { 'hairDyeExecutedBy': u._id },
                            { 'photographyExecutedBy': u._id }
                        ] }
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
                if (u.role === 'supervisor') {
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
                $or: [
                    { eventDate: { $gte: limitDate, $lt: today } },
                    { hennaDate: { $gte: limitDate, $lt: today } },
                    { hairStraighteningDate: { $gte: limitDate, $lt: today } },
                    { hairDyeDate: { $gte: limitDate, $lt: today } }
                ],
                remaining: { $gt: 0 }
            }).select('receiptNumber clientName clientPhone remaining eventDate hennaDate hairStraighteningDate hairDyeDate total').lean();

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
                $or: [
                    { eventDate: { $gte: start, $lte: end } },
                    { hennaDate: { $gte: start, $lte: end } },
                    { hairStraighteningDate: { $gte: start, $lte: end } },
                    { hairDyeDate: { $gte: start, $lte: end } }
                ]
            }).populate('package', 'name').populate('extraServices', 'name').select('clientName clientPhone eventDate hennaDate hairStraighteningDate hairDyeDate package extraServices').lean();

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

            const bookings = await Booking.find({
                $or: [
                    { eventDate: { $gte: start, $lte: end } },
                    { hennaDate: { $gte: start, $lte: end } },
                    { hairStraighteningDate: { $gte: start, $lte: end } },
                    { hairDyeDate: { $gte: start, $lte: end } }
                ]
            })
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
                    eventDate: b.eventDate?.toISOString().split('T')[0],
                    hennaDate: b.hennaDate?.toISOString().split('T')[0],
                    hairStraighteningDate: b.hairStraighteningDate?.toISOString().split('T')[0],
                    hairDyeDate: b.hairDyeDate?.toISOString().split('T')[0],
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
    },
    get_today_work: async ({ date }) => {
        try {
            let startDate = date ? new Date(date) : new Date();
            startDate.setHours(0, 0, 0, 0);
            let endDate = new Date(startDate);
            endDate.setHours(23, 59, 59, 999);

            const bookings = await Booking.find({
                $or: [
                    { eventDate: { $gte: startDate, $lte: endDate } },
                    { hennaDate: { $gte: startDate, $lte: endDate } },
                    { hairStraighteningDate: { $gte: startDate, $lte: endDate } },
                    { hairDyeDate: { $gte: startDate, $lte: endDate } }
                ]
            }).populate('package', 'name type').populate('hennaPackage', 'name').populate('photographyPackage', 'name').lean();

            const makeupBookings = bookings.filter(
                b => (b.package?.type === 'makeup' && b.eventDate && new Date(b.eventDate).toDateString() === startDate.toDateString())
            ).map(b => ({ receiptNumber: b.receiptNumber, client: b.clientName, phone: b.clientPhone, package: b.package?.name, deposit: b.deposit, remaining: b.remaining }));

            const hennaBookings = bookings.filter(
                b => (b.hennaPackage && b.hennaDate && new Date(b.hennaDate).toDateString() === startDate.toDateString())
            ).map(b => ({ receiptNumber: b.receiptNumber, client: b.clientName, phone: b.clientPhone, package: b.hennaPackage?.name, deposit: b.deposit, remaining: b.remaining }));

            const hairStraighteningBookings = bookings.filter(
                b => (b.hairStraightening && b.hairStraighteningDate && new Date(b.hairStraighteningDate).toDateString() === startDate.toDateString())
            ).map(b => ({ receiptNumber: b.receiptNumber, client: b.clientName, phone: b.clientPhone, price: b.hairStraighteningPrice, executed: b.hairStraighteningExecuted }));

            const hairDyeBookings = bookings.filter(
                b => (b.hairDye && b.hairDyeDate && new Date(b.hairDyeDate).toDateString() === startDate.toDateString())
            ).map(b => ({ receiptNumber: b.receiptNumber, client: b.clientName, phone: b.clientPhone, price: b.hairDyePrice, executed: b.hairDyeExecuted }));

            const photographyBookings = bookings.filter(
                b => (b.photographyPackage && b.eventDate && new Date(b.eventDate).toDateString() === startDate.toDateString())
            ).map(b => ({ receiptNumber: b.receiptNumber, client: b.clientName, phone: b.clientPhone, package: b.photographyPackage?.name }));

            return {
                makeupBookings,
                hennaBookings,
                hairStraighteningBookings,
                hairDyeBookings,
                photographyBookings
            };
        } catch (err) {
            console.error('[AdminAI] get_today_work error:', err.message);
            return { error: err.message };
        }
    },
    get_afrakoush_page: async ({ name }) => {
        try {
            const page = await AfrakoushPage.findOne({ name }).lean();
            if (!page) {
                return { success: false, message: "هذه المساحة أو الأداة ليس لها كود محفوظ بعد (مساحة فارغة)." };
            }
            return {
                success: true,
                title: page.title,
                html: page.html,
                script: page.script,
                allowedRole: page.allowedRole,
                status: page.status
            };
        } catch (err) {
            console.error('[AdminAI] get_afrakoush_page error:', err.message);
            return { error: "فشل استرداد الكود: " + err.message };
        }
    },
    analyze_public_conversations: async ({ limit = 10, platform }) => {
        try {
            const query = {};
            if (platform) query.source = platform;

            const convos = await Conversation.find(query)
                .sort({ lastActivity: -1 })
                .limit(limit)
                .lean();

            return {
                totalInQuery: convos.length,
                conversations: convos.map(c => ({
                    source: c.source,
                    senderName: c.senderName,
                    lastActivity: c.lastActivity?.toISOString().replace('T', ' ').slice(0, 16),
                    messagesCount: c.messages?.length || 0,
                    preview: c.messages?.slice(-3).map(m => `[${m.role}]: ${m.text}`).join(' | ')
                }))
            };
        } catch (err) {
            console.error('[AdminAI] analyze_public_conversations error:', err.message);
            return { error: err.message };
        }
    },
    manage_scheduled_tasks: async ({ action, title, prompt, scheduleType, cronExpression, runAt, taskId }) => {
        try {
            if (action === 'list') {
                const tasks = await ScheduledTask.find().lean();
                return {
                    total: tasks.length,
                    tasks: tasks.map(t => ({
                        id: t._id,
                        title: t.title,
                        scheduleType: t.scheduleType,
                        cronExpression: t.cronExpression,
                        runAt: t.runAt,
                        isActive: t.isActive,
                        isSystem: t.isSystem,
                        lastRun: t.lastRun
                    }))
                };
            }

            if (action === 'create') {
                if (!title || !prompt || !scheduleType) return { error: "title, prompt, and scheduleType are required for creation." };
                if (scheduleType === 'cron' && !cronExpression) return { error: "cronExpression is required for recurring tasks." };
                if (scheduleType === 'once' && !runAt) return { error: "runAt is required for one-time tasks." };

                const newTask = new ScheduledTask({
                    title,
                    prompt,
                    scheduleType,
                    cronExpression,
                    runAt: runAt ? new Date(runAt) : undefined,
                    createdBy: user._id
                });
                await newTask.save();

                cronService.scheduleTask(newTask);

                return { success: true, message: "تم إنشاء المهمة وجدولتها بنجاح.", taskId: newTask._id };
            }

            if (action === 'delete') {
                if (!taskId) return { error: "taskId is required for deletion." };
                const task = await ScheduledTask.findById(taskId);
                if (!task) return { error: "لم يتم العثور على المهمة." };
                if (task.isSystem) return { error: "لا يمكن حذف مهام النظام الأساسية." };

                cronService.cancelTask(taskId);
                await ScheduledTask.findByIdAndDelete(taskId);
                return { success: true, message: "تم إيقاف وحذف المهمة بنجاح." };
            }

            return { error: "إجراء غير معروف. استخدم list, create, or delete." };
        } catch (err) {
            console.error('[AdminAI] manage_scheduled_tasks error:', err.message);
            return { error: err.message };
        }
    },
    manage_system_settings: async ({ action, key, value }) => {
        try {
            if (user.role !== 'admin') return { error: "صلاحية إدارة الإعدادات للمدير العام فقط." };
            if (action === 'update') {
                if (value === undefined) return { error: "يجب تمرير القيمة الجديدة عند التحديث." };
                let valToSave = value;
                if (value === 'true' || value === true) valToSave = true;
                if (value === 'false' || value === false) valToSave = false;

                const updated = await SystemSetting.findOneAndUpdate(
                    { key },
                    { value: valToSave, updatedAt: new Date() },
                    { new: true, upsert: true }
                ).lean();
                return { success: true, message: `تم تحديث ${key}`, new_value: updated.value };
            } else {
                const setting = await SystemSetting.findOne({ key }).lean();
                return { success: true, key, value: setting ? setting.value : null };
            }
        } catch (err) {
            console.error('[AdminAI] manage_system_settings error:', err.message);
            return { error: err.message };
        }
    },
    get_facebook_insights: async ({ limit = 5 }) => {
        try {
            const posts = await FacebookPost.find({ isActive: true })
                .sort({ createdTime: -1 })
                .limit(limit)
                .lean();

            if (!posts.length) return { message: "لا توجد بوستات مزامنة من فيسبوك." };

            return {
                postsCount: posts.length,
                posts: posts.map(p => ({
                    message: p.message?.slice(0, 100) + '...',
                    type: p.type,
                    createdTime: p.createdTime?.toISOString().split('T')[0],
                    likes: p.likeCount,
                    comments: p.commentCount,
                    shares: p.shareCount,
                    link: p.permalink
                }))
            };
        } catch (err) {
            console.error('[AdminAI] get_facebook_insights error:', err.message);
            return { error: err.message };
        }
    },
    manage_dynamic_tools: async ({ action, name, description, script, args }) => {
        try {
            if (user.role !== 'admin') return { error: "صلاحية إدارة الأدوات الديناميكية للمدير العام فقط." };

            if (action === 'list') {
                const tools = await DynamicTool.find().select('-script').lean();
                return { total: tools.length, tools };
            }

            if (action === 'create') {
                if (!name || !description || !script) return { error: "name, description, and script are required." };
                const existing = await DynamicTool.findOne({ name });
                if (existing) return { error: "أداة بهذا الاسم موجودة مسبقاً." };

                const newTool = await DynamicTool.create({ name, description, script, createdBy: user._id });
                return { success: true, message: "تم حفظ الأداة بنجاح.", toolId: newTool._id };
            }

            if (action === 'delete') {
                if (!name) return { error: "name is required for deletion." };
                await DynamicTool.findOneAndDelete({ name });
                return { success: true, message: "تم حذف الأداة بنجاح." };
            }

            if (action === 'run') {
                if (!name) return { error: "name is required to run a tool." };
                const tool = await DynamicTool.findOne({ name });
                if (!tool) return { error: "الأداة غير موجودة." };

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

                let parsedArgs = {};
                if (args) {
                    try { parsedArgs = JSON.parse(args); } catch (e) { return { error: "فشل في تمرير args (JSON Error)." }; }
                }

                let scriptBody = tool.script.trim();
                scriptBody = scriptBody.replace(/module\.exports\s*=\s*/, '');
                if (scriptBody.startsWith('async function') || scriptBody.startsWith('function')) {
                    scriptBody = `const fn = ${scriptBody};\nreturn await fn(models, args, require);`;
                }

                const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
                // Only inject 'require'. Mongoose is omitted to prevent "Identifier has already been declared" error
                // when checking `const mongoose = require('mongoose')` inside the AI's script.
                const dynamicFn = new AsyncFunction('models', 'args', 'require', scriptBody);

                tool.runCount += 1;
                tool.lastRun = new Date();
                await tool.save();

                const result = await dynamicFn(models, parsedArgs, require);
                return { success: true, output: result };
            }

            return { error: "إجراء غير معروف." };
        } catch (err) {
            console.error('[AdminAI] manage_dynamic_tools error:', err);
            return { error: err.message };
        }
    },
    generate_image: async ({ prompt, aspectRatio = '16:9' }) => {
        try {
            console.log(`[AdminAI] Generating image using Gemini 3.1 Flash Image Preview with prompt: ${prompt}`);
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) return { error: "GEMINI_API_KEY غير متوفر لمعالجة طلب الصورة." };
            
            const axios = require('axios');
            const fs = require('fs');
            const path = require('path');
            
            const parts = [
                { text: prompt + "\n\nملاحظة صارمة للمصمم (System Instruction):\n1. الصورتان المرفقتان هما للمرجعية فقط: استخدم صورة البنر لاستلهام الألوان والديكور والطريقة التصميمية العامة، واستخدم الشعار إذا أردت وضعه كعلامة مائية. لكن يُمنع منعاً باتاً نسخ أو استخدام أي شخص أو وجه ظاهر في الصور المرجعية — صمم محتوى بصري أصلي تماماً.\n2. يُمنع كتابة أي نص أو حروف أو كلمات على البنر أو التصميم نهائياً إلا إذا طلب المستخدم ذلك صراحةً في الوصف الأصلي.\n3. ركز على تصميم بصري جذاب بالألوان والتكوين فقط (No text, no typography, no watermarks except the logo if appropriate)." }
            ];
            
            const bannerPath = path.join(__dirname, '../../client/public/banner-b2.png');
            const logoPath = path.join(__dirname, '../../client/public/logo.png');
            
            [bannerPath, logoPath].forEach(imgP => {
                try {
                    if (fs.existsSync(imgP)) {
                        parts.push({
                            inlineData: {
                                mimeType: "image/png",
                                data: fs.readFileSync(imgP, { encoding: 'base64' })
                            }
                        });
                    }
                } catch(e) {
                    console.warn('[AdminAI] Could not read reference image:', imgP);
                }
            });

            // إضافة صورة المستخدم كمرجع إذا توفرت
            if (fileBuffer && fileMimeType) {
                parts.push({
                    inlineData: {
                        mimeType: fileMimeType,
                        data: fileBuffer.toString('base64')
                    }
                });
            }

            const requestBody = {
                contents: [{ parts: parts }],
                tools: [{ googleSearch: {} }],
                generationConfig: {
                    responseModalities: ["TEXT", "IMAGE"],
                    imageConfig: {
                        aspectRatio: aspectRatio, // supports 1:1, 16:9, 4:3, 5:4, 1:4, 4:1, 1:8, 8:1
                        imageSize: "1K" // uses 1K by default for this model
                    }
                }
            };
            
            const res = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${apiKey}`,
                requestBody,
                { headers: { "Content-Type": "application/json" } }
            );
            
            let base64Image = null;
            let generatedText = "";
            if (res.data?.candidates?.[0]?.content?.parts) {
                for (let part of res.data.candidates[0].content.parts) {
                    if (part.text) {
                        generatedText += part.text + "\n";
                    }
                    if (part.inlineData && part.inlineData.data) {
                        base64Image = part.inlineData.data;
                    }
                }
            }
            
            if (base64Image) {
                let finalImageUrl = "";
                try {
                    if (process.env.CLOUDINARY_CLOUD_NAME) {
                        const cloudinary = require('cloudinary').v2;
                        cloudinary.config({
                            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                            api_key: process.env.CLOUDINARY_API_KEY,
                            api_secret: process.env.CLOUDINARY_API_SECRET
                        });

                        const uploadRes = await cloudinary.uploader.upload(`data:image/png;base64,${base64Image}`, {
                            folder: 'gharam_ai_designs'
                        });

                        if (uploadRes.secure_url) {
                            finalImageUrl = uploadRes.secure_url;
                            console.log('[AdminAI] Image successfully uploaded to Cloudinary:', finalImageUrl);
                        }
                    }
                } catch (cloudErr) {
                    console.error('[AdminAI] Cloudinary Upload Error:', cloudErr.message);
                }

                // حفظ مسار الصورة في قاعدة البيانات (سواء كانت سحابية أو محلية Base64)
                const AIMedia = require('../models/AIMedia');
                const mediaDataToSave = finalImageUrl ? finalImageUrl : base64Image;
                const contentType = finalImageUrl ? 'url' : 'image/png';
                
                const newMedia = new AIMedia({
                    data: mediaDataToSave,
                    contentType: contentType,
                    prompt: prompt
                });
                await newMedia.save();
                
                // الرابط الموحد المربوط بقاعدة البيانات (لكي يظهر في المعرض بشكل سليم)
                const galleryUniformUrl = `/api/ai/media/${newMedia._id}`;

                // إذا فشل الرفع السحابي، استخدم الرابط المحلي كحل نهائي
                if (!finalImageUrl) {
                    finalImageUrl = galleryUniformUrl;
                    console.log('[AdminAI] Image successfully saved to local AIMedia collection:', finalImageUrl);
                }
                
                return { 
                    success: true, 
                    imageResult: `تم توليد الصورة بنجاح وتخزينها.\n\nالرابط المباشر للصورة هو: ${finalImageUrl}\n\nيجب عليك استخدام المتغير أو الرابط ${galleryUniformUrl} صراحةً عند بناء الصفحة باستخدام {__IMAGE_URL__} أو src="${galleryUniformUrl}".\n\nلعرضها في تقريرك للمدير، استخدم الكود التالي:\n![تصميم الموديل الجديد](${finalImageUrl})`
                };
            } else {
                return { error: `الرد من جوجل لم يحتوي على بيانات صورة صحيحة.` };
            }
        } catch (error) {
            console.error('[AdminAI] generate_image error:', error.message);
            return { error: "فشل في طلب توليد الصورة من جيميناي: " + (error.response?.data?.error?.message || error.message) };
        }
    },
    list_codebase_directory: async ({ dirPath = '.' }) => {
        try {
            const root = path.resolve(process.cwd());
            const target = path.resolve(root, dirPath);
            if (!target.startsWith(root)) return { error: "مسار خارج بيئة المشروع المسموح بها." };

            if (!fs.existsSync(target)) return { error: "المسار غير موجود." };

            const entries = fs.readdirSync(target, { withFileTypes: true });
            const files = entries.filter(e => e.isFile()).map(e => e.name);
            const dirs = entries.filter(e => e.isDirectory() && e.name !== 'node_modules' && e.name !== '.git').map(e => e.name + '/');
            return { currentDirectory: dirPath, directories: dirs, files: files };
        } catch (err) {
            return { error: "فشل في استعراض المجلد: " + err.message };
        }
    },
    view_codebase_file: async ({ filePath }) => {
        try {
            const root = path.resolve(process.cwd());
            const target = path.resolve(root, filePath);
            if (!target.startsWith(root)) return { error: "مسار خارج بيئة المشروع المسموح بها." };

            if (!fs.existsSync(target)) return { error: "الملف غير موجود." };
            const stat = fs.statSync(target);
            if (stat.size > 100 * 1024) return { error: "الملف ضخم جداً (> 100KB)." };

            const content = fs.readFileSync(target, 'utf-8');
            return { filePath, content };
        } catch (err) {
            return { error: "فشل في قراءة الملف: " + err.message };
        }
    }
});

const processAdminChat = async (messages, user, fileBuffer = null, fileMimeType = null, additionalPrompt = null, onToolCall = null, fastMode = false, specificModel = null) => {
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

    if (additionalPrompt) {
        systemPrompt += `\n\n[=== توجيه إضافي مخصص من واجهة خارجية ===]\n${additionalPrompt}\n[=========================================]`;
    }

    if (!process.env.GEMINI_API_KEY) throw new Error("Missing Gemini API Key");

    // Build API keys list: primary + optional backup (from different project for separate quota)
    const apiKeys = [process.env.GEMINI_API_KEY];
    if (process.env.GEMINI_API_KEY_2) apiKeys.push(process.env.GEMINI_API_KEY_2);

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

    // Build OpenAI-format history for OpenAI models
    const openaiHistory = [{ role: 'system', content: systemPrompt }];
    for (const m of historyMessages) {
        if (!m.text) continue;
        openaiHistory.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text });
    }

    const lastMsgObj = messages[messages.length - 1];
    let userMessageContentText = lastMsgObj?.text || "مرحباً";

    // Ensure history ends with 'model' (so last message we send is 'user')
    if (cleanHistory.length > 0 && cleanHistory[cleanHistory.length - 1].role === 'user') {
        const popped = cleanHistory.pop();
        userMessageContentText = popped.parts[0].text + "\n---\n" + userMessageContentText;
    }

    let userMessageContent = [{ text: userMessageContentText }];

    if (fileBuffer && fileMimeType) {
        userMessageContent.push({
            inlineData: {
                data: fileBuffer.toString("base64"),
                mimeType: fileMimeType
            }
        });
    }

    // Add user message to OpenAI history
    openaiHistory.push({ role: 'user', content: userMessageContentText });

    const localFunctions = createFunctions(user, fileBuffer, fileMimeType);

    // Determine model list: specificModel or dynamic chain from DB
    let activeModels;
    if (specificModel) {
        activeModels = [specificModel];
        console.log(`[AdminAI] 🎯 Specific model requested: ${specificModel}`);
    } else {
        // Try loading chain from DB
        try {
            const chainKey = fastMode ? 'admin_fast_chain' : 'admin_pro_chain';
            const chainSetting = await SystemSetting.findOne({ key: chainKey });
            if (chainSetting) {
                activeModels = JSON.parse(chainSetting.value);
            }
        } catch (e) { /* ignore */ }

        if (!activeModels || !activeModels.length) {
            activeModels = fastMode ? LIGHT_MODEL_CANDIDATES : MODEL_CANDIDATES;
        }
        console.log(`[AdminAI] Mode: ${fastMode ? '⚡ Fast' : '🧠 Pro'} | Models: ${activeModels.join(', ')}`);
    }

    let replyText = null;
    let lastError = null;

    // Helper: Check if model is OpenAI
    const isOpenAIModel = (name) => name.startsWith('gpt-') || name.startsWith('o4-') || name.startsWith('o3-') || name.startsWith('o1-');

    // Try each model in the chain
    for (const modelName of activeModels) {
        if (isOpenAIModel(modelName)) {
            // ===== OpenAI model with function calling =====
            if (!process.env.OPENAI_API_KEY) {
                console.log(`[AdminAI] ⏭ Skipping ${modelName} — no OpenAI API key`);
                continue;
            }

            try {
                console.log(`[AdminAI] Trying OpenAI model: ${modelName}...`);
                if (onToolCall) {
                    try { onToolCall({ type: 'thinking', tool: '_thinking', model: modelName }); } catch (e) { }
                }

                const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
                const openaiToolDefs = geminiToolsToOpenAI(adminTools);
                const chatMessages = [...openaiHistory];

                let callCount = 0;
                while (callCount < 5) {
                    const completionParams = {
                        model: modelName,
                        messages: chatMessages,
                        tools: openaiToolDefs
                    };

                    // reasoning models: enable high reasoning & max_completion_tokens
                    if (modelName.startsWith('o4-') || modelName.startsWith('o3-') || modelName.startsWith('o1-')) {
                        completionParams.reasoning_effort = 'high';
                        completionParams.max_completion_tokens = 25000;
                    } else if (modelName === 'gpt-5.4-mini' || modelName === 'gpt-5.4') {
                        if (modelName === 'gpt-5.4-mini') {
                            completionParams.reasoning_effort = 'medium';
                            completionParams.max_completion_tokens = 16000;
                        } else {
                            completionParams.max_completion_tokens = 4096;
                        }
                    } else if (modelName === 'gpt-5-mini') {
                        completionParams.reasoning_effort = 'high';
                        completionParams.max_completion_tokens = 16000;
                    } else {
                        completionParams.max_tokens = 4096;
                    }

                    const completion = await openai.chat.completions.create(completionParams);
                    const choice = completion.choices[0];

                    if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls?.length > 0) {
                        chatMessages.push(choice.message);

                        for (const toolCall of choice.message.tool_calls) {
                            const funcName = toolCall.function.name;
                            let args = {};
                            try { args = JSON.parse(toolCall.function.arguments || '{}'); } catch (e) { }

                            if (onToolCall) {
                                try { onToolCall({ type: 'tool_start', tool: funcName, args: Object.keys(args || {}) }); } catch (e) { }
                            }

                            let toolResult = { error: `أداة ${funcName} غير معروفة` };
                            if (localFunctions[funcName]) {
                                try {
                                    toolResult = await localFunctions[funcName](args);
                                } catch (e) {
                                    toolResult = { error: e.message };
                                }
                            }

                            if (onToolCall) {
                                try { onToolCall({ type: 'tool_done', tool: funcName }); } catch (e) { }
                            }

                            chatMessages.push({
                                role: 'tool',
                                tool_call_id: toolCall.id,
                                content: JSON.stringify(toolResult)
                            });
                        }

                        if (onToolCall) {
                            try { onToolCall({ type: 'analyzing', tool: '_analyzing' }); } catch (e) { }
                        }
                        callCount++;
                        continue;
                    }

                    replyText = choice.message?.content || '';
                    break;
                }

                if (replyText) {
                    console.log(`[AdminAI] ✅ Success with OpenAI model: ${modelName}`);
                    break;
                }
            } catch (err) {
                console.warn(`[AdminAI] ❌ OpenAI ${modelName} failed: ${err.message?.slice(0, 200)}`);
                lastError = err;
            }
        } else {
            // ===== Gemini model =====
            for (let keyIdx = 0; keyIdx < apiKeys.length; keyIdx++) {
                const currentKey = apiKeys[keyIdx];
                const keyLabel = keyIdx === 0 ? 'Primary' : 'Backup';
                const genAI = new GoogleGenerativeAI(currentKey);

                if (keyIdx > 0) {
                    console.log(`[AdminAI] 🔄 Switching to ${keyLabel} API key for model ${modelName}...`);
                }

                try {
                    console.log(`[AdminAI] Trying model: ${modelName} (${keyLabel} key)...`);
                    let modelFeatures = {
                        model: modelName,
                        systemInstruction: systemPrompt,
                        tools: adminTools
                    };

                    const model = genAI.getGenerativeModel(modelFeatures);
                    const chat = model.startChat({ history: cleanHistory });

                    if (onToolCall) {
                        try { onToolCall({ type: 'thinking', tool: '_thinking', model: modelName }); } catch (e) { }
                    }

                    let result = await chat.sendMessage(userMessageContent);
                    let response = result.response;
                    let callCount = 0;

                    while (response.functionCalls()?.length && callCount < 5) {
                        const functionCalls = response.functionCalls();
                        const functionResponses = [];

                        for (const call of functionCalls) {
                            const funcName = call.name;
                            const args = call.args;

                            if (onToolCall) {
                                try { onToolCall({ type: 'tool_start', tool: funcName, args: Object.keys(args || {}) }); } catch (e) { }
                            }

                            if (localFunctions[funcName]) {
                                const apiResponse = await localFunctions[funcName](args);
                                functionResponses.push({
                                    functionResponse: {
                                        name: funcName,
                                        response: apiResponse
                                    }
                                });

                                if (onToolCall) {
                                    try { onToolCall({ type: 'tool_done', tool: funcName }); } catch (e) { }
                                }
                            }
                        }

                        if (functionResponses.length > 0) {
                            if (onToolCall) {
                                try { onToolCall({ type: 'analyzing', tool: '_analyzing' }); } catch (e) { }
                            }
                            result = await chat.sendMessage(functionResponses);
                            response = result.response;
                        }
                        callCount++;
                    }

                    replyText = response.text();
                    if (replyText) {
                        console.log(`[AdminAI] ✅ Success with model: ${modelName} (${keyLabel} key)`);
                    }
                    break;

                } catch (err) {
                    console.warn(`[AdminAI] ❌ Model ${modelName} failed (${keyLabel} key). Status: ${err.status || 'N/A'}. Reason: ${err.message?.slice(0, 200)}`);
                    lastError = err;
                }
            }
        }

        if (replyText) break;
    }

    if (!replyText) {
        if (!fastMode && !specificModel) {
            console.warn('[AdminAI] ⚠️ All Pro models failed. Falling back to emergency Fast mode...');
            return await processAdminChat(messages, user, fileBuffer, fileMimeType, additionalPrompt, onToolCall, true);
        }
        console.error('[AdminAI] All models failed.', lastError?.message || lastError);
        throw new Error(lastError?.message || 'جميع نماذج الذكاء الاصطناعي غير متاحة حالياً.');
    }

    return replyText;
};

const generateChatTitle = async (firstMessage) => {
    try {
        // Try OpenAI first (fast and cheap for title generation)
        if (process.env.OPENAI_API_KEY) {
            try {
                const OpenAI = require('openai');
                const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

                const completion = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: 'أنت مساعد يقوم بتوليد عناوين للمحادثات. اكتب عنوان قصير جداً (3 كلمات كحد أقصى) يعبر عن محتوى الرسالة. لا تضع نقطة في النهاية ولا تضف أي عبارات أخرى.'
                        },
                        {
                            role: 'user',
                            content: `الرسالة: "${firstMessage}"`
                        }
                    ],
                    max_tokens: 30
                });

                const title = completion.choices[0]?.message?.content?.trim().replace(/['"]+/g, '');
                if (title) {
                    console.log(`[AdminAI] ✅ Title generated via OpenAI: "${title}"`);
                    return title;
                }
            } catch (openaiErr) {
                console.log(`[AdminAI] ❌ OpenAI title gen failed: ${openaiErr.message?.slice(0, 80)}`);
            }
        }

        // Fallback to Gemini if OpenAI unavailable
        if (!process.env.GEMINI_API_KEY) return "محادثة جديدة";

        const apiKeys = [process.env.GEMINI_API_KEY];
        if (process.env.GEMINI_API_KEY_2) apiKeys.push(process.env.GEMINI_API_KEY_2);

        let result = null;

        for (const modelName of LIGHT_MODEL_CANDIDATES) {
            for (const key of apiKeys) {
                const genAI = new GoogleGenerativeAI(key);
                try {
                    const model = genAI.getGenerativeModel({ model: modelName });
                    const prompt = `أنت مساعد يقوم بتوليد عناوين للمحادثات.
اكتب عنوان قصير جداً (3 كلمات كحد أقصى) يعبر عن محتوى هذه الرسالة من مدير نظام. لا تضع نقطة في النهاية ولا تضف أي عبارات أخرى.
الرسالة: "${firstMessage}"`;
                    result = await model.generateContent(prompt);
                    break;
                } catch (e) {
                    // Try next key
                }
            }
            if (result) break;
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
    DEFAULT_ADMIN_PROMPT,
    adminTools,
    createAdminFunctions: createFunctions
};
