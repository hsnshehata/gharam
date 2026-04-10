const mongoose = require('mongoose');

const afrakoushPageSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    title: {
        type: String,
        required: true,
    },
    html: {
        type: String,
        required: true,
    },
    script: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'paused'],
        default: 'published'
    },
    allowedRole: {
        type: String,
        enum: ['admin', 'supervisor', 'employee', 'public'],
        default: 'supervisor'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false 
    }
}, { timestamps: true });

module.exports = mongoose.model('AfrakoushPage', afrakoushPageSchema);
