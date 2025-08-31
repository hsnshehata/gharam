const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'supervisor', 'employee'], required: true },
  monthlySalary: { type: Number, default: 0 },
  remainingSalary: { type: Number, default: 0 }, // المتبقي من الراتب
  phone: { type: String },
  points: [{
    amount: Number,
    date: Date,
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', default: null }
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);