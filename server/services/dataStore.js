/**
 * DataStore - Centralized In-Memory Cache with Write-Through Strategy
 * 
 * Golden Rules:
 *   READ  → from cache (instant) → if empty → from MongoDB → store in cache
 *   WRITE → to MongoDB FIRST → if success → update cache → if DB fails → return error, don't touch cache
 * 
 * Self-healing: every 10 minutes, compare counts between cache and MongoDB.
 *   If mismatch → reload affected collection.
 */

const Booking = require('../models/Booking');
const InstantService = require('../models/InstantService');
const Expense = require('../models/Expense');
const Advance = require('../models/Advance');
const Deduction = require('../models/Deduction');
const User = require('../models/User');
const Package = require('../models/Package');
const Service = require('../models/Service');
const ActivityLog = require('../models/ActivityLog');

// ────────────────────────────────────────────
//  IN-MEMORY STORES
// ────────────────────────────────────────────
const store = {
  bookings: [],       // populated Booking docs (plain objects)
  instantServices: [], // populated InstantService docs
  expenses: [],
  advances: [],
  deductions: [],
  users: [],
  packages: [],
  services: [],
  activityLogs: [],   // last 30 days only
  ready: false,       // flag: warmUp completed?
  warming: false      // flag: warmUp in progress?
};

// Populate paths used across controllers
const BOOKING_POPULATE = 'package hennaPackage photographyPackage returnedServices extraServices packageServices._id installments.employeeId updates.employeeId createdBy hairStraighteningExecutedBy hairDyeExecutedBy photographyExecutedBy packageServices.executedBy';
const INSTANT_POPULATE = [
  { path: 'employeeId', select: 'username' },
  { path: 'services.executedBy', select: 'username' }
];

// ────────────────────────────────────────────
//  WARM UP - Load everything at server start
// ────────────────────────────────────────────
const warmUp = async () => {
  if (store.warming) return;
  store.warming = true;
  const start = Date.now();
  console.log('[DataStore] ⏳ Warming up cache...');

  try {
    const [bookings, instantServices, expenses, advances, deductions, users, packages, services, activityLogs] = await Promise.all([
      Booking.find({}).populate(BOOKING_POPULATE).lean(),
      InstantService.find({}).populate(INSTANT_POPULATE).lean(),
      Expense.find({}).populate('userId createdBy', 'username').lean(),
      Advance.find({}).populate('userId createdBy', 'username remainingSalary').lean(),
      Deduction.find({}).populate('userId createdBy', 'username remainingSalary').lean(),
      User.find({}).select('-password').lean(),
      Package.find({}).lean(),
      Service.find({}).populate('packageId', 'name').lean(),
      ActivityLog.find({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }).populate('performedBy', 'username').lean()
    ]);

    store.bookings = bookings;
    store.instantServices = instantServices;
    store.expenses = expenses;
    store.advances = advances;
    store.deductions = deductions;
    store.users = users;
    store.packages = packages;
    store.services = services;
    store.activityLogs = activityLogs;
    store.ready = true;

    const elapsed = Date.now() - start;
    console.log(`[DataStore] ✅ Cache warmed up in ${elapsed}ms`);
    console.log(`[DataStore]    Bookings: ${bookings.length} | InstantServices: ${instantServices.length} | Expenses: ${expenses.length} | Advances: ${advances.length} | Deductions: ${deductions.length} | Users: ${users.length} | Packages: ${packages.length} | Services: ${services.length} | ActivityLogs: ${activityLogs.length}`);

    // Start self-healing check
    startSelfHealing();
  } catch (err) {
    console.error('[DataStore] ❌ WarmUp failed:', err.message);
    store.ready = false;
  } finally {
    store.warming = false;
  }
};

// ────────────────────────────────────────────
//  SELF-HEALING (every 10 minutes)
// ────────────────────────────────────────────
let healingInterval = null;

