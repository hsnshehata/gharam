const Booking = require('../models/Booking');
const InstantService = require('../models/InstantService');
const Expense = require('../models/Expense');
const Advance = require('../models/Advance');
const User = require('../models/User');

exports.getDashboardSummary = async (req, res) => {
  const { date } = req.query; // التاريخ على شكل YYYY-MM-DD
  try {
    const startDate = date ? new Date(date) : new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);

    // جلب الحجوزات الجديدة اليوم
    const bookings = await Booking.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).populate('package');

    // حساب إجمالي العرابين من الحجوزات الجديدة
    const totalDepositFromBookings = bookings.reduce((sum, booking) => sum + booking.deposit, 0);

    // تجميع سريع للأقساط في اليوم الحالي لتفادي أي حالات تفويت
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

    const totalInstallments = installmentAgg.length ? installmentAgg[0].total : 0;

    // إجمالي العرابين = عرابين الحجوزات الجديدة + كل الأقساط المضافة اليوم
    const totalDeposit = totalDepositFromBookings + totalInstallments;

    // جلب الخدمات الفورية
    const instantServices = await InstantService.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).populate('services');

    // عدد الخدمات الفردية (الخدمات الفورية "شغل جديد") في اليوم
    const hairStraighteningCount = instantServices.length;

    // جلب المصروفات
    const expenses = await Expense.find({
      createdAt: { $gte: startDate, $lte: endDate }
    });

    // جلب السلف
    const advances = await Advance.find({
      createdAt: { $gte: startDate, $lte: endDate }
    });

    // حساب الإجماليات
    const bookingCount = bookings.length;
    const instantServiceCount = instantServices.length;
    const totalInstantServices = instantServices.reduce((sum, service) => sum + service.total, 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalAdvances = advances.reduce((sum, advance) => sum + advance.amount, 0);
    const net = totalDeposit + totalInstantServices - totalExpenses - totalAdvances;

    // حساب الموظف الأعلى تحصيلاً بناءً على نقاط الموظفين في هذا اليوم
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

    res.json({
      bookingCount,
      totalDeposit,
      instantServiceCount,
      totalInstantServices,
      totalExpenses,
      totalAdvances,
      net,
      hairStraighteningCount,
      topCollector
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'خطأ في السيرفر' });
  }
};