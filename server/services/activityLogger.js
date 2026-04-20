const ActivityLog = require('../models/ActivityLog');

/**
 * Log an activity to the database.
 * 
 * @param {Object} params
 * @param {String} params.action - Action type (CREATE, UPDATE, DELETE, ASSIGN, UNASSIGN, SELF_EXECUTE, CONVERT, REDEEM, GIFT, DEDUCT, LOGIN, RESET)
 * @param {String} params.entityType - Entity type (Booking, InstantService, Expense, Advance, Installment, Service, User, Points, Coins, Salary, Deduction, Session)
 * @param {String|ObjectId} [params.entityId] - ID of the affected entity (optional for some operations)
 * @param {String} params.details - Human readable description of the action
 * @param {Number} [params.amount] - Financial amount or points amount related to the action
 * @param {String} [params.paymentMethod] - 'cash', 'vodafone', 'visa', 'instapay', 'none'
 * @param {String|ObjectId} params.performedBy - ID of the User who performed the action
 * @param {String|ObjectId} [params.targetUser] - ID of the User who is affected by the action (e.g. assigned employee)
 */
const logActivity = async ({ action, entityType, entityId, details, amount, paymentMethod, performedBy, targetUser }) => {
  try {
    if (!performedBy) {
      console.warn('logActivity called without performedBy. Skipping log.');
      return;
    }

    const logEntry = new ActivityLog({
      action,
      entityType,
      entityId: entityId || undefined,
      details,
      amount,
      paymentMethod,
      performedBy,
      targetUser: targetUser || undefined
    });

    await logEntry.save();

    // Update DataStore cache
    try {
      const dataStore = require('./dataStore');
      if (dataStore.isReady()) await dataStore.onActivityLogCreated(logEntry._id);
    } catch (e) { /* ignore if dataStore not available */ }
  } catch (err) {
    console.error('Error saving activity log:', err);
  }
};

module.exports = {
  logActivity
};
