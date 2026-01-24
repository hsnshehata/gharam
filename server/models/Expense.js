const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  details: { type: String, required: true },
  amount: { type: Number, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // الموظف اللي سجّل العملية
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // نفس الموظف
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  _deleted: { type: Boolean, default: false }
});

// تحديث ختم التعديل تلقائياً لأي عملية حفظ أو تعديل
expenseSchema.pre('save', function updateTimestamp(next) {
  this.updatedAt = new Date();
  next();
});

expenseSchema.pre('findOneAndUpdate', function setUpdateTimestamp(next) {
  this.set({ updatedAt: new Date() });
  next();
});

module.exports = mongoose.model('Expense', expenseSchema);