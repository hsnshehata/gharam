const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: [
      'CREATE', 'UPDATE', 'DELETE',
      'ASSIGN', 'UNASSIGN', 'SELF_EXECUTE',
      'CONVERT', 'REDEEM',
      'GIFT', 'DEDUCT',
      'LOGIN', 'RESET'
    ],
    required: true
  },
  entityType: {
    type: String,
    enum: [
      'Booking', 'InstantService', 'Expense', 'Advance', 'Installment',
      'Service', 'User', 'Points', 'Coins', 'Salary', 'Deduction', 'Session'
    ],
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  details: {
    type: String,
    required: true
  },
  amount: {
    type: Number
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'vodafone', 'visa', 'instapay', 'none']
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
