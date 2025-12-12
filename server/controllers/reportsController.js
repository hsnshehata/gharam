const Booking = require('../models/Booking');
const InstantService = require('../models/InstantService');
const Expense = require('../models/Expense');
const Advance = require('../models/Advance');
const Deduction = require('../models/Deduction');
const Service = require('../models/Service');
const User = require('../models/User');

exports.getDailyReport = async (req, res) => {
  const { date } = req.query; // التاريخ على شكل YYYY-MM-DD
  try {
    const startDate = date ? new Date(date) : new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);

    // جلب الحجوزات الجديدة في اليوم
    const bookings = await Booking.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).populate('package hennaPackage photographyPackage createdBy');

    // جلب الحجوزات اللي فيها أقساط اتضافت في اليوم
    const bookingsWithInstallments = await Booking.find({
      'installments.date': { $gte: startDate, $lte: endDate }
    }).populate('package hennaPackage photographyPackage createdBy installments.employeeId');

    // حساب إجمالي العرابين الأولية من الحجوزات الجديدة (deposit ناقص مجموع الأقساط)
    const totalDepositFromBookings = bookings.reduce((sum, booking) => {
      const installmentsSum = booking.installments.reduce((s, inst) => s + inst.amount, 0);
      return sum + (booking.deposit - installmentsSum);
    }, 0);

    // حساب إجمالي الأقساط اللي اتضافت في اليوم
    const totalInstallments = bookingsWithInstallments.reduce((sum, booking) => {
      return sum + booking.installments
        .filter(installment => {
          const installmentDate = new Date(installment.date);
          return installmentDate >= startDate && installmentDate <= endDate;
        })
        .reduce((sum, installment) => sum + installment.amount, 0);
    }, 0);

    // إجمالي المدفوعات من الحجوزات = العرابين الأولية + الأقساط
    const totalDeposit = totalDepositFromBookings + totalInstallments;

    // جلب الخدمات الفورية
    const instantServices = await InstantService.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).populate('employeeId services');

    // جلب المصروفات
    const expenses = await Expense.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).populate('userId createdBy');

    // جلب السلف
    const advances = await Advance.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).populate('userId createdBy');

    // حساب الإجماليات
    const totalInstantServices = instantServices.reduce((sum, service) => sum + service.total, 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalAdvances = advances.reduce((sum, advance) => sum + advance.amount, 0);
    const net = totalDeposit + totalInstantServices - totalExpenses - totalAdvances;

    // تجميع العمليات في قايمة واحدة
    const operations = [
      ...bookings.map(booking => {
        const installmentsSum = booking.installments.reduce((s, inst) => s + inst.amount, 0);
        const initialDeposit = booking.deposit - installmentsSum;
        return {
          type: 'booking',
          details: `حجز لـ ${booking.clientName} (باكدج: ${booking.package.name})`,
          amount: initialDeposit,
          createdAt: booking.createdAt,
          createdBy: booking.createdBy?.username || 'غير معروف'
        };
      }),
      ...bookingsWithInstallments.flatMap(booking => 
        booking.installments
          .filter(installment => {
            const installmentDate = new Date(installment.date);
            return installmentDate >= startDate && installmentDate <= endDate;
          })
          .map(installment => ({
            type: 'installment',
            details: `قسط لـ ${booking.clientName} (رقم الوصل: ${booking.receiptNumber})`,
            amount: installment.amount,
            createdAt: installment.date,
            createdBy: installment.employeeId?.username || 'غير معروف'
          }))
      ),
      ...instantServices.map(service => ({
        type: 'instantService',
        details: `خدمة فورية (${service.services.map(s => s.name).join(', ')})`,
        amount: service.total,
        createdAt: service.createdAt,
        createdBy: service.employeeId?.username || 'غير معروف'
      })),
      ...expenses.map(expense => ({
        type: 'expense',
        details: expense.details,
        amount: expense.amount,
        createdAt: expense.createdAt,
        createdBy: expense.createdBy?.username || expense.userId?.username || 'غير معروف'
      })),
      ...advances.map(advance => ({
        type: 'advance',
        details: `سلفة لـ ${advance.userId?.username || 'غير معروف'}`,
        amount: advance.amount,
        createdAt: advance.createdAt,
        createdBy: advance.createdBy?.username || advance.userId?.username || 'غير معروف'
      }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      summary: {
        totalDeposit,
        totalInstantServices,
        totalExpenses,
        totalAdvances,
        net
      },
      operations
    });
  } catch (err) {
    console.error(err);
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