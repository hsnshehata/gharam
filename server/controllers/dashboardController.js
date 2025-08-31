const Booking = require('../models/Booking');
const InstantService = require('../models/InstantService');
const Expense = require('../models/Expense');
const Advance = require('../models/Advance');

exports.getDashboardSummary = async (req, res) => {
  const { date } = req.query; // التاريخ على شكل YYYY-MM-DD
  try {
    const startDate = date ? new Date(date) : new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);

    // جلب الحجوزات الجديدة
    const bookings = await Booking.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).populate('package');

    // جلب الحجوزات اللي فيها أقساط اتضافت في اليوم
    const bookingsWithInstallments = await Booking.find({
      'installments.date': { $gte: startDate, $lte: endDate }
    }).populate('package installments.employeeId');

    // حساب إجمالي العرابين من الحجوزات الجديدة
    const totalDepositFromBookings = bookings.reduce((sum, booking) => sum + booking.deposit, 0);

    // حساب إجمالي الأقساط اللي اتضافت في اليوم
    const totalInstallments = bookingsWithInstallments.reduce((sum, booking) => {
      return sum + booking.installments
        .filter(installment => {
          const installmentDate = new Date(installment.date);
          return installmentDate >= startDate && installmentDate <= endDate;
        })
        .reduce((sum, installment) => sum + installment.amount, 0);
    }, 0);

    // إجمالي العرابين = العرابين الإبتدائية + الأقساط
    const totalDeposit = totalDepositFromBookings + totalInstallments;

    // جلب الخدمات الفورية
    const instantServices = await InstantService.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).populate('services');

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

    res.json({
      bookingCount,
      totalDeposit,
      instantServiceCount,
      totalInstantServices,
      totalExpenses,
      totalAdvances,
      net
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'خطأ في السيرفر' });
  }
};