const mongoose = require('mongoose');

const advanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // الموظف اللي أخد السلفة
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // الموظف اللي سجّل العملية
  amount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['cash', 'vodafone', 'visa', 'instapay'], default: 'cash' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Advance', advanceSchema);