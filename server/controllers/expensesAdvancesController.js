const Expense = require('../models/Expense');
const Advance = require('../models/Advance');
const Deduction = require('../models/Deduction');
const User = require('../models/User');
const mongoose = require('mongoose');
const { cacheAside, deleteByPrefix } = require('../services/cache');

const invalidateExpenseCaches = async () => {
  await Promise.all([
    deleteByPrefix('expenses:'),
    deleteByPrefix('dashboard:'),
    deleteByPrefix('reports:')
  ]);
};

exports.addExpenseAdvance = async (req, res) => {
  const { type, details, amount, userId } = req.body;
  const creatorId = req.user.id;

  try {
    if (!type || !['expense', 'advance', 'deduction'].includes(type)) {
      return res.status(400).json({ msg: 'نوع العملية غير صالح' });
    }

    if (type === 'expense') {
      if (!details || !amount || amount <= 0) {
        return res.status(400).json({ msg: 'تفاصيل المصروف والمبلغ مطلوبة ويجب أن يكون المبلغ أكبر من صفر' });
      }
      const expense = new Expense({ details, amount, userId: creatorId, createdBy: creatorId });
      await expense.save();
      const populatedExpense = await Expense.findById(expense._id).populate('userId createdBy', 'username');
      await invalidateExpenseCaches();
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
      await invalidateExpenseCaches();
      return res.json({ msg: 'تم إضافة السلفة بنجاح', item: populatedAdvance, type: 'advance' });
    } else if (type === 'deduction') {
      if (!userId || !amount || amount <= 0 || !details) {
        return res.status(400).json({ msg: 'اسم الموظف، المبلغ وسبب الخصم مطلوبة ويجب أن يكون المبلغ أكبر من صفر' });
      }
      if (!mongoose.isValidObjectId(userId)) {
        return res.status(400).json({ msg: 'معرف الموظف غير صالح' });
      }
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ msg: 'الموظف غير موجود' });
      if (user.remainingSalary < amount) return res.status(400).json({ msg: 'الخصم أكبر من المتبقي من الراتب' });

      const deduction = new Deduction({ userId, amount, reason: details, createdBy: creatorId });
      await deduction.save();

      // خصم المبلغ من الراتب المتبقي فقط
      await User.updateOne({ _id: userId }, { $set: { remainingSalary: user.remainingSalary - amount } });

      const populatedDeduction = await Deduction.findById(deduction._id).populate('userId createdBy', 'username remainingSalary');
      await invalidateExpenseCaches();
      return res.json({ msg: 'تم إضافة الخصم الإداري بنجاح', item: populatedDeduction, type: 'deduction' });
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
    if (!type || !['expense', 'advance', 'deduction'].includes(type)) {
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
      await invalidateExpenseCaches();
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
      await invalidateExpenseCaches();
      return res.json({ msg: 'تم تعديل السلفة بنجاح', item: advance, type: 'advance' });
    } else if (type === 'deduction') {
      if (!userId || !amount || amount <= 0 || !details) {
        return res.status(400).json({ msg: 'اسم الموظف، المبلغ وسبب الخصم مطلوبة ويجب أن يكون المبلغ أكبر من صفر' });
      }
      if (!mongoose.isValidObjectId(userId)) {
        return res.status(400).json({ msg: 'معرف الموظف غير صالح' });
      }

      const oldDeduction = await Deduction.findById(req.params.id);
      if (!oldDeduction) return res.status(404).json({ msg: 'الخصم غير موجود' });

      // استرجاع الرصيد للموظف القديم
      const oldUser = await User.findById(oldDeduction.userId);
      if (oldUser) {
        await User.updateOne({ _id: oldDeduction.userId }, { $set: { remainingSalary: oldUser.remainingSalary + oldDeduction.amount } });
      }

      const user = await User.findById(userId || oldDeduction.userId);
      if (!user) return res.status(404).json({ msg: 'الموظف غير موجود' });
      if (user.remainingSalary < amount) return res.status(400).json({ msg: 'الخصم أكبر من المتبقي من الراتب' });

      const deduction = await Deduction.findByIdAndUpdate(
        req.params.id,
        { userId, amount, reason: details, createdBy: creatorId },
        { new: true }
      ).populate('userId createdBy', 'username remainingSalary');

      await User.updateOne({ _id: userId }, { $set: { remainingSalary: user.remainingSalary - amount } });
      await invalidateExpenseCaches();
      return res.json({ msg: 'تم تعديل الخصم الإداري بنجاح', item: deduction, type: 'deduction' });
    }
  } catch (err) {
    console.error('Error in updateExpenseAdvance:', err);
    return res.status(500).json({ msg: 'خطأ في السيرفر' });
  }
};

