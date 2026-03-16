const ActivityLog = require('../models/ActivityLog');

/**
 * Log an activity to the database.
 * 
 * @param {Object} params
 * @param {String} params.action - 'CREATE', 'UPDATE', or 'DELETE'
 * @param {String} params.entityType - 'Booking', 'InstantService', 'Expense', 'Advance', or 'Installment'
 * @param {String|ObjectId} params.entityId - ID of the created/updated/deleted entity
 * @param {String} params.details - Human readable description of the action
 * @param {Number} [params.amount] - Financial amount related to the action
 * @param {String} [params.paymentMethod] - 'cash', 'vodafone', 'visa', 'instapay'
 * @param {String|ObjectId} params.performedBy - ID of the User who performed the action
 */
const logActivity = async ({ action, entityType, entityId, details, amount, paymentMethod, performedBy }) => {
  try {
    if (!performedBy) {
      console.warn('logActivity called without performedBy. Skipping log.');
      return;
    }

    const logEntry = new ActivityLog({
      action,
      entityType,
      entityId,
      details,
      amount,
      paymentMethod,
      performedBy
    });

    await logEntry.save();
  } catch (err) {
    console.error('Error saving activity log:', err);
  }
};

module.exports = {
  logActivity
};
