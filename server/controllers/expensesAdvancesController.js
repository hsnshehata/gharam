const Expense = require('../models/Expense');
const Advance = require('../models/Advance');
const User = require('../models/User');
const mongoose = require('mongoose');

exports.addExpenseAdvance = async (req, res) => {
  const { type, details, amount, userId } = req.body;
  const creatorId = req.user.id;

  try {
    if (!type || !['expense', 'advance'].includes(type)) {
      return res.status(400).json({ msg: 'نوع العملية غير صالح' });
    }

    if (type === 'expense') {
      if (!details || !amount || amount <= 0) {
        return res.status(400).json({ msg: 'تفاصيل المصروف والمبلغ مطلوبة ويجب أن يكون المبلغ أكبر من صفر' });
      }
      const expense = new Expense({ details, amount, userId: creatorId, createdBy: creatorId });
      await expense.save();
      const populatedExpense = await Expense.findById(expense._id).populate('userId createdBy', 'username');
      return res.json({ msg: 'تم إضافة المصروف بنجاح', item: populatedExpense, type: 'expense' });
    } else if (type === 'advance') {
      if (!userId || !amount || amount <= 0) {
        return res.status(400).json({ msg: 'اسم الموظف والمبلغ مطلوبين ويجب أن يكون المبلغ أكبر من صفر' });
      }
      if (!mongoose.isValidObjectId(userId)) {
        return res.status(400).json({ msg: 'معرف الموظف غير صالح' });
      }
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ msg: 'الموظف غير موجود' });
      if (user.remainingSalary < amount) return res.status(400).json({ msg: 'السلفة أكبر من المتبقي من الراتب' });

      const advance = new Advance({ userId, amount, createdBy: creatorId });
      await advance.save();

      // تحديث remainingSalary فقط
      await User.updateOne({ _id: userId }, { $set: { remainingSalary: user.remainingSalary - amount } });

      const populatedAdvance = await Advance.findById(advance._id).populate('userId createdBy', 'username remainingSalary');
      return res.json({ msg: 'تم إضافة السلفة بنجاح', item: populatedAdvance, type: 'advance' });
    }
  } catch (err) {
    console.error('Error in addExpenseAdvance:', err);
    return res.status(500).json({ msg: 'خطأ في السيرفر' });
  }
};

exports.updateExpenseAdvance = async (req, res) => {
  const { type, details, amount, userId } = req.body;
  const creatorId = req.user.id;

  try {
    if (!type || !['expense', 'advance'].includes(type)) {
      return res.status(400).json({ msg: 'نوع العملية غير صالح' });
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ msg: 'معرف العملية غير صالح' });
    }

    if (type === 'expense') {
      if (!details || !amount || amount <= 0) {
        return res.status(400).json({ msg: 'تفاصيل المصروف والمبلغ مطلوبة ويجب أن يكون المبلغ أكبر من صفر' });
      }
      const expense = await Expense.findByIdAndUpdate(
        req.params.id,
        { details, amount, userId: creatorId, createdBy: creatorId },
        { new: true }
      ).populate('userId createdBy', 'username');
      if (!expense) return res.status(404).json({ msg: 'المصروف غير موجود' });
      return res.json({ msg: 'تم تعديل المصروف بنجاح', item: expense, type: 'expense' });
    } else if (type === 'advance') {
      if (!userId || !amount || amount <= 0) {
        return res.status(400).json({ msg: 'اسم الموظف والمبلغ مطلوبين ويجب أن يكون المبلغ أكبر من صفر' });
      }
      if (!mongoose.isValidObjectId(userId)) {
        return res.status(400).json({ msg: 'معرف الموظف غير صالح' });
      }

      const oldAdvance = await Advance.findById(req.params.id);
      if (!oldAdvance) return res.status(404).json({ msg: 'السلفة غير موجودة' });

      const user = await User.findById(userId || oldAdvance.userId);
      if (!user) return res.status(404).json({ msg: 'الموظف غير موجود' });

      // استرجاع الراتب القديم
      const oldUser = await User.findById(oldAdvance.userId);
      if (oldUser) {
        await User.updateOne({ _id: oldAdvance.userId }, { $set: { remainingSalary: oldUser.remainingSalary + oldAdvance.amount } });
      }

      // تحديث السلفة الجديدة
      if (user.remainingSalary < amount) return res.status(400).json({ msg: 'السلفة أكبر من المتبقي من الراتب' });

      const advance = await Advance.findByIdAndUpdate(
        req.params.id,
        { userId, amount, createdBy: creatorId },
        { new: true }
      ).populate('userId createdBy', 'username remainingSalary');

      // تحديث remainingSalary فقط
      await User.updateOne({ _id: userId }, { $set: { remainingSalary: user.remainingSalary - amount } });

      return res.json({ msg: 'تم تعديل السلفة بنجاح', item: advance, type: 'advance' });
    }
  } catch (err) {
    console.error('Error in updateExpenseAdvance:', err);
    return res.status(500).json({ msg: 'خطأ في السيرفر' });
  }
};

