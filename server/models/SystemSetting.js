const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, default: null },
  updatedAt: { type: Date, default: Date.now },
  _deleted: { type: Boolean, default: false }
});

// تحديث ختم التعديل تلقائياً لأي عملية حفظ أو تعديل
systemSettingSchema.pre('save', function updateTimestamp(next) {
  this.updatedAt = new Date();
  next();
});

systemSettingSchema.pre('findOneAndUpdate', function setUpdateTimestamp(next) {
  this.set({ updatedAt: new Date() });
  next();
});

module.exports = mongoose.model('SystemSetting', systemSettingSchema);