const startSelfHealing = () => {
  if (healingInterval) clearInterval(healingInterval);
  healingInterval = setInterval(async () => {
    try {
      const [bCount, isCount, eCount, aCount, dCount] = await Promise.all([
        Booking.countDocuments(),
        InstantService.countDocuments(),
        Expense.countDocuments(),
        Advance.countDocuments(),
        Deduction.countDocuments()
      ]);

      let reloaded = [];

      // Incremental sync for bookings — avoid full reload for small mismatches
      if (bCount !== store.bookings.length) {
        const diff = Math.abs(bCount - store.bookings.length);
        if (diff > 5) {
          // Large mismatch — full reload
          store.bookings = await Booking.find({}).populate(BOOKING_POPULATE).lean();
        } else {
          // Small mismatch — incremental sync
          const dbIds = new Set((await Booking.find({}).select('_id').lean()).map(b => b._id.toString()));
          const cacheIds = new Set(store.bookings.map(b => _id(b)));
          for (const id of dbIds) {
            if (!cacheIds.has(id)) {
              const doc = await Booking.findById(id).populate(BOOKING_POPULATE).lean();
              if (doc) store.bookings.push(doc);
            }
          }
          store.bookings = store.bookings.filter(b => dbIds.has(_id(b)));
        }
        reloaded.push(`Bookings(${store.bookings.length})`);
      }
      // Incremental sync for instant services
      if (isCount !== store.instantServices.length) {
        const diff = Math.abs(isCount - store.instantServices.length);
        if (diff > 5) {
          store.instantServices = await InstantService.find({}).populate(INSTANT_POPULATE).lean();
        } else {
          const dbIds = new Set((await InstantService.find({}).select('_id').lean()).map(i => i._id.toString()));
          const cacheIds = new Set(store.instantServices.map(i => _id(i)));
          for (const id of dbIds) {
            if (!cacheIds.has(id)) {
              const doc = await InstantService.findById(id).populate(INSTANT_POPULATE).lean();
              if (doc) store.instantServices.push(doc);
            }
          }
          store.instantServices = store.instantServices.filter(i => dbIds.has(_id(i)));
        }
        reloaded.push(`InstantServices(${store.instantServices.length})`);
      }
      if (eCount !== store.expenses.length) {
        store.expenses = await Expense.find({}).populate('userId createdBy', 'username').lean();
        reloaded.push(`Expenses(${store.expenses.length})`);
      }
      if (aCount !== store.advances.length) {
        store.advances = await Advance.find({}).populate('userId createdBy', 'username remainingSalary').lean();
        reloaded.push(`Advances(${store.advances.length})`);
      }
      if (dCount !== store.deductions.length) {
        store.deductions = await Deduction.find({}).populate('userId createdBy', 'username remainingSalary').lean();
        reloaded.push(`Deductions(${store.deductions.length})`);
      }

      // Always refresh activity logs (they grow naturally)
      store.activityLogs = await ActivityLog.find({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }).populate('performedBy', 'username').lean();

      // Refresh users (points change frequently)
      store.users = await User.find({}).select('-password').lean();

      if (reloaded.length > 0) {
        console.log(`[DataStore] 🔄 Self-healing reloaded: ${reloaded.join(', ')}`);
      }
    } catch (err) {
      console.error('[DataStore] Self-healing error:', err.message);
    }
  }, 10 * 60 * 1000); // 10 minutes
  healingInterval.unref?.();
};

// ────────────────────────────────────────────
//  HELPERS
// ────────────────────────────────────────────
const isReady = () => store.ready;

const _id = (obj) => obj?._id?.toString?.() || obj?.toString?.() || '';

const isSameDay = (d1, d2) => {
  const a = new Date(d1);
  const b = new Date(d2);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
};

const inDateRange = (date, start, end) => {
  const d = new Date(date);
  return d >= start && d <= end;
};

// Resolve an ObjectId ref from cache (e.g. populate from users/packages)
const resolveUser = (id) => {
  if (!id) return null;
  const idStr = _id(id);
  // If already populated (object with username), return as-is
  if (typeof id === 'object' && id.username) return id;
  return store.users.find(u => _id(u) === idStr) || null;
};

