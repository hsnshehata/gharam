const mongoose = require('mongoose');

const aiAgentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'اسم المساعد مطلوب'],
    trim: true,
  },
  role: {
    type: String,
    required: [true, 'دور المساعد مطلوب'],
    trim: true,
  },
  emoji: {
    type: String,
    default: '🤖'
  },
  systemInstruction: {
    type: String,
    required: [true, 'البرومت (التعليمات) مطلوب'],
  },
  modelName: {
    type: String,
    required: [true, 'نوع الذكاء الاصطناعي مطلوب'],
    default: 'google/gemma-4-31b-it:free'
  },
  fallbackModel: {
    type: String,
    trim: true,
    default: ''
  },
  apiKeys: [{
    type: String,
    trim: true
  }],
  color: {
    type: String,
    enum: ['purple', 'blue', 'pink', 'green', 'yellow', 'gray', 'red', 'indigo', 'primary', 'info', 'danger', 'success', 'warning', 'dark'],
    default: 'gray'
  },
  templateId: {
    type: String,
    trim: true
  }
}, { timestamps: true });

module.exports = mongoose.model('AIAgent', aiAgentSchema);
