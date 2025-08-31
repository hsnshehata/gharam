const Booking = require('../models/Booking');
const InstantService = require('../models/InstantService');
const Expense = require('../models/Expense');
const Advance = require('../models/Advance');

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