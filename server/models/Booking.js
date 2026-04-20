const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  package: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
  hennaPackage: { type: mongoose.Schema.Types.ObjectId, ref: 'Package' },
  photographyPackage: { type: mongoose.Schema.Types.ObjectId, ref: 'Package' },
  returnedServices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }], // خدمات الباكدج المرتجعة
  extraServices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }], // خدمات إضافية (من نوع instant)
  customExtraServices: [{ 
    _id: { type: String }, 
    name: { type: String }, 
    price: { type: Number } 
  }], // خدمات إضافية (إدخال حر)
  packageServices: [{ // تشمل خدمات الباكدج بعد استثناء المرتجع، بالإضافة إلى الخدمات الإضافية
    _id: { type: String }, // تم التغيير لـ String لدعم الخدمات الحرة
    name: String,
    price: Number,
    isCustom: { type: Boolean, default: false }, // للتفرقة بين الخدمات المسجلة والحرة
    executed: { type: Boolean, default: false },
    executedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    executedAt: { type: Date }
  }],
  hairStraightening: { type: Boolean, default: false },
  hairStraighteningPrice: { type: Number, default: 0 },
  hairStraighteningDate: { type: Date },
  hairStraighteningExecuted: { type: Boolean, default: false },
  hairStraighteningExecutedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  hairStraighteningExecutedAt: { type: Date },
  hairDye: { type: Boolean, default: false },
  hairDyePrice: { type: Number, default: 0 },
  hairDyeDate: { type: Date },
  hairDyeExecuted: { type: Boolean, default: false },
  hairDyeExecutedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  hairDyeExecutedAt: { type: Date },
  photographyExecuted: { type: Boolean, default: false },
  photographyExecutedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  photographyExecutedAt: { type: Date },
  clientName: { type: String, required: true },
  clientPhone: { type: String, required: true },
  city: { type: String },
  notes: { type: String, default: '' },
  eventDate: { type: Date, required: true },
  hennaDate: { type: Date },
  deposit: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['cash', 'vodafone', 'visa', 'instapay'], default: 'cash' },
  installments: [{
    amount: Number,
    date: Date,
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    paymentMethod: { type: String, enum: ['cash', 'vodafone', 'visa', 'instapay'], default: 'cash' }
  }],
  total: { type: Number, required: true },
  remaining: { type: Number, required: true },
  receiptNumber: { type: String, unique: true },
  barcode: { type: String },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updates: [{
    date: { type: Date, default: Date.now },
    changes: { type: Object },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }]
});

module.exports = mongoose.model('Booking', bookingSchema);
