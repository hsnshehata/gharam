const Booking = require('../models/Booking');
const InstantService = require('../models/InstantService');
const Expense = require('../models/Expense');
const Advance = require('../models/Advance');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { cacheAside } = require('../services/cache');
const dataStore = require('../services/dataStore');

const toNumber = (v) => Number(v) || 0;

const buildDashboardSummary = async (startDate, endDate) => {
  const bookings = await Booking.find({
    createdAt: { $gte: startDate, $lte: endDate }
  }).populate('package');

  const totalDepositFromBookings = bookings.reduce((sum, booking) => sum + toNumber(booking.deposit), 0);

  const installmentAgg = await Booking.aggregate([
    { $unwind: '$installments' },
    {
      $match: {
        'installments.date': { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$installments.amount' }
      }
    }
  ]);

  const totalInstallments = toNumber(installmentAgg.length ? installmentAgg[0].total : 0);
  const totalDeposit = totalDepositFromBookings + totalInstallments;

  const instantServices = await InstantService.find({
    createdAt: { $gte: startDate, $lte: endDate }
  }).populate('services');

  const hairStraighteningCount = instantServices.length;

  const expenses = await Expense.find({
    createdAt: { $gte: startDate, $lte: endDate }
  });

  const advances = await Advance.find({
    createdAt: { $gte: startDate, $lte: endDate }
  });

  const bookingCount = bookings.length;
  const instantServiceCount = instantServices.length;
  const totalInstantServices = instantServices.reduce((sum, service) => sum + toNumber(service.total), 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0);
  const totalAdvances = advances.reduce((sum, advance) => sum + toNumber(advance.amount), 0);
  const net = totalDeposit + totalInstantServices - totalExpenses - totalAdvances;

  const topCollectorUsers = await User.find(
    { 'points.date': { $gte: startDate, $lte: endDate } },
    'username points'
  );

  let topCollector = '—';
  if (topCollectorUsers.length) {
    let maxTotal = -Infinity;
    topCollectorUsers.forEach(u => {
      const dailyPoints = u.points
        .filter(p => p.date && new Date(p.date) >= startDate && new Date(p.date) <= endDate)
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      if (dailyPoints > maxTotal) {
        maxTotal = dailyPoints;
        topCollector = u.username;
      }
    });
  }

  // Payment method breakdown
  const pmBreakdown = { cash: 0, vodafone: 0, visa: 0, instapay: 0 };
  bookings.forEach(b => {
    const pm = b.paymentMethod || 'cash';
    pmBreakdown[pm] = (pmBreakdown[pm] || 0) + toNumber(b.deposit);
  });

  // Installments per method
  const bookingsForInstallments = await Booking.find({
    'installments.date': { $gte: startDate, $lte: endDate }
  });
  bookingsForInstallments.forEach(b => {
    b.installments.forEach(ins => {
      if (ins.date >= startDate && ins.date <= endDate) {
        const pm = ins.paymentMethod || 'cash';
        pmBreakdown[pm] = (pmBreakdown[pm] || 0) + toNumber(ins.amount);
      }
    });
  });

  instantServices.forEach(is => {
    const pm = is.paymentMethod || 'cash';
    pmBreakdown[pm] = (pmBreakdown[pm] || 0) + toNumber(is.total);
  });

  // خصم المصروفات والسلف من القناة المناسبة
  expenses.forEach(e => {
    const pm = e.paymentMethod || 'cash';
    pmBreakdown[pm] = (pmBreakdown[pm] || 0) - toNumber(e.amount);
  });
  advances.forEach(a => {
    const pm = a.paymentMethod || 'cash';
    pmBreakdown[pm] = (pmBreakdown[pm] || 0) - toNumber(a.amount);
  });

  return {
    bookingCount,
    totalDeposit,
    instantServiceCount,
    totalInstantServices,
    totalExpenses,
    totalAdvances,
    net,
    hairStraighteningCount,
    topCollector,
    paymentBreakdown: pmBreakdown
  };
};

exports.getDashboardSummary = async (req, res) => {
  const { date } = req.query;
  try {
    // Use cache if ready
    if (dataStore.isReady()) {
      return res.json(dataStore.getDashboardSummary(date));
    }

    // Fallback to MongoDB
    const startDate = date ? new Date(date) : new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);

    const cacheKey = `dashboard:summary:${startDate.toISOString().slice(0, 10)}`;
    const payload = await cacheAside({
      key: cacheKey,
      ttlSeconds: 30,
      staleSeconds: 60,
      fetchFn: () => buildDashboardSummary(startDate, endDate)
    });

    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'خطأ في السيرفر' });
  }
};

