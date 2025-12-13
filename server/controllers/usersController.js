const User = require('../models/User');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const LEVEL_THRESHOLDS = [0, 3000, 8000, 18000, 38000, 73000, 118000, 178000, 268000, 418000];
const MAX_LEVEL = 10;

const getLevel = (totalPoints = 0) => {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i -= 1) {
    if (totalPoints >= LEVEL_THRESHOLDS[i]) {
      return Math.min(i + 1, MAX_LEVEL);
    }
  }
  return 1;
};

const getCoinValue = (level) => Math.min(level, MAX_LEVEL) * 100;

const ensureArrays = (user) => {
  if (!Array.isArray(user.points)) user.points = [];
  if (!Array.isArray(user.efficiencyCoins)) user.efficiencyCoins = [];
  if (!Array.isArray(user.coinsRedeemed)) user.coinsRedeemed = [];
};

const recomputeConvertible = (user) => {
  const totalCoinsEarned = (user.efficiencyCoins?.length || 0) + (user.coinsRedeemed?.length || 0);
  user.convertiblePoints = Math.max(0, (user.totalPoints || 0) - (totalCoinsEarned * 1000));
};

const addPointsAndConvert = async (userId, amount, meta = {}) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  ensureArrays(user);

  const pointId = new mongoose.Types.ObjectId();
  const point = {
    _id: pointId,
    amount,
    date: new Date(),
    bookingId: meta.bookingId || null,
    serviceId: meta.serviceId || null,
    serviceName: meta.serviceName || null,
    instantServiceId: meta.instantServiceId || null,
    receiptNumber: meta.receiptNumber || null
  };

  user.points.push(point);
  user.totalPoints = (user.totalPoints || 0) + amount;
  user.convertiblePoints = (user.convertiblePoints || 0) + amount;

  // تحديث المستوى الحالي بعد إضافة النقاط
  user.level = getLevel(user.totalPoints);

  await user.save();
  return user;
};

const removePointsAndCoins = async (userId, matchFn) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  ensureArrays(user);

  const targetPoint = user.points.find(matchFn);
  if (!targetPoint) return user;

  // احذف العملات المرتبطة بنفس الـ point
  const pointIdStr = targetPoint._id?.toString();
  user.efficiencyCoins = user.efficiencyCoins.filter(c => c.sourcePointId?.toString() !== pointIdStr);

  user.totalPoints = Math.max(0, (user.totalPoints || 0) - (targetPoint.amount || 0));

  recomputeConvertible(user);

  user.level = getLevel(user.totalPoints);
  user.points = user.points.filter(p => p._id?.toString() !== pointIdStr);

  await user.save();
  return user;
};

