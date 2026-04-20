const mongoose = require('mongoose');

const dynamicToolSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    script: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    runCount: { type: Number, default: 0 },
    lastRun: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('DynamicTool', dynamicToolSchema);
