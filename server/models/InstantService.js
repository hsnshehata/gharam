const mongoose = require('mongoose');

const instantServiceSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  services: [{
    _id: { type: String, required: true }, // تغيير من ObjectId إلى String
    name: { type: String, required: true },
    price: { type: Number, required: true },
    executed: { type: Boolean, default: false },
    executedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    executedAt: { type: Date }
  }],
  total: { type: Number, required: true },
  receiptNumber: { type: String, unique: true },
  barcode: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  _deleted: { type: Boolean, default: false }
});

// تحديث ختم التعديل تلقائياً لأي عملية حفظ أو تعديل
instantServiceSchema.pre('save', function updateTimestamp(next) {
  this.updatedAt = new Date();
  next();
});

instantServiceSchema.pre('findOneAndUpdate', function setUpdateTimestamp(next) {
  this.set({ updatedAt: new Date() });
  next();
});

module.exports = mongoose.model('InstantService', instantServiceSchema);