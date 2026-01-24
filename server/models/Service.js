const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  type: { type: String, enum: ['instant', 'package'], required: true }, // فورية أو تابعة لباكدج
  packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: false }, // إذا كانت تابعة لباكدج
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  _deleted: { type: Boolean, default: false }
});

// تحديث ختم التعديل تلقائياً لأي عملية حفظ أو تعديل
serviceSchema.pre('save', function updateTimestamp(next) {
  this.updatedAt = new Date();
  next();
});

serviceSchema.pre('findOneAndUpdate', function setUpdateTimestamp(next) {
  this.set({ updatedAt: new Date() });
  next();
});

module.exports = mongoose.model('Service', serviceSchema);