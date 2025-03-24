const mongoose = require('mongoose');

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
  streamingUrl: {
    type: String
  },
  iframeUrl: {
    type: String
  },
  streamType: {
    type: String,
    enum: ['m3u8', 'dash', 'mp4', 'iframe', 'other'],
    default: 'm3u8'
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