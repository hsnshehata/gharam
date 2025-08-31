const User = require('../models/User');
const bcrypt = require('bcryptjs');

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
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    user.points.push({
      amount: points,
      date: new Date(),
      bookingId: bookingId || null,
      serviceId: serviceId || null
    });
    await user.save();
    res.json({ msg: 'Points added successfully', user: { id: user.id, username: user.username, points: user.points } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getPointsSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const currentDate = new Date();
    const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const lastMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    // نقاط الشهر الحالي
    const currentMonthPoints = user.points
      .filter(point => point.date >= currentMonthStart && point.date <= currentDate)
      .reduce((sum, point) => sum + point.amount, 0);

    // نقاط الشهر الماضي
    const lastMonthPoints = user.points
      .filter(point => point.date >= lastMonthStart && point.date <= lastMonthEnd)
      .reduce((sum, point) => sum + point.amount, 0);

    // أعلى شهر
    const pointsByMonth = {};
    user.points.forEach(point => {
      const date = new Date(point.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      if (!pointsByMonth[monthKey]) pointsByMonth[monthKey] = 0;
      pointsByMonth[monthKey] += point.amount;
    });

    let highestMonth = { points: 0, month: '' };
    Object.entries(pointsByMonth).forEach(([month, points]) => {
      if (points > highestMonth.points) {
        highestMonth = { points, month };
      }
    });

    res.json({
      currentMonth: currentMonthPoints,
      lastMonth: lastMonthPoints,
      highestMonth: { points: highestMonth.points, month: highestMonth.month || 'غير متوفر' }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};