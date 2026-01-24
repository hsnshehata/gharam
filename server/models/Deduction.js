const mongoose = require('mongoose');

const deductionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  reason: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  _deleted: { type: Boolean, default: false }
});

// تحديث ختم التعديل تلقائياً لأي عملية حفظ أو تعديل
deductionSchema.pre('save', function updateTimestamp(next) {
  this.updatedAt = new Date();
  next();
});

deductionSchema.pre('findOneAndUpdate', function setUpdateTimestamp(next) {
  this.set({ updatedAt: new Date() });
  next();
});

module.exports = mongoose.model('Deduction', deductionSchema);