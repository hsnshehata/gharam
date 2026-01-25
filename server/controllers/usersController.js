const User = require('../models/User');
const Booking = require('../models/Booking');
const InstantService = require('../models/InstantService');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { resetAllSalaries } = require('../services/salaryResetService');
const { cacheAside, deleteByPrefix } = require('../services/cache');

const LEVEL_THRESHOLDS = [0, 3000, 8000, 18000, 38000, 73000, 118000, 178000, 268000, 418000];
const COIN_VALUES = [0, 100, 150, 200, 250, 300, 350, 400, 450, 500, 600];
const MAX_LEVEL = 10;

const clearUserCache = async (userId) => {
  if (!userId) return;
  await deleteByPrefix(`user:${userId}:`);
};

const isInRange = (dateValue, start, end) => {
  if (!dateValue) return false;
  const dt = new Date(dateValue);
  if (Number.isNaN(dt.getTime())) return false;
  return dt >= start && dt <= end;
};

const getLevel = (totalPoints = 0) => {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i -= 1) {
    if (totalPoints >= LEVEL_THRESHOLDS[i]) {
      return Math.min(i + 1, MAX_LEVEL);
    }
  }
  return 1;
};

const getCoinValue = (level) => {
  const lvl = Math.min(level, MAX_LEVEL);
  return COIN_VALUES[lvl] || 100;
};

const ensureArrays = (user) => {
  if (!Array.isArray(user.points)) user.points = [];
  if (!Array.isArray(user.efficiencyCoins)) user.efficiencyCoins = [];
  if (!Array.isArray(user.coinsRedeemed)) user.coinsRedeemed = [];
};

const isAdmin = (req) => req?.user?.role === 'admin';

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
    receiptNumber: meta.receiptNumber || null,
    type: meta.type || 'work',
    note: meta.note || null,
    giftedBy: meta.giftedBy || null,
    giftedByName: meta.giftedByName || null,
    status: 'applied'
  };

  user.points.push(point);
  user.totalPoints = (user.totalPoints || 0) + amount;
  user.convertiblePoints = (user.convertiblePoints || 0) + amount;

  // تحديث المستوى الحالي بعد إضافة النقاط
  user.level = getLevel(user.totalPoints);

  await user.save();
  await clearUserCache(userId);
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
  await clearUserCache(userId);
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

