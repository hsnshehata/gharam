const mongoose = require('mongoose');

const scheduledTaskSchema = new mongoose.Schema({
    prompt: { type: String, required: true },
    title: { type: String, required: true }, // User-friendly title
    scheduleType: { type: String, enum: ['cron', 'once'], required: true },
    cronExpression: { type: String }, // e.g., '0 23 * * *'
    runAt: { type: Date }, // Time to run if 'once'
    isActive: { type: Boolean, default: true },
    lastRun: { type: Date },
    nextRun: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isSystem: { type: Boolean, default: false } // To protect the daily 11PM brief from deletion if managed here
}, { timestamps: true });

module.exports = mongoose.model('ScheduledTask', scheduledTaskSchema);
