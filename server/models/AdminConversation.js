const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    role: { type: String, enum: ['user', 'model'], required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
}, { _id: false });

const adminConversationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, default: 'محادثة جديدة' },
    messages: [messageSchema],
    lastActivity: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

module.exports = mongoose.model('AdminConversation', adminConversationSchema);
