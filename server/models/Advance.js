const mongoose = require('mongoose');

const advanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // الموظف اللي أخد السلفة
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // الموظف اللي سجّل العملية
  amount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  _deleted: { type: Boolean, default: false }
});

// تحديث ختم التعديل تلقائياً لأي عملية حفظ أو تعديل
advanceSchema.pre('save', function updateTimestamp(next) {
  this.updatedAt = new Date();
  next();
});

advanceSchema.pre('findOneAndUpdate', function setUpdateTimestamp(next) {
  this.set({ updatedAt: new Date() });
  next();
});

module.exports = mongoose.model('Advance', advanceSchema);