const resolvePackage = (id) => {
  if (!id) return null;
  const idStr = _id(id);
  if (typeof id === 'object' && id.name) return id;
  return store.packages.find(p => _id(p) === idStr) || null;
};

// ────────────────────────────────────────────
//  READ: BOOKINGS
// ────────────────────────────────────────────
const getBookings = ({ page = 1, limit = 50, search, date, receiptNumber } = {}) => {
  // Filter without copying the full array first — filter() already creates a new array
  let results = store.bookings;

  if (receiptNumber) {
    results = results.filter(b => b.receiptNumber === receiptNumber);
  } else if (search) {
    const s = search.toLowerCase();
    results = results.filter(b =>
      (b.clientName && b.clientName.toLowerCase().includes(s)) ||
      (b.clientPhone && b.clientPhone.includes(s)) ||
      (b.receiptNumber && b.receiptNumber.includes(s))
    );
  } else {
    // Only copy when no filter applied (need a mutable copy for sort)
    results = results.slice();
  }

  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    results = results.filter(b => {
      const d = new Date(b.eventDate);
      return d >= startOfDay && d <= endOfDay;
    });
  }

  // Sort newest first
  results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = results.length;
  const pages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;
  const bookings = results.slice(skip, skip + parseInt(limit));

  return { bookings, total, pages };
};

// Efficient count-only query for availability checks — no array copies
const countBookingsByDate = (date, type) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  let count = 0;
  for (const b of store.bookings) {
    const ed = new Date(b.eventDate);
    if (ed < startOfDay || ed > endOfDay) continue;
    if (type === 'photo') {
      if (b.photographyPackage) count++;
    } else {
      if (!b.photographyPackage) count++;
    }
  }
  return count;
};

const getBookingById = (id) => {
  return store.bookings.find(b => _id(b) === id) || null;
};

const getBookingByReceipt = (receiptNumber) => {
  return store.bookings.find(b => b.receiptNumber === receiptNumber) || null;
};

// ────────────────────────────────────────────
//  READ: INSTANT SERVICES
// ────────────────────────────────────────────
const getInstantServices = ({ page = 1, limit = 50, search, date, receiptNumber } = {}) => {
  // Filter without copying the full array first
  let results = store.instantServices;

  if (receiptNumber) {
    results = results.filter(is => is.receiptNumber === receiptNumber.toString().trim());
  } else if (search) {
    const s = search.toLowerCase();
    // Search by receipt or employee name
    results = results.filter(is =>
      (is.receiptNumber && is.receiptNumber.includes(s)) ||
      (is.employeeId?.username && is.employeeId.username.toLowerCase().includes(s))
    );
  } else {
    // Only copy when no filter applied (need a mutable copy for sort)
    results = results.slice();
  }

  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    results = results.filter(is => {
      const d = new Date(is.createdAt);
      return d >= startOfDay && d <= endOfDay;
    });
  }

  results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = results.length;
  const pages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;
  const instantServices = results.slice(skip, skip + parseInt(limit));

  return { instantServices, total, pages };
};

const getInstantServiceById = (id) => {
  return store.instantServices.find(is => _id(is) === id) || null;
};

const getInstantServiceByReceipt = (receiptNumber) => {
  return store.instantServices.find(is => is.receiptNumber === receiptNumber) || null;
};

