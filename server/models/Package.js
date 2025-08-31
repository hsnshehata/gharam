const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  type: { type: String, enum: ['makeup', 'photography'], required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Package', packageSchema);