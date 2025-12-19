const Booking = require('../models/Booking');
const InstantService = require('../models/InstantService');
const Expense = require('../models/Expense');
const Advance = require('../models/Advance');
const Deduction = require('../models/Deduction');
const Service = require('../models/Service');
const User = require('../models/User');

const msInDay = 1000 * 60 * 60 * 24;

const flattenPoints = (points) => {
  if (!Array.isArray(points)) return [];
  return points.flatMap((p) => (Array.isArray(p) ? p : [p])).filter(Boolean);
};

const leaderboardPoints = async (startDate, endDate) => {
  const users = await User.find({ 'points.date': { $gte: startDate, $lte: endDate } }, 'username role points');
  return users
    .map((u) => {
      const total = flattenPoints(u.points)
        .filter((p) => p.date && new Date(p.date) >= startDate && new Date(p.date) <= endDate)
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      return { username: u.username, role: u.role, points: total };
    })
    .filter((u) => u.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, 5);
};

const aggregateReport = async ({ startDate, endDate, includeOperations = false, includeDailyBreakdown = false }) => {
  const bookings = await Booking.find({
    createdAt: { $gte: startDate, $lte: endDate }
  }).populate('package createdBy');

  const bookingsWithInstallments = await Booking.find({
    'installments.date': { $gte: startDate, $lte: endDate }
  }).populate('package hennaPackage photographyPackage createdBy installments.employeeId');

  const instantServices = await InstantService.find({
    createdAt: { $gte: startDate, $lte: endDate }
  }).populate('employeeId services');

  const expenses = await Expense.find({
    createdAt: { $gte: startDate, $lte: endDate }
  }).populate('userId createdBy');

  const advances = await Advance.find({
    createdAt: { $gte: startDate, $lte: endDate }
  }).populate('userId createdBy');

  const dailyMap = new Map();

  const addToDay = (date, amount) => {
    if (!includeDailyBreakdown) return;
    const key = new Date(date);
    key.setHours(0, 0, 0, 0);
    const iso = key.toISOString().slice(0, 10);
    const current = dailyMap.get(iso) || 0;
    dailyMap.set(iso, current + (amount || 0));
  };

  const totalDepositFromBookings = bookings.reduce((sum, booking) => {
    const installmentsSum = booking.installments.reduce((s, inst) => s + inst.amount, 0);
    const initialDeposit = booking.deposit - installmentsSum;
    addToDay(booking.createdAt, initialDeposit);
    return sum + initialDeposit;
  }, 0);

  const totalInstallments = bookingsWithInstallments.reduce((sum, booking) => {
    return (
      sum +
      booking.installments
        .filter((installment) => {
          const installmentDate = new Date(installment.date);
          const inRange = installmentDate >= startDate && installmentDate <= endDate;
          if (inRange) addToDay(installment.date, installment.amount);
          return inRange;
        })
        .reduce((s, installment) => s + installment.amount, 0)
    );
  }, 0);

  const totalDeposit = totalDepositFromBookings + totalInstallments;
  const totalInstantServices = instantServices.reduce((sum, service) => {
    addToDay(service.createdAt, service.total);
    return sum + service.total;
  }, 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalAdvances = advances.reduce((sum, advance) => sum + advance.amount, 0);
  const net = totalDeposit + totalInstantServices - totalExpenses - totalAdvances;

  const packageMix = { makeup: 0, photography: 0, unknown: 0 };
  const topPackagesMap = new Map();

  bookings.forEach((booking) => {
    const installmentsSum = booking.installments.reduce((s, inst) => s + inst.amount, 0);
    const initialDeposit = booking.deposit - installmentsSum;
    const pkgType = booking.package?.type || 'unknown';
    packageMix[pkgType] = (packageMix[pkgType] || 0) + initialDeposit;
    const pkgName = booking.package?.name || 'باكدج غير محدد';
    const current = topPackagesMap.get(pkgName) || { name: pkgName, count: 0, amount: 0 };
    topPackagesMap.set(pkgName, { name: pkgName, count: current.count + 1, amount: current.amount + initialDeposit });
  });

  bookingsWithInstallments.forEach((booking) => {
    const pkgType = booking.package?.type || 'unknown';
    const pkgName = booking.package?.name || 'باكدج غير محدد';
    booking.installments
      .filter((inst) => {
        const d = new Date(inst.date);
        return d >= startDate && d <= endDate;
      })
      .forEach((inst) => {
        packageMix[pkgType] = (packageMix[pkgType] || 0) + inst.amount;
        const current = topPackagesMap.get(pkgName) || { name: pkgName, count: 0, amount: 0 };
        topPackagesMap.set(pkgName, { name: pkgName, count: current.count + 0, amount: current.amount + inst.amount });
      });
  });

  const topPackages = Array.from(topPackagesMap.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const topServicesMap = new Map();
  instantServices.forEach((service) => {
    (service.services || []).forEach((s) => {
      const current = topServicesMap.get(s.name) || { name: s.name, count: 0, amount: 0 };
      topServicesMap.set(s.name, { name: s.name, count: current.count + 1, amount: current.amount + (s.price || 0) });
    });
  });

  const topServices = Array.from(topServicesMap.values())
    .sort((a, b) => b.count - a.count || b.amount - a.amount)
    .slice(0, 5);

  const daysCount = Math.max(1, Math.round((endDate - startDate) / msInDay) + 1);
  const gross = totalDeposit + totalInstantServices;
  const expenseRatio = gross ? Number(((totalExpenses + totalAdvances) / gross).toFixed(3)) : 0;
  const averageNetPerDay = Number((net / daysCount).toFixed(2));

  const topEarners = await leaderboardPoints(startDate, endDate);

  const dailyRevenue = includeDailyBreakdown
    ? (() => {
        const days = [];
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const iso = new Date(d).toISOString().slice(0, 10);
          days.push({ date: iso, total: Number((dailyMap.get(iso) || 0).toFixed(2)) });
        }
        return days;
      })()
    : [];

  const revenueStreams = [
    { label: 'حجوزات وأقساط', value: totalDeposit },
    { label: 'شغل فوري', value: totalInstantServices }
  ];

  const outflows = [
    { label: 'مصروفات', value: totalExpenses },
    { label: 'سلف', value: totalAdvances }
  ];

  const operations = includeOperations
    ? [
        ...bookings.map((booking) => {
          const installmentsSum = booking.installments.reduce((s, inst) => s + inst.amount, 0);
          const initialDeposit = booking.deposit - installmentsSum;
          return {
            type: 'booking',
            details: `حجز لـ ${booking.clientName} (باكدج: ${booking.package?.name || 'غير محدد'})`,
            amount: initialDeposit,
            createdAt: booking.createdAt,
            createdBy: booking.createdBy?.username || 'غير معروف'
          };
        }),
        ...bookingsWithInstallments.flatMap((booking) =>
          booking.installments
            .filter((installment) => {
              const installmentDate = new Date(installment.date);
              return installmentDate >= startDate && installmentDate <= endDate;
            })
            .map((installment) => ({
              type: 'installment',
              details: `قسط لـ ${booking.clientName} (رقم الوصل: ${booking.receiptNumber})`,
              amount: installment.amount,
              createdAt: installment.date,
              createdBy: installment.employeeId?.username || 'غير معروف'
            }))
        ),
        ...instantServices.map((service) => ({
          type: 'instantService',
          details: `خدمة فورية (${service.services.map((s) => s.name).join(', ')})`,
          amount: service.total,
          createdAt: service.createdAt,
          createdBy: service.employeeId?.username || 'غير معروف'
        })),
        ...expenses.map((expense) => ({
          type: 'expense',
          details: expense.details,
          amount: expense.amount,
          createdAt: expense.createdAt,
          createdBy: expense.createdBy?.username || expense.userId?.username || 'غير معروف'
        })),
        ...advances.map((advance) => ({
          type: 'advance',
          details: `سلفة لـ ${advance.userId?.username || 'غير معروف'}`,
          amount: advance.amount,
          createdAt: advance.createdAt,
          createdBy: advance.createdBy?.username || advance.userId?.username || 'غير معروف'
        }))
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    : [];

  return {
    summary: {
      totalDeposit,
      totalInstantServices,
      totalExpenses,
      totalAdvances,
      net
    },
    operations,
    analytics: {
      revenueStreams,
      outflows,
      packageMix,
      topPackages,
      topServices,
      topEarners,
      stats: {
        gross,
        expenseRatio,
        averageNetPerDay,
        daysCount
      },
      dailyRevenue
    }
  };
};

exports.getDailyReport = async (req, res) => {
  const { date } = req.query;
  try {
    const startDate = date ? new Date(date) : new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);

    const payload = await aggregateReport({ startDate, endDate, includeOperations: true });
    res.json(payload);
  } catch (err) {
    console.error('Error in getDailyReport:', err);
    res.status(500).json({ msg: 'خطأ في السيرفر' });
  }
};

exports.getMonthlyReport = async (req, res) => {
  try {
    const { month } = req.query; // شكل YYYY-MM
    const target = month ? new Date(`${month}-01`) : new Date();
    if (Number.isNaN(target.getTime())) return res.status(400).json({ msg: 'شهر غير صالح' });

    const startDate = new Date(target.getFullYear(), target.getMonth(), 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(target.getFullYear(), target.getMonth() + 1, 0, 23, 59, 59, 999);

    const payload = await aggregateReport({ startDate, endDate, includeOperations: false, includeDailyBreakdown: true });
    payload.meta = {
      label: startDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })
    };
    res.json(payload);
  } catch (err) {
    console.error('Error in getMonthlyReport:', err);
    res.status(500).json({ msg: 'خطأ في السيرفر' });
  }
};

