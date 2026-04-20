const mongoose = require('mongoose');

const aiMediaSchema = new mongoose.Schema({
    data: { type: String, required: true }, // Base64 chunk
    contentType: { type: String, default: 'image/png' },
    prompt: { type: String },
    createdAt: { type: Date, default: Date.now, expires: '30d' } // Auto delete after 30 days
});

module.exports = mongoose.model('AIMedia', aiMediaSchema);
