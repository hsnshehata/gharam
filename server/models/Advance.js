const mongoose = require('mongoose');

const advanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // الموظف اللي أخد السلفة
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // الموظف اللي سجّل العملية
  amount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Advance', advanceSchema);