exports.getTodayOperations = async (req, res) => {
  const { date } = req.query;
  try {
    // Use cache if ready
    if (dataStore.isReady()) {
      return res.json(dataStore.getTodayOperations(date));
    }

    // Fallback to MongoDB
    const startDate = date ? new Date(date) : new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);

    const [bookings, instantServices, expenses, advances, bookingsWithInstallments, activityLogs] = await Promise.all([
      Booking.find({ createdAt: { $gte: startDate, $lte: endDate } }).populate('package createdBy'),
      InstantService.find({ createdAt: { $gte: startDate, $lte: endDate } }).populate('employeeId services.executedBy'),
      Expense.find({ createdAt: { $gte: startDate, $lte: endDate } }).populate('createdBy'),
      Advance.find({ createdAt: { $gte: startDate, $lte: endDate } }).populate('userId createdBy'),
      Booking.find({ 'installments.date': { $gte: startDate, $lte: endDate } }).populate('installments.employeeId package'),
      ActivityLog.find({ createdAt: { $gte: startDate, $lte: endDate } }).populate('performedBy', 'username')
    ]);

    const operations = [];

    // Map new ActivityLog entries
    activityLogs.forEach(log => {
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
        _id: log._id.toString(),
        entityId: log.entityId ? log.entityId.toString() : null,
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
    bookings.forEach(b => {
      const hasLog = operations.find(op => op.isLog && op.entityId === b._id.toString() && op.actionType === 'CREATE');
      if (!hasLog) {
        operations.push({
          _id: `booking-${b._id}`,
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
    bookingsWithInstallments.forEach(b => {
      b.installments.forEach(ins => {
        if (ins.date >= startDate && ins.date <= endDate) {
          const hasLog = operations.find(op => op.isLog && op.entityId === b._id.toString() && op.actionType === 'CREATE' && op.type === 'إضافة قسط' && op.amount === ins.amount);
          if (!hasLog) {
            operations.push({
              _id: `installment-${b._id}-${ins._id}`,
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
    });

    // Legacy instant services
    instantServices.forEach(is => {
      const serviceNames = is.services.map(s => s.name).join(', ');
      const hasLog = operations.find(op => op.isLog && op.entityId === is._id.toString() && op.actionType === 'CREATE');
      if (!hasLog) {
        operations.push({
          _id: `instant-${is._id}`,
          type: 'خدمة فورية',
          details: serviceNames || 'خدمات متنوعة',
          amount: is.total,
          time: is.createdAt,
          addedBy: is.employeeId?.username || 'غير معروف',
          paymentMethod: is.paymentMethod || 'cash'
        });
      }
    });

    // Legacy expenses
    expenses.forEach(e => {
      const hasLog = operations.find(op => op.isLog && op.entityId === e._id.toString() && op.actionType === 'CREATE');
      if (!hasLog) {
        operations.push({
          _id: `expense-${e._id}`,
          type: 'مصروف',
          details: e.details,
          amount: e.amount,
          time: e.createdAt,
          addedBy: e.createdBy?.username || 'غير معروف',
          paymentMethod: e.paymentMethod || 'cash'
        });
      }
    });

    // Legacy advances
    advances.forEach(a => {
      const hasLog = operations.find(op => op.isLog && op.entityId === a._id.toString() && op.actionType === 'CREATE');
      if (!hasLog) {
        operations.push({
          _id: `advance-${a._id}`,
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
    res.json(operations);
  } catch (err) {
    console.error('Error in getTodayOperations:', err);
    res.status(500).json({ msg: 'خطأ في السيرفر' });
  }
};
