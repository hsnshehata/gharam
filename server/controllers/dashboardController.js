const Booking = require('../models/Booking');
const InstantService = require('../models/InstantService');
const Expense = require('../models/Expense');
const Advance = require('../models/Advance');
const User = require('../models/User');
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

  return {
    bookingCount,
    totalDeposit,
    instantServiceCount,
    totalInstantServices,
    totalExpenses,
    totalAdvances,
    net,
    hairStraighteningCount,
    topCollector
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
