const mongoose = require('mongoose');

const telegramAccountSchema = new mongoose.Schema({
    telegramId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['supervisor', 'admin'], required: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    aiMode: { type: String, enum: ['auto', 'fast', 'specific'], default: 'auto' },
    specificModel: { type: String, default: null },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TelegramAccount', telegramAccountSchema);
