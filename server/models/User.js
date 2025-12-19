const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'supervisor', 'hallSupervisor', 'employee'], required: true },
  monthlySalary: { type: Number, default: 0 },
  remainingSalary: { type: Number, default: 0 }, // المتبقي من الراتب
  phone: { type: String },
  totalPoints: { type: Number, default: 0 }, // إجمالي النقاط التراكمية
  convertiblePoints: { type: Number, default: 0 }, // الرصيد القابل للتحويل لعملات
  level: { type: Number, default: 1 },
  efficiencyCoins: [{
    level: Number,
    value: Number,
    earnedAt: { type: Date, default: Date.now },
    sourcePointId: { type: mongoose.Schema.Types.ObjectId },
    receiptNumber: { type: String, default: null }
  }],
  coinsRedeemed: [{
    level: Number,
    value: Number,
    redeemedAt: { type: Date, default: Date.now },
    sourcePointId: { type: mongoose.Schema.Types.ObjectId, default: null }
  }],
  points: [{
    amount: Number,
    date: Date,
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', default: null },
    serviceName: { type: String, default: null },
    instantServiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'InstantService', default: null },
    receiptNumber: { type: String, default: null },
    type: { type: String, enum: ['work', 'gift', 'deduction'], default: 'work' },
    note: { type: String, default: null },
    giftedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    giftedByName: { type: String, default: null },
    status: { type: String, enum: ['pending', 'applied'], default: 'applied' },
    openedAt: { type: Date, default: null }
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);