// ────────────────────────────────────────────
//  READ: EXPENSES/ADVANCES/DEDUCTIONS
// ────────────────────────────────────────────
const getExpensesAdvances = ({ page = 1, limit = 50, search } = {}) => {
  let expensesFiltered = store.expenses;
  let advancesFiltered = store.advances;
  let deductionsFiltered = store.deductions;

  if (search) {
    const s = search.toLowerCase();
    const matchingUserIds = store.users
      .filter(u => u.username && u.username.toLowerCase().includes(s))
      .map(u => _id(u));

    expensesFiltered = expensesFiltered.filter(e =>
      (e.details && e.details.toLowerCase().includes(s)) ||
      (e.userId && matchingUserIds.includes(_id(e.userId))) ||
      (e.createdBy && matchingUserIds.includes(_id(e.createdBy)))
    );
    advancesFiltered = advancesFiltered.filter(a =>
      (a.userId && matchingUserIds.includes(_id(a.userId))) ||
      (a.createdBy && matchingUserIds.includes(_id(a.createdBy)))
    );
    deductionsFiltered = deductionsFiltered.filter(d =>
      (d.userId && matchingUserIds.includes(_id(d.userId))) ||
      (d.createdBy && matchingUserIds.includes(_id(d.createdBy))) ||
      (d.reason && d.reason.toLowerCase().includes(s))
    );
  }

  const items = [
    ...expensesFiltered.map(item => ({ ...item, type: 'expense' })),
    ...advancesFiltered.map(item => ({ ...item, type: 'advance' })),
    ...deductionsFiltered.map(item => ({ ...item, type: 'deduction', details: item.reason }))
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, parseInt(limit));

  const total = expensesFiltered.length + advancesFiltered.length + deductionsFiltered.length;
  return { items, total, pages: Math.ceil(total / limit) };
};

// ────────────────────────────────────────────
//  READ: TODAY WORK
// ────────────────────────────────────────────
const getTodayBookings = (date) => {
  const startDate = date ? new Date(date) : new Date();
  startDate.setHours(0, 0, 0, 0);

  const filtered = store.bookings.filter(b => {
    return isSameDay(b.eventDate, startDate) ||
      (b.hennaDate && isSameDay(b.hennaDate, startDate)) ||
      (b.hairStraighteningDate && isSameDay(b.hairStraighteningDate, startDate)) ||
      (b.hairDyeDate && isSameDay(b.hairDyeDate, startDate));
  });

  const makeupBookings = filtered.filter(b =>
    (b.package?.type === 'makeup' && isSameDay(b.eventDate, startDate)) ||
    (b.hennaPackage && b.hennaDate && isSameDay(b.hennaDate, startDate))
  );
  const hairStraighteningBookings = filtered.filter(b =>
    b.hairStraightening && b.hairStraighteningDate && isSameDay(b.hairStraighteningDate, startDate)
  );
  const hairDyeBookings = filtered.filter(b =>
    b.hairDye && b.hairDyeDate && isSameDay(b.hairDyeDate, startDate)
  );
  const photographyBookings = filtered.filter(b =>
    b.photographyPackage && (
      isSameDay(b.eventDate, startDate) ||
      (b.hennaDate && isSameDay(b.hennaDate, startDate))
    )
  );

  const addCreatedBy = (b) => ({
    ...b,
    createdBy: b.createdBy || { username: 'غير معروف' }
  });

  return {
    makeupBookings: makeupBookings.map(addCreatedBy),
    hairStraighteningBookings: hairStraighteningBookings.map(addCreatedBy),
    hairDyeBookings: hairDyeBookings.map(addCreatedBy),
    photographyBookings: photographyBookings.map(addCreatedBy)
  };
};

// ────────────────────────────────────────────
//  READ: DASHBOARD DATA
// ────────────────────────────────────────────
const toNumber = (v) => Number(v) || 0;