exports.deleteExpenseAdvance = async (req, res) => {
  const { type } = req.query;

  try {
    if (!type || !['expense', 'advance'].includes(type)) {
      return res.status(400).json({ msg: 'نوع العملية غير صالح' });
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ msg: 'معرف العملية غير صالح' });
    }

    if (type === 'expense') {
      const expense = await Expense.findByIdAndDelete(req.params.id);
      if (!expense) return res.status(404).json({ msg: 'المصروف غير موجود' });
      return res.json({ msg: 'تم حذف المصروف بنجاح', type: 'expense' });
    } else if (type === 'advance') {
      const advance = await Advance.findById(req.params.id);
      if (!advance) return res.status(404).json({ msg: 'السلفة غير موجودة' });

      const user = await User.findById(advance.userId);
      if (user) {
        // استرجاع المبلغ لـ remainingSalary
        await User.updateOne({ _id: advance.userId }, { $set: { remainingSalary: user.remainingSalary + advance.amount } });
      } else {
        console.warn('User not found for advance ID:', req.params.id);
      }

      await Advance.findByIdAndDelete(req.params.id);
      return res.json({ msg: 'تم حذف السلفة بنجاح', type: 'advance' });
    }
  } catch (err) {
    console.error('Error in deleteExpenseAdvance:', err);
    return res.status(500).json({ msg: 'خطأ في السيرفر' });
  }
};

exports.getExpensesAdvances = async (req, res) => {
  const { page = 1, limit = 50, search } = req.query;

  try {
    let expensesQuery = {};
    let advancesQuery = {};

    if (search) {
      const users = await User.find({ username: { $regex: search, $options: 'i' } }).select('_id');
      const userIds = users.map(user => user._id);
      expensesQuery = {
        $or: [
          { details: { $regex: search, $options: 'i' } },
          { userId: { $in: userIds } },
          { createdBy: { $in: userIds } }
        ]
      };
      advancesQuery = {
        $or: [
          { userId: { $in: userIds } },
          { createdBy: { $in: userIds } }
        ]
      };
    }

    const expenses = await Expense.find(expensesQuery)
      .populate('userId createdBy', 'username')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const advances = await Advance.find(advancesQuery)
      .populate('userId createdBy', 'username remainingSalary')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const totalExpenses = await Expense.countDocuments(expensesQuery);
    const totalAdvances = await Advance.countDocuments(advancesQuery);
    const total = totalExpenses + totalAdvances;

    const items = [
      ...expenses.map(item => ({ ...item._doc, type: 'expense' })),
      ...advances.map(item => ({ ...item._doc, type: 'advance' }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, parseInt(limit));

    return res.json({ items, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Error in getExpensesAdvances:', err);
    return res.status(500).json({ msg: 'خطأ في السيرفر' });
  }
};