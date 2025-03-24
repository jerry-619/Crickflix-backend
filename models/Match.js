const mongoose = require('mongoose');

const streamingSourceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['m3u8', 'dash', 'mp4', 'iframe', 'other'],
    default: 'm3u8'
  }
}, { _id: false });

const matchSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  thumbnail: {
    type: String
  },
  streamingSources: {
    type: [streamingSourceSchema],
    default: []
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  isLive: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['upcoming', 'live', 'completed'],
    default: 'upcoming'
  },
  scheduledTime: {
    type: Date,
    required: function() {
      return this.status === 'upcoming';
    }
  },
  views: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const Match = mongoose.model('Match', matchSchema);

module.exports = Match; 