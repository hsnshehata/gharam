const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'model'], required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const conversationSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  source: { type: String, enum: ['web', 'messenger', 'comment'], required: true, index: true },
  senderName: { type: String, default: 'زائر' },
  senderId: { type: String, default: '' },
  messages: [messageSchema],
  lastActivity: { type: Date, default: Date.now, index: true },
  metadata: {
    userAgent: { type: String, default: '' },
    ip: { type: String, default: '' }
  }
}, { timestamps: true });

// Compound index for efficient lookups
conversationSchema.index({ source: 1, lastActivity: -1 });

// Auto-cleanup: TTL index removes docs 30 days after lastActivity
conversationSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('Conversation', conversationSchema);
