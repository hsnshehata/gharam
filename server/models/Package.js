const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  type: { type: String, enum: ['makeup', 'photography'], required: true },
  isActive: { type: Boolean, default: true },
  expiresAt: { type: Date, default: null },
  showInPrices: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Package', packageSchema);