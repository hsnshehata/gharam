const Booking = require('../models/Booking');
const InstantService = require('../models/InstantService');
const Expense = require('../models/Expense');
const Advance = require('../models/Advance');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { cacheAside } = require('../services/cache');

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
  const { date } = req.query; // التاريخ على شكل YYYY-MM-DD
  try {
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
                   log.entityType === 'Installment' ? 'إضافة قسط' : 'إضافة';
      } else if (log.action === 'UPDATE') {
        typeLabel = log.entityType === 'Booking' ? 'تعديل حجز' :
                   log.entityType === 'InstantService' ? 'تعديل خدمة فورية' :
                   log.entityType === 'Expense' ? 'تعديل مصروف' :
                   log.entityType === 'Advance' ? 'تعديل سلفة' : 'تعديل';
      } else if (log.action === 'DELETE') {
        typeLabel = log.entityType === 'Booking' ? 'حذف حجز' :
                   log.entityType === 'InstantService' ? 'حذف خدمة فورية' :
                   log.entityType === 'Expense' ? 'حذف مصروف' :
                   log.entityType === 'Advance' ? 'حذف سلفة' : 'حذف';
      }

      operations.push({
        _id: log._id.toString(),
        entityId: log.entityId ? log.entityId.toString() : null,
        actionType: log.action, // 'CREATE', 'UPDATE', 'DELETE'
        type: typeLabel,
        details: log.details,
        amount: log.amount || 0,
        time: log.createdAt,
        addedBy: log.performedBy?.username || 'غير معروف',
        paymentMethod: log.paymentMethod || '-',
        isLog: true // Flag to identify new logs
      });
    });

    // For backward compatibility (legacy data without ActivityLog)
    // We only add old ones IF there are NO new logs for them recently
    // Easiest is to just include them but marked as legacy "CREATE" if ActivityLog is empty
    // To prevent total duplication, since we just launched this, 
    // we can keep the old logic but ONLY for CREATE of legacy records.
    // However, it's safer to just return the combined list and sort descending.
    // User will see old "حجز جديد" and new "إضافة حجز" side by side for today.
    // Starting tomorrow, old logic will just be redundant but harmless, or we can remove old logic later.

    // 1. New Bookings (Legacy)
    bookings.forEach(b => {
      // Skip if we already logged this creation in ActivityLog (starts today)
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

    // 2. Installments (Legacy)
    bookingsWithInstallments.forEach(b => {
      b.installments.forEach(ins => {
        if (ins.date >= startDate && ins.date <= endDate) {
          // Because installments use the booking _id in legacy, we check by exact time or related entity
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

    // 3. Instant Services (Legacy)
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

    // 4. Expenses (Legacy)
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

    // 5. Advances (Legacy)
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

    // Sort by time descending
    operations.sort((a, b) => new Date(b.time) - new Date(a.time));

    res.json(operations);
  } catch (err) {
    console.error('Error in getTodayOperations:', err);
    res.status(500).json({ msg: 'خطأ في السيرفر' });
  }
};