const getDashboardSummary = (date) => {
  const startDate = date ? new Date(date) : new Date();
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setHours(23, 59, 59, 999);

  const bookings = store.bookings.filter(b => inDateRange(b.createdAt, startDate, endDate));
  const totalDepositFromBookings = bookings.reduce((sum, b) => sum + toNumber(b.deposit), 0);

  // Installments in range from ALL bookings
  let totalInstallments = 0;
  store.bookings.forEach(b => {
    if (b.installments) {
      b.installments.forEach(ins => {
        if (ins.date && inDateRange(ins.date, startDate, endDate)) {
          totalInstallments += toNumber(ins.amount);
        }
      });
    }
  });

  const totalDeposit = totalDepositFromBookings + totalInstallments;

  const instantServices = store.instantServices.filter(is => inDateRange(is.createdAt, startDate, endDate));
  const totalInstantServices = instantServices.reduce((sum, s) => sum + toNumber(s.total), 0);

  const expenses = store.expenses.filter(e => inDateRange(e.createdAt, startDate, endDate));
  const totalExpenses = expenses.reduce((sum, e) => sum + toNumber(e.amount), 0);

  const advances = store.advances.filter(a => inDateRange(a.createdAt, startDate, endDate));
  const totalAdvances = advances.reduce((sum, a) => sum + toNumber(a.amount), 0);

  const net = totalDeposit + totalInstantServices - totalExpenses - totalAdvances;

  // Top collector
  let topCollector = '—';
  let maxTotal = -Infinity;
  store.users.forEach(u => {
    if (!Array.isArray(u.points)) return;
    const dailyPoints = u.points
      .filter(p => p.date && inDateRange(p.date, startDate, endDate))
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    if (dailyPoints > maxTotal) {
      maxTotal = dailyPoints;
      topCollector = u.username;
    }
  });

  // Payment breakdown
  const pmBreakdown = { cash: 0, vodafone: 0, visa: 0, instapay: 0 };
  bookings.forEach(b => {
    pmBreakdown[b.paymentMethod || 'cash'] = (pmBreakdown[b.paymentMethod || 'cash'] || 0) + toNumber(b.deposit);
  });
  store.bookings.forEach(b => {
    if (b.installments) {
      b.installments.forEach(ins => {
        if (ins.date && inDateRange(ins.date, startDate, endDate)) {
          pmBreakdown[ins.paymentMethod || 'cash'] = (pmBreakdown[ins.paymentMethod || 'cash'] || 0) + toNumber(ins.amount);
        }
      });
    }
  });
  instantServices.forEach(is => {
    pmBreakdown[is.paymentMethod || 'cash'] = (pmBreakdown[is.paymentMethod || 'cash'] || 0) + toNumber(is.total);
  });
  expenses.forEach(e => {
    pmBreakdown[e.paymentMethod || 'cash'] = (pmBreakdown[e.paymentMethod || 'cash'] || 0) - toNumber(e.amount);
  });
  advances.forEach(a => {
    pmBreakdown[a.paymentMethod || 'cash'] = (pmBreakdown[a.paymentMethod || 'cash'] || 0) - toNumber(a.amount);
  });

  return {
    bookingCount: bookings.length,
    totalDeposit,
    instantServiceCount: instantServices.length,
    totalInstantServices,
    totalExpenses,
    totalAdvances,
    net,
    hairStraighteningCount: instantServices.length,
    topCollector,
    paymentBreakdown: pmBreakdown
  };
};