exports.addUser = async (req, res) => {
  const { username, password, confirmPassword, role, monthlySalary, phone } = req.body;
  if (password !== confirmPassword) return res.status(400).json({ msg: 'Passwords do not match' });

  try {
    let user = await User.findOne({ username });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    user = new User({
      username,
      password: await bcrypt.hash(password, 10),
      role,
      monthlySalary,
      remainingSalary: monthlySalary,
      phone
    });
    await user.save();
    res.json({ msg: 'User added successfully', user: { id: user.id, username, role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.updateUser = async (req, res) => {
  const { username, password, confirmPassword, role, monthlySalary, phone } = req.body;
  if (password && password !== confirmPassword) return res.status(400).json({ msg: 'Passwords do not match' });

  try {
    const updateData = { username, role, monthlySalary, phone };
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    if (monthlySalary !== undefined) {
      updateData.remainingSalary = monthlySalary;
    }
    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json({ msg: 'User updated successfully', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json({ msg: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.addPoints = async (req, res) => {
  const { points, bookingId, serviceId } = req.body;
  try {
    const user = await addPointsAndConvert(req.user.id, points, { bookingId, serviceId, serviceName: null, receiptNumber: null });
    res.json({ msg: 'Points added successfully', user: { id: user.id, username: user.username, points: user.points, totalPoints: user.totalPoints, efficiencyCoins: user.efficiencyCoins } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getPointsSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    ensureArrays(user);

    // تأكد من اتساق الرصيد القابل للتحويل مع إجمالي النقاط والعملات
    recomputeConvertible(user);
    await user.save();

    const totalPoints = user.totalPoints || 0;
    const level = user.level || getLevel(totalPoints);
    const currentLevelStart = LEVEL_THRESHOLDS[level - 1] || 0;
    const nextLevelTarget = level >= MAX_LEVEL ? LEVEL_THRESHOLDS[MAX_LEVEL - 1] : LEVEL_THRESHOLDS[level];
    const progressCurrent = Math.max(0, totalPoints - currentLevelStart);
    const progressNeeded = level >= MAX_LEVEL ? 0 : Math.max(1, nextLevelTarget - currentLevelStart);
    const progressPercent = level >= MAX_LEVEL ? 100 : Math.min(100, Math.round((progressCurrent / progressNeeded) * 100));

    const coins = user.efficiencyCoins || [];
    const coinsByLevel = coins.reduce((acc, c) => {
      acc[c.level] = (acc[c.level] || 0) + 1;
      return acc;
    }, {});
    const coinsTotalValue = coins.reduce((sum, c) => sum + (c.value || 0), 0);

    res.json({
      totalPoints,
      level,
      currentCoinValue: getCoinValue(level),
      convertiblePoints: user.convertiblePoints || 0,
      coins: {
        totalCount: coins.length,
        totalValue: coinsTotalValue,
        byLevel: coinsByLevel
      },
      progress: {
        current: progressCurrent,
        target: progressNeeded,
        nextLevelTarget,
        percent: progressPercent
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.convertPointsToCoins = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    ensureArrays(user);

    const convertible = Math.floor((user.convertiblePoints || 0) / 1000);
    if (convertible < 1) return res.status(400).json({ msg: 'لا توجد نقاط كافية للتحويل' });

    const coinLevel = getLevel(user.totalPoints || 0);
    const coinValue = getCoinValue(coinLevel);
    const mintedCoins = [];

    for (let i = 0; i < convertible; i += 1) {
      mintedCoins.push({
        level: coinLevel,
        value: coinValue,
        earnedAt: new Date(),
        sourcePointId: null,
        receiptNumber: null
      });
    }

    user.efficiencyCoins.push(...mintedCoins);
    recomputeConvertible(user);
    user.level = getLevel(user.totalPoints || 0);

    await user.save();

    res.json({
      msg: 'تم تحويل النقاط إلى عملات',
      mintedCoins: mintedCoins.length,
      coinLevel,
      coinValue,
      convertiblePoints: user.convertiblePoints || 0,
      totalCoins: user.efficiencyCoins.length
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.redeemCoins = async (req, res) => {
  try {
    const { count } = req.body;
    if (!count || count <= 0) return res.status(400).json({ msg: 'حدد عدد العملات للاستبدال' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    ensureArrays(user);

    if (user.efficiencyCoins.length < count) {
      return res.status(400).json({ msg: 'عدد العملات المتاحة أقل من المطلوب' });
    }

    // استهلاك الأقدم أولاً
    const coinsToRedeem = user.efficiencyCoins
      .slice(0, count)
      .map(c => ({ ...c.toObject?.() || c }));

    user.efficiencyCoins = user.efficiencyCoins.slice(count);

    const totalRedeemedValue = coinsToRedeem.reduce((sum, c) => sum + (c.value || 0), 0);

    coinsToRedeem.forEach(c => {
      user.coinsRedeemed.push({
        level: c.level,
        value: c.value,
        redeemedAt: new Date(),
        sourcePointId: c.sourcePointId || null
      });
    });

    // إضافة المكافأة للراتب الحالي
    user.remainingSalary = (user.remainingSalary || 0) + totalRedeemedValue;

    // إعادة حساب الرصيد القابل للتحويل بعد استهلاك العملات
    recomputeConvertible(user);

    await user.save();

    res.json({
      msg: 'تم استبدال العملات وإضافتها للراتب الحالي',
      redeemedCoins: coinsToRedeem.length,
      totalValue: totalRedeemedValue,
      remainingCoins: user.efficiencyCoins.length,
      remainingSalary: user.remainingSalary
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Internal helpers for other controllers
exports.addPointsAndConvertInternal = addPointsAndConvert;
exports.removePointsAndCoinsInternal = removePointsAndCoins;
exports.getLevelInternal = getLevel;
exports.getCoinValueInternal = getCoinValue;