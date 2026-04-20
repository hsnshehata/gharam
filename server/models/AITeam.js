const mongoose = require('mongoose');

const aiTeamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'اسم الفريق مطلوب'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  leader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AIAgent',
    required: [true, 'يجب تحديد قائد الفريق']
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AIAgent'
  }]
}, { timestamps: true });

module.exports = mongoose.model('AITeam', aiTeamSchema);