exports.deleteExpenseAdvance = async (req, res) => {
  const { type } = req.query;

  try {
    if (!type || !['expense', 'advance', 'deduction'].includes(type)) {
      return res.status(400).json({ msg: 'نوع العملية غير صالح' });
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ msg: 'معرف العملية غير صالح' });
    }

    if (type === 'expense') {
      const expense = await Expense.findByIdAndDelete(req.params.id);
      if (!expense) return res.status(404).json({ msg: 'المصروف غير موجود' });
      await invalidateExpenseCaches();
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
      await invalidateExpenseCaches();
      return res.json({ msg: 'تم حذف السلفة بنجاح', type: 'advance' });
    } else if (type === 'deduction') {
      const deduction = await Deduction.findById(req.params.id);
      if (!deduction) return res.status(404).json({ msg: 'الخصم غير موجود' });

      const user = await User.findById(deduction.userId);
      if (user) {
        await User.updateOne({ _id: deduction.userId }, { $set: { remainingSalary: user.remainingSalary + deduction.amount } });
      }

      await Deduction.findByIdAndDelete(req.params.id);
      await invalidateExpenseCaches();
      return res.json({ msg: 'تم حذف الخصم الإداري بنجاح', type: 'deduction' });
    }
  } catch (err) {
    console.error('Error in deleteExpenseAdvance:', err);
    return res.status(500).json({ msg: 'خطأ في السيرفر' });
  }
};

exports.getExpensesAdvances = async (req, res) => {
  const { page = 1, limit = 50, search } = req.query;

  try {
    const key = `expenses:list:${JSON.stringify({ page, limit, search })}`;
    const payload = await cacheAside({
      key,
      ttlSeconds: 60,
      staleSeconds: 120,
      fetchFn: async () => {
        let expensesQuery = {};
        let advancesQuery = {};
        let deductionsQuery = {};

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
          deductionsQuery = {
            $or: [
              { userId: { $in: userIds } },
              { createdBy: { $in: userIds } },
              { reason: { $regex: search, $options: 'i' } }
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

        const deductions = await Deduction.find(deductionsQuery)
          .populate('userId createdBy', 'username remainingSalary')
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(parseInt(limit));

        const totalExpenses = await Expense.countDocuments(expensesQuery);
        const totalAdvances = await Advance.countDocuments(advancesQuery);
        const totalDeductions = await Deduction.countDocuments(deductionsQuery);
        const total = totalExpenses + totalAdvances + totalDeductions;

        const items = [
          ...expenses.map(item => ({ ...item._doc, type: 'expense' })),
          ...advances.map(item => ({ ...item._doc, type: 'advance' })),
          ...deductions.map(item => ({ ...item._doc, type: 'deduction', details: item.reason }))
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, parseInt(limit));

        return { items, total, pages: Math.ceil(total / limit) };
      }
    });

    return res.json(payload);
  } catch (err) {
    console.error('Error in getExpensesAdvances:', err);
    return res.status(500).json({ msg: 'خطأ في السيرفر' });
  }
};