exports.getRangeReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ msg: 'تاريخ البداية والنهاية مطلوبان' });
    const startDate = new Date(from);
    const endDate = new Date(to);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(400).json({ msg: 'التواريخ غير صالحة' });
    }
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const payload = await aggregateReport({ startDate, endDate, includeOperations: false });
    payload.meta = {
      from,
      to
    };
    res.json(payload);
  } catch (err) {
    console.error('Error in getRangeReport:', err);
    res.status(500).json({ msg: 'خطأ في السيرفر' });
  }
};

exports.getEmployeeReport = async (req, res) => {
  const { userId, from, to } = req.query;

  try {
    // السماح فقط للادمن والمشرف
    if (!req.user?.role || !['admin', 'supervisor'].includes(req.user.role)) {
      return res.status(403).json({ msg: 'غير مصرح' });
    }

    if (!userId) return res.status(400).json({ msg: 'معرف الموظف مطلوب' });
    const startDate = from ? new Date(from) : null;
    const endDate = to ? new Date(to) : null;
    if (startDate) startDate.setHours(0, 0, 0, 0);
    if (endDate) endDate.setHours(23, 59, 59, 999);

    const user = await User.findById(userId).select('username role points remainingSalary monthlySalary');
    if (!user) return res.status(404).json({ msg: 'الموظف غير موجود' });

    const inRange = (date) => {
      const d = new Date(date);
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    };

    // الشغل = النقاط المسجلة على الموظف
    const rawPoints = Array.isArray(user.points)
      ? user.points.flatMap(p => Array.isArray(p) ? p : [p])
      : [];

    const workPoints = rawPoints
      .filter(p => p && p.date && inRange(p.date))
      .map(p => ({
        amount: p.amount || 0,
        date: p.date,
        bookingId: p.bookingId || null,
        serviceId: p.serviceId || null,
        serviceName: p.serviceName || null,
        receiptNumber: p.receiptNumber || null,
        instantServiceId: p.instantServiceId || null
      }));

    const bookingIds = [...new Set(workPoints.map(p => p.bookingId).filter(Boolean))];
    const serviceIds = [...new Set(workPoints.map(p => p.serviceId).filter(Boolean))];
    const instantIds = [...new Set(workPoints.map(p => p.instantServiceId).filter(Boolean))];

    const [bookingsMap, servicesMap, instantMap] = await Promise.all([
      (async () => {
        if (!bookingIds.length) return {};
        const list = await Booking.find({ _id: { $in: bookingIds } }).select('receiptNumber');
        return list.reduce((acc, b) => { acc[b._id.toString()] = b; return acc; }, {});
      })(),
      (async () => {
        if (!serviceIds.length) return {};
        const list = await Service.find({ _id: { $in: serviceIds } }).select('name');
        return list.reduce((acc, s) => { acc[s._id.toString()] = s; return acc; }, {});
      })(),
      (async () => {
        if (!instantIds.length) return {};
        const list = await InstantService.find({ _id: { $in: instantIds } }).select('receiptNumber services');
        return list.reduce((acc, i) => { acc[i._id.toString()] = i; return acc; }, {});
      })()
    ]);

    const workWithNames = workPoints.map(p => {
      const bookingKey = p.bookingId ? p.bookingId.toString() : null;
      const serviceKey = p.serviceId ? p.serviceId.toString() : null;
      const instantKey = p.instantServiceId ? p.instantServiceId.toString() : null;
      const receipt = p.receiptNumber
        || (instantKey && instantMap[instantKey] ? instantMap[instantKey].receiptNumber || '-' : null)
        || (bookingKey && bookingsMap[bookingKey] ? bookingsMap[bookingKey].receiptNumber || '-' : '-');
      const serviceFromInstant = (instantKey && instantMap[instantKey])
        ? (instantMap[instantKey].services || []).find(s => s._id?.toString() === serviceKey)
        : null;
      return {
        ...p,
        bookingReceipt: receipt || '-',
        serviceName: p.serviceName
          || (serviceFromInstant ? (serviceFromInstant.name || '-') : null)
          || (serviceKey && servicesMap[serviceKey]
            ? (servicesMap[serviceKey].name || '-')
            : '-')
      };
    });

    const rangeQuery = (startDate || endDate)
      ? { createdAt: { ...(startDate ? { $gte: startDate } : {}), ...(endDate ? { $lte: endDate } : {}) } }
      : {};

    const advances = await Advance.find({ userId, ...rangeQuery }).populate('createdBy', 'username');

    const deductions = await Deduction.find({ userId, ...rangeQuery }).populate('createdBy', 'username');

    const pointsTotal = workPoints.reduce((sum, p) => sum + (p.amount || 0), 0);
    const advancesTotal = advances.reduce((sum, a) => sum + (a.amount || 0), 0);
    const deductionsTotal = deductions.reduce((sum, d) => sum + (d.amount || 0), 0);

    res.json({
      user: { id: user._id, username: user.username, role: user.role, remainingSalary: user.remainingSalary, monthlySalary: user.monthlySalary },
      range: { from: from || null, to: to || null },
      work: workWithNames,
      advances,
      deductions,
      totals: {
        pointsTotal,
        advancesTotal,
        deductionsTotal
      }
    });
  } catch (err) {
    console.error('Error in getEmployeeReport:', err);
    res.status(500).json({ msg: 'خطأ في السيرفر' });
  }
};