// ────────────────────────────────────────────
//  READ: TODAY OPERATIONS (for dashboard)
// ────────────────────────────────────────────
const getTodayOperations = (date) => {
  const startDate = date ? new Date(date) : new Date();
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setHours(23, 59, 59, 999);

  const operations = [];

  // From ActivityLogs
  store.activityLogs
    .filter(log => inDateRange(log.createdAt, startDate, endDate))
    .forEach(log => {
      let typeLabel = '';
      if (log.action === 'CREATE') {
        typeLabel = log.entityType === 'Booking' ? 'إضافة حجز' :
                   log.entityType === 'InstantService' ? 'إضافة خدمة فورية' :
                   log.entityType === 'Expense' ? 'إضافة مصروف' :
                   log.entityType === 'Advance' ? 'إضافة سلفة' :
                   log.entityType === 'Installment' ? 'إضافة قسط' :
                   log.entityType === 'User' ? 'إنشاء حساب' :
                   log.entityType === 'Deduction' ? 'خصم إداري' : 'إضافة';
      } else if (log.action === 'UPDATE') {
        typeLabel = log.entityType === 'Booking' ? 'تعديل حجز' :
                   log.entityType === 'InstantService' ? 'تعديل خدمة فورية' :
                   log.entityType === 'Expense' ? 'تعديل مصروف' :
                   log.entityType === 'Advance' ? 'تعديل سلفة' :
                   log.entityType === 'User' ? 'تعديل حساب' :
                   log.entityType === 'Deduction' ? 'تعديل خصم إداري' : 'تعديل';
      } else if (log.action === 'DELETE') {
        typeLabel = log.entityType === 'Booking' ? 'حذف حجز' :
                   log.entityType === 'InstantService' ? 'حذف خدمة فورية' :
                   log.entityType === 'Expense' ? 'حذف مصروف' :
                   log.entityType === 'Advance' ? 'حذف سلفة' :
                   log.entityType === 'User' ? 'حذف حساب' :
                   log.entityType === 'Deduction' ? 'حذف خصم إداري' : 'حذف';
      } else if (log.action === 'ASSIGN') {
        typeLabel = '⚡ تكليف خدمة';
      } else if (log.action === 'UNASSIGN') {
        typeLabel = '🔄 سحب تكليف';
      } else if (log.action === 'SELF_EXECUTE') {
        typeLabel = '🙋 سحب ذاتي';
      } else if (log.action === 'CONVERT') {
        typeLabel = '🪙 تحويل عملات';
      } else if (log.action === 'REDEEM') {
        typeLabel = '💰 استبدال عملات';
      } else if (log.action === 'GIFT') {
        typeLabel = '🎁 إهداء نقاط';
      } else if (log.action === 'DEDUCT') {
        typeLabel = '📉 خصم نقاط';
      } else if (log.action === 'LOGIN') {
        typeLabel = '🔑 تسجيل دخول';
      } else if (log.action === 'RESET') {
        typeLabel = '🔄 إعادة تعيين';
      }

      operations.push({
        _id: _id(log),
        entityId: log.entityId ? _id(log.entityId) : null,
        actionType: log.action,
        type: typeLabel,
        details: log.details,
        amount: log.amount || 0,
        time: log.createdAt,
        addedBy: log.performedBy?.username || 'غير معروف',
        paymentMethod: log.paymentMethod || '-',
        isLog: true
      });
    });

  // Legacy bookings
  store.bookings
    .filter(b => inDateRange(b.createdAt, startDate, endDate))
    .forEach(b => {
      const hasLog = operations.find(op => op.isLog && op.entityId === _id(b) && op.actionType === 'CREATE');
      if (!hasLog) {
        operations.push({
          _id: `booking-${_id(b)}`,
          type: 'حجز جديد',
          details: `${b.clientName} - ${b.package?.name || 'باكدج'}`,
          amount: b.deposit,
          time: b.createdAt,
          addedBy: b.createdBy?.username || 'غير معروف',
          paymentMethod: b.paymentMethod || 'cash'
        });
      }
    });

  // Legacy installments
  store.bookings.forEach(b => {
    if (b.installments) {
      b.installments.forEach(ins => {
        if (ins.date && inDateRange(ins.date, startDate, endDate)) {
          const hasLog = operations.find(op => op.isLog && op.entityId === _id(b) && op.actionType === 'CREATE' && op.type === 'إضافة قسط' && op.amount === ins.amount);
          if (!hasLog) {
            operations.push({
              _id: `installment-${_id(b)}-${_id(ins)}`,
              type: 'قسط/دفعة',
              details: `قسط من ${b.clientName}`,
              amount: ins.amount,
              time: ins.date,
              addedBy: ins.employeeId?.username || 'غير معروف',
              paymentMethod: ins.paymentMethod || 'cash'
            });
          }
        }
      });
    }
  });

  // Legacy instant services
  store.instantServices
    .filter(is => inDateRange(is.createdAt, startDate, endDate))
    .forEach(is => {
      const hasLog = operations.find(op => op.isLog && op.entityId === _id(is) && op.actionType === 'CREATE');
      if (!hasLog) {
        operations.push({
          _id: `instant-${_id(is)}`,
          type: 'خدمة فورية',
          details: (is.services || []).map(s => s.name).join(', ') || 'خدمات متنوعة',
          amount: is.total,
          time: is.createdAt,
          addedBy: is.employeeId?.username || 'غير معروف',
          paymentMethod: is.paymentMethod || 'cash'
        });
      }
    });

  // Legacy expenses
  store.expenses
    .filter(e => inDateRange(e.createdAt, startDate, endDate))
    .forEach(e => {
      const hasLog = operations.find(op => op.isLog && op.entityId === _id(e) && op.actionType === 'CREATE');
      if (!hasLog) {
        operations.push({
          _id: `expense-${_id(e)}`,
          type: 'مصروف',
          details: e.details,
          amount: e.amount,
          time: e.createdAt,
          addedBy: e.createdBy?.username || e.userId?.username || 'غير معروف',
          paymentMethod: e.paymentMethod || 'cash'
        });
      }
    });

  // Legacy advances
  store.advances
    .filter(a => inDateRange(a.createdAt, startDate, endDate))
    .forEach(a => {
      const hasLog = operations.find(op => op.isLog && op.entityId === _id(a) && op.actionType === 'CREATE');
      if (!hasLog) {
        operations.push({
          _id: `advance-${_id(a)}`,
          type: 'سلفة',
          details: `سلفة لـ ${a.userId?.username || 'موظف'}`,
          amount: a.amount,
          time: a.createdAt,
          addedBy: a.createdBy?.username || 'غير معروف',
          paymentMethod: a.paymentMethod || 'cash'
        });
      }
    });

  operations.sort((a, b) => new Date(b.time) - new Date(a.time));
  return operations;
};

