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
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('InstantService', instantServiceSchema);