exports.resetSalaries = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ msg: 'صلاحية غير كافية' });

  try {
    const result = await resetAllSalaries('manual-api');
    res.json({ msg: 'تم إعادة شحن رواتب جميع الموظفين', result });
  } catch (err) {
    console.error('Error resetting salaries:', err);
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

exports.giftPoints = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ msg: 'صلاحية غير كافية' });

  const { userId, amount, note } = req.body;
  const pointsValue = Number(amount);
  if (!userId || !pointsValue || pointsValue <= 0) {
    return res.status(400).json({ msg: 'حدد الموظف وقيمة النقاط بشكل صحيح' });
  }

  try {
    const [user, actor] = await Promise.all([
      User.findById(userId),
      User.findById(req.user.id).select('username')
    ]);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    ensureArrays(user);

    const giftedByName = actor?.username || 'الإدارة';

    const pointId = new mongoose.Types.ObjectId();
    const giftPoint = {
      _id: pointId,
      amount: pointsValue,
      date: new Date(),
      type: 'gift',
      note: note || 'هدية نقاط',
      giftedBy: req.user.id,
      giftedByName,
      status: 'pending'
    };

    user.points.push(giftPoint);
    await user.save();
    await clearUserCache(user.id);

    res.json({ msg: 'تم إرسال الهدية، ستظهر للموظف حتى يفتحها', gift: giftPoint });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.giftPointsBulk = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ msg: 'صلاحية غير كافية' });

  const { amount, note } = req.body;
  const pointsValue = Number(amount);
  if (!pointsValue || pointsValue <= 0) {
    return res.status(400).json({ msg: 'حدد قيمة الهدية بشكل صحيح' });
  }

  try {
    const actor = await User.findById(req.user.id).select('username');
    const giftedByName = actor?.username || 'الإدارة';
    const users = await User.find();

    const now = new Date();
    const giftPointTemplate = () => ({
      _id: new mongoose.Types.ObjectId(),
      amount: pointsValue,
      date: now,
      type: 'gift',
      note: note || 'هدية نقاط جماعية',
      giftedBy: req.user.id,
      giftedByName,
      status: 'pending'
    });

    let sent = 0;
    await Promise.all(users.map(async (user) => {
      ensureArrays(user);
      const giftPoint = giftPointTemplate();
      user.points.push(giftPoint);
      await user.save();
      await clearUserCache(user.id);
      sent += 1;
    }));

    res.json({ msg: `تم إرسال الهدية الجماعية إلى ${sent} حساب`, sent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.listPendingGifts = async (req, res) => {
  try {
    const userId = req.user.id;
    const key = `user:${userId}:gifts:pending`;
    const payload = await cacheAside({
      key,
      ttlSeconds: 60,
      staleSeconds: 120,
      fetchFn: async () => {
        const user = await User.findById(userId).select('points username');
        if (!user) throw new Error('User not found');
        ensureArrays(user);
        return { gifts: (user.points || []).filter((p) => p.type === 'gift' && p.status === 'pending') };
      }
    });
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.listTodayGifts = async (req, res) => {
  try {
    const userId = req.user.id;
    const key = `user:${userId}:gifts:today`;
    const payload = await cacheAside({
      key,
      ttlSeconds: 60,
      staleSeconds: 120,
      fetchFn: async () => {
        const user = await User.findById(userId).select('points username');
        if (!user) throw new Error('User not found');
        ensureArrays(user);

        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const end = new Date(start);
        end.setDate(end.getDate() + 1);

        const gifts = (user.points || []).filter((p) => {
          if (p.type !== 'gift' || p.status !== 'applied') return false;
          const dt = p.openedAt || p.date;
          if (!dt) return false;
          const d = new Date(dt);
          return d >= start && d < end;
        }).map((p) => ({
          _id: p._id,
          amount: p.amount,
          note: p.note,
          giftedByName: p.giftedByName || 'الإدارة',
          openedAt: p.openedAt || p.date
        }));

        return { gifts };
      }
    });

    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.openGift = async (req, res) => {
  try {
    const { giftId } = req.params;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    ensureArrays(user);

    const target = (user.points || []).find((p) => p._id?.toString() === giftId && p.type === 'gift' && p.status === 'pending');
    if (!target) return res.status(404).json({ msg: 'لم يتم العثور على هدية بانتظار الفتح' });

    const amount = Number(target.amount) || 0;
    target.status = 'applied';
    target.openedAt = new Date();

    user.totalPoints = (user.totalPoints || 0) + amount;
    user.convertiblePoints = (user.convertiblePoints || 0) + amount;
    recomputeConvertible(user);
    user.level = getLevel(user.totalPoints);

    await user.save();
    await clearUserCache(user.id);

    res.json({ msg: 'تم فتح الهدية وإضافة النقاط', gift: target, totalPoints: user.totalPoints, convertiblePoints: user.convertiblePoints, level: user.level });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.deductPoints = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ msg: 'صلاحية غير كافية' });

  const { userId, amount, reason } = req.body;
  const pointsValue = Number(amount);
  if (!userId || !pointsValue || pointsValue <= 0) {
    return res.status(400).json({ msg: 'حدد الموظف وقيمة الخصم بشكل صحيح' });
  }

  try {
    const [user, actor] = await Promise.all([
      User.findById(userId),
      User.findById(req.user.id).select('username')
    ]);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    ensureArrays(user);

    const giftedByName = actor?.username || 'الإدارة';

    const deduction = Math.min(pointsValue, user.totalPoints || 0);
    const pointId = new mongoose.Types.ObjectId();
    const deductionPoint = {
      _id: pointId,
      amount: -deduction,
      date: new Date(),
      type: 'deduction',
      note: reason || 'خصم نقاط إداري',
      giftedBy: req.user.id,
      giftedByName,
      status: 'applied'
    };

    user.points.push(deductionPoint);
    user.totalPoints = Math.max(0, (user.totalPoints || 0) - deduction);
    user.level = getLevel(user.totalPoints);
    recomputeConvertible(user);

    await user.save();
      await clearUserCache(user.id);

    res.json({ msg: 'تم الخصم وتسجيله', deduction: deductionPoint, totalPoints: user.totalPoints, convertiblePoints: user.convertiblePoints, level: user.level });
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
    const key = `user:${userId}:summary`;
    const payload = await cacheAside({
      key,
      ttlSeconds: 60,
      staleSeconds: 120,
      fetchFn: async () => {
        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');
        ensureArrays(user);

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

        const roleFilter = { role: { $in: ['admin', 'supervisor', 'hallSupervisor', 'employee'] } };
        const higherCount = await User.countDocuments({ ...roleFilter, totalPoints: { $gt: totalPoints } });
        const teamSize = await User.countDocuments(roleFilter);
        const rank = teamSize > 0 ? higherCount + 1 : null;

        // breakdown آخر ٧ أيام من سجلات النقاط (عمل فقط)
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const weeklyBreakdown = Array.from({ length: 7 }).map((_, idx) => {
          const day = new Date(now);
          day.setDate(day.getDate() - (6 - idx));
          day.setHours(0, 0, 0, 0);
          const dayStart = new Date(day);
          const dayEnd = new Date(day);
          dayEnd.setHours(23, 59, 59, 999);
          const label = `${day.getDate()}/${day.getMonth() + 1}`;

          const totals = (user.points || [])
            .filter((p) => p && p.type === 'work' && p.date && new Date(p.date) >= dayStart && new Date(p.date) <= dayEnd)
            .reduce((acc, p) => {
              const amount = Number(p.amount) || 0;
              const isInstant = Boolean(p.instantServiceId);
              const isBooking = !isInstant; // أي سجل شغل بدون فوري يعتبر حجوزات/باكدج
              acc.total += amount;
              if (isBooking) acc.booking += amount;
              if (isInstant) acc.instant += amount;
              return acc;
            }, { total: 0, booking: 0, instant: 0 });

          return { label, ...totals };
        });

        return {
          totalPoints,
          level,
          currentCoinValue: getCoinValue(level),
          convertiblePoints: user.convertiblePoints || 0,
          remainingSalary: user.remainingSalary || 0,
          coins: {
            totalCount: coins.length,
            totalValue: coinsTotalValue,
            byLevel: coinsByLevel
          },
          rank,
          teamSize,
          weeklyBreakdown,
          progress: {
            current: progressCurrent,
            target: progressNeeded,
            nextLevelTarget,
            percent: progressPercent
          }
        };
      }
    });

    res.json(payload);
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
    await clearUserCache(user.id);

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

    await clearUserCache(user.id);

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
// جلب كل الخدمات اللي نفذها الموظف في تاريخ محدد (حسب وقت التنفيذ الفعلي)
exports.getExecutedServices = async (req, res) => {
  const { date } = req.query;
  const employeeId = req.user.id;

  const start = date ? new Date(date) : new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);

  try {
    const key = `user:${employeeId}:executed:${start.toISOString().slice(0, 10)}`;
    const payload = await cacheAside({
      key,
      ttlSeconds: 60,
      staleSeconds: 120,
      fetchFn: async () => {
        const bookings = await Booking.find({
      $or: [
        {
          packageServices: {
            $elemMatch: {
              executed: true,
              executedBy: employeeId,
              executedAt: { $gte: start, $lte: end }
            }
          }
        },
        {
          hairStraighteningExecuted: true,
          hairStraighteningExecutedBy: employeeId,
          hairStraighteningExecutedAt: { $gte: start, $lte: end }
        },
        {
          hairDyeExecuted: true,
          hairDyeExecutedBy: employeeId,
          hairDyeExecutedAt: { $gte: start, $lte: end }
        }
      ]
        })
          .select('receiptNumber clientName packageServices hairStraightening hairStraighteningPrice hairStraighteningExecuted hairStraighteningExecutedBy hairStraighteningExecutedAt hairDye hairDyePrice hairDyeExecuted hairDyeExecutedBy hairDyeExecutedAt createdAt')
          .populate('packageServices.executedBy', 'username')
          .populate('hairStraighteningExecutedBy hairDyeExecutedBy', 'username')
          .lean();

        const instantServices = await InstantService.find({
      services: {
        $elemMatch: {
          executed: true,
          executedBy: employeeId,
          executedAt: { $gte: start, $lte: end }
        }
      }
        })
          .select('receiptNumber services createdAt')
          .populate('services.executedBy', 'username')
          .lean();

        const executedList = [];

        const pushItem = (payload) => executedList.push(payload);

        bookings.forEach((b) => {
          (b.packageServices || []).forEach((srv) => {
            if (srv.executed && srv.executedBy && isInRange(srv.executedAt, start, end)) {
              pushItem({
                source: 'booking',
                receiptNumber: b.receiptNumber || '-',
                serviceName: srv.name || 'خدمة باكدج',
                clientName: b.clientName || '—',
                points: Math.round((srv.price || 0) * 0.15),
                executedAt: srv.executedAt || b.createdAt,
                executedBy: srv.executedBy?.username || null
              });
            }
          });

          if (b.hairStraighteningExecuted && b.hairStraighteningExecutedBy && isInRange(b.hairStraighteningExecutedAt, start, end)) {
            pushItem({
              source: 'booking',
              receiptNumber: b.receiptNumber || '-',
              serviceName: 'فرد الشعر',
              clientName: b.clientName || '—',
              points: Math.round((b.hairStraighteningPrice || 0) * 0.15),
              executedAt: b.hairStraighteningExecutedAt || b.createdAt,
              executedBy: b.hairStraighteningExecutedBy?.username || null
            });
          }

          if (b.hairDyeExecuted && b.hairDyeExecutedBy && isInRange(b.hairDyeExecutedAt, start, end)) {
            pushItem({
              source: 'booking',
              receiptNumber: b.receiptNumber || '-',
              serviceName: 'صبغة الشعر',
              clientName: b.clientName || '—',
              points: Math.round((b.hairDyePrice || 0) * 0.15),
              executedAt: b.hairDyeExecutedAt || b.createdAt,
              executedBy: b.hairDyeExecutedBy?.username || null
            });
          }
        });

        instantServices.forEach((inst) => {
          (inst.services || []).forEach((srv) => {
            if (srv.executed && srv.executedBy && isInRange(srv.executedAt, start, end)) {
              pushItem({
                source: 'instant',
                receiptNumber: inst.receiptNumber || '-',
                serviceName: srv.name || 'خدمة فورية',
                clientName: '—',
                points: Math.round((srv.price || 0) * 0.15),
                executedAt: srv.executedAt || inst.createdAt,
                executedBy: srv.executedBy?.username || null
              });
            }
          });
        });

        executedList.sort((a, b) => {
          const aTime = a.executedAt ? new Date(a.executedAt).getTime() : 0;
          const bTime = b.executedAt ? new Date(b.executedAt).getTime() : 0;
          return bTime - aTime;
        });

        return { services: executedList };
      }
    });

    return res.json(payload);
  } catch (err) {
    console.error('Error in getExecutedServices:', err);
    return res.status(500).json({ msg: 'خطأ في السيرفر' });
  }
};

// Internal helpers for other controllers
exports.addPointsAndConvertInternal = addPointsAndConvert;
exports.removePointsAndCoinsInternal = removePointsAndCoins;
exports.getLevelInternal = getLevel;
exports.getCoinValueInternal = getCoinValue;
