const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  details: { type: String, required: true },
  amount: { type: Number, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // الموظف اللي سجّل العملية
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // نفس الموظف
  paymentMethod: { type: String, enum: ['cash', 'vodafone', 'visa', 'instapay'], default: 'cash' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Expense', expenseSchema);