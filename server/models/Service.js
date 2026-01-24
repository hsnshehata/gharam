const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  type: { type: String, enum: ['instant', 'package'], required: true }, // فورية أو تابعة لباكدج
  packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: false }, // إذا كانت تابعة لباكدج
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Service', serviceSchema);