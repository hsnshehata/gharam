const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logActivity } = require('../services/activityLogger');

exports.register = async (req, res) => {
  const { username, password, role, monthlySalary, phone } = req.body;
  try {
    let user = await User.findOne({ username });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    user = new User({ username, password: await bcrypt.hash(password, 10), role, monthlySalary, phone });
    await user.save();

    const payload = { user: { id: user.id, role: user.role } };
    // إبقاء الجلسة أطول: 10 أيام
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '10d' });

    res.json({ token, user: { id: user.id, username, role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

    const payload = { user: { id: user.id, role: user.role } };
    // إبقاء الجلسة أطول: 10 أيام
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '10d' });

    // تسجيل عملية الدخول
    logActivity({
      action: 'LOGIN',
      entityType: 'Session',
      entityId: user._id,
      details: `سجل دخول "${user.username}" (${user.role === 'admin' ? 'مدير' : user.role === 'supervisor' ? 'مشرف' : user.role === 'hallSupervisor' ? 'مشرف صالة' : 'موظف'})`,
      performedBy: user.id
    }).catch(() => {});

    res.json({ token, user: { id: user.id, username, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.me = async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};