// ────────────────────────────────────────────
//  READ: MISC
// ────────────────────────────────────────────
const getUsers = () => store.users;
const getPackages = () => store.packages;
const getServices = () => store.services;
const getUserById = (id) => store.users.find(u => _id(u) === id) || null;

// ────────────────────────────────────────────
//  WRITE-THROUGH: Cache update after DB success
//  These are called AFTER the DB operation succeeds
// ────────────────────────────────────────────

// --- BOOKINGS ---
const onBookingCreated = async (bookingId) => {
  try {
    const doc = await Booking.findById(bookingId).populate(BOOKING_POPULATE).lean();
    if (doc) store.bookings.push(doc);
  } catch (e) { console.error('[DataStore] onBookingCreated error:', e.message); }
};

const onBookingUpdated = async (bookingId) => {
  try {
    const doc = await Booking.findById(bookingId).populate(BOOKING_POPULATE).lean();
    if (doc) {
      const idx = store.bookings.findIndex(b => _id(b) === _id(doc));
      if (idx >= 0) store.bookings[idx] = doc;
      else store.bookings.push(doc);
    }
  } catch (e) { console.error('[DataStore] onBookingUpdated error:', e.message); }
};

const onBookingDeleted = (bookingId) => {
  store.bookings = store.bookings.filter(b => _id(b) !== bookingId);
};

// --- INSTANT SERVICES ---
const onInstantServiceCreated = async (isId) => {
  try {
    const doc = await InstantService.findById(isId).populate(INSTANT_POPULATE).lean();
    if (doc) store.instantServices.push(doc);
  } catch (e) { console.error('[DataStore] onInstantServiceCreated error:', e.message); }
};

const onInstantServiceUpdated = async (isId) => {
  try {
    const doc = await InstantService.findById(isId).populate(INSTANT_POPULATE).lean();
    if (doc) {
      const idx = store.instantServices.findIndex(is => _id(is) === _id(doc));
      if (idx >= 0) store.instantServices[idx] = doc;
      else store.instantServices.push(doc);
    }
  } catch (e) { console.error('[DataStore] onInstantServiceUpdated error:', e.message); }
};

const onInstantServiceDeleted = (isId) => {
  store.instantServices = store.instantServices.filter(is => _id(is) !== isId);
};

// --- EXPENSES ---
const onExpenseCreated = async (id) => {
  try {
    const doc = await Expense.findById(id).populate('userId createdBy', 'username').lean();
    if (doc) store.expenses.push(doc);
  } catch (e) { console.error('[DataStore] onExpenseCreated error:', e.message); }
};

const onExpenseUpdated = async (id) => {
  try {
    const doc = await Expense.findById(id).populate('userId createdBy', 'username').lean();
    if (doc) {
      const idx = store.expenses.findIndex(e => _id(e) === _id(doc));
      if (idx >= 0) store.expenses[idx] = doc;
      else store.expenses.push(doc);
    }
  } catch (e) { console.error('[DataStore] onExpenseUpdated error:', e.message); }
};

