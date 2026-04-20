const mongoose = require('mongoose');

const teamLogSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['agent', 'user', 'system'],
    default: 'agent'
  },
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AIAgent',
    required: function() { return this.type === 'agent'; }
  },
  agentName: String,
  agentRole: String,
  agentEmoji: String,
  content: String,
  status: {
    type: String,
    enum: ['thinking', 'working', 'done', 'error'],
    default: 'done'
  },
  reasoning_details: {
    type: mongoose.Schema.Types.Mixed
  },
  duration: Number,
  pendingNote: {
    type: Boolean,
    default: false
  }
}, { _id: false, timestamps: true });

const aiTeamSessionSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AITeam',
    required: true
  },
  task: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['running', 'completed', 'failed', 'stopped'],
    default: 'running'
  },
  log: [teamLogSchema],
  totalDuration: Number,
  completedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('AITeamSession', aiTeamSessionSchema);
