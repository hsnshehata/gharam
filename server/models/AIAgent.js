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
    enum: [
      'nvidia/nemotron-3-super-120b-a12b:free',
      'openai/gpt-oss-120b:free',
      'z-ai/glm-4.5-air:free',
      'google/gemma-4-31b-it:free',
      'minimax/minimax-m2.5:free'
    ],
    default: 'google/gemma-4-31b-it:free'
  },
  color: {
    type: String,
    enum: ['purple', 'blue', 'pink', 'green', 'yellow', 'gray', 'red', 'indigo'],
    default: 'gray'
  },
  templateId: {
    type: String,
    trim: true
  }
}, { timestamps: true });

module.exports = mongoose.model('AIAgent', aiAgentSchema);