const onExpenseDeleted = (id) => {
  store.expenses = store.expenses.filter(e => _id(e) !== id);
};

// --- ADVANCES ---
const onAdvanceCreated = async (id) => {
  try {
    const doc = await Advance.findById(id).populate('userId createdBy', 'username remainingSalary').lean();
    if (doc) store.advances.push(doc);
  } catch (e) { console.error('[DataStore] onAdvanceCreated error:', e.message); }
};

const onAdvanceUpdated = async (id) => {
  try {
    const doc = await Advance.findById(id).populate('userId createdBy', 'username remainingSalary').lean();
    if (doc) {
      const idx = store.advances.findIndex(a => _id(a) === _id(doc));
      if (idx >= 0) store.advances[idx] = doc;
      else store.advances.push(doc);
    }
  } catch (e) { console.error('[DataStore] onAdvanceUpdated error:', e.message); }
};

const onAdvanceDeleted = (id) => {
  store.advances = store.advances.filter(a => _id(a) !== id);
};

// --- DEDUCTIONS ---
const onDeductionCreated = async (id) => {
  try {
    const doc = await Deduction.findById(id).populate('userId createdBy', 'username remainingSalary').lean();
    if (doc) store.deductions.push(doc);
  } catch (e) { console.error('[DataStore] onDeductionCreated error:', e.message); }
};

const onDeductionDeleted = (id) => {
  store.deductions = store.deductions.filter(d => _id(d) !== id);
};

// --- USERS ---
const onUserUpdated = async (userId) => {
  try {
    const doc = await User.findById(userId).select('-password').lean();
    if (doc) {
      const idx = store.users.findIndex(u => _id(u) === _id(doc));
      if (idx >= 0) store.users[idx] = doc;
      else store.users.push(doc);
    }
  } catch (e) { console.error('[DataStore] onUserUpdated error:', e.message); }
};

const onUserDeleted = (userId) => {
  store.users = store.users.filter(u => _id(u) !== userId);
};

// --- PACKAGES ---
const onPackageChanged = async () => {
  try {
    store.packages = await Package.find({}).lean();
  } catch (e) { console.error('[DataStore] onPackageChanged error:', e.message); }
};

// --- SERVICES ---
const onServiceChanged = async () => {
  try {
    store.services = await Service.find({}).populate('packageId', 'name').lean();
  } catch (e) { console.error('[DataStore] onServiceChanged error:', e.message); }
};

// --- ACTIVITY LOGS ---
const onActivityLogCreated = async (logId) => {
  try {
    const doc = await ActivityLog.findById(logId).populate('performedBy', 'username').lean();
    if (doc) store.activityLogs.push(doc);
  } catch (e) { console.error('[DataStore] onActivityLogCreated error:', e.message); }
};

// ────────────────────────────────────────────
//  EXPORT
// ────────────────────────────────────────────
module.exports = {
  warmUp,
  isReady,

  // Read
  getBookings,
  countBookingsByDate,
  getBookingById,
  getBookingByReceipt,
  getInstantServices,
  getInstantServiceById,
  getInstantServiceByReceipt,
  getExpensesAdvances,
  getTodayBookings,
  getDashboardSummary,
  getTodayOperations,
  getUsers,
  getPackages,
  getServices,
  getUserById,

  // Write-through events
  onBookingCreated,
  onBookingUpdated,
  onBookingDeleted,
  onInstantServiceCreated,
  onInstantServiceUpdated,
  onInstantServiceDeleted,
  onExpenseCreated,
  onExpenseUpdated,
  onExpenseDeleted,
  onAdvanceCreated,
  onAdvanceUpdated,
  onAdvanceDeleted,
  onDeductionCreated,
  onDeductionDeleted,
  onUserUpdated,
  onUserDeleted,
  onPackageChanged,
  onServiceChanged,
  onActivityLogCreated
};

