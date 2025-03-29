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
  team1: {
    type: String,
    trim: true,
    default: ''
  },
  team2: {
    type: String,
    trim: true,
    default: ''
  },
  description: {
    type: String,
    trim: true
  },
  thumbnail: {
    type: String
  },
  thumbnailPublicId: {
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

// Function to extract teams from title
function extractTeamsFromTitle(title) {
  if (!title) return null;
  
  // Try different separators (vs, VS, v, V)
  const separators = ['vs', 'VS', ' v ', ' V ', 'Vs', ' VS '];
  let teams = null;
  
  for (const separator of separators) {
    if (title.includes(separator)) {
      const splitTeams = title.split(separator).map(team => {
        // Clean up the team name
        return team
          .replace(/,.*$/, '') // Remove anything after comma
          .replace(/\(.*\)/, '') // Remove anything in parentheses
          .replace(/[0-9]+[a-z]{0,2}\s+Match/i, '') // Remove "9th Match" etc.
          .replace(/^\s+|\s+$/g, ''); // Trim whitespace
      });
      
      if (splitTeams.length === 2 && splitTeams[0] && splitTeams[1]) {
        teams = splitTeams;
        break;
      }
    }
  }
  
  return teams;
}

// Pre-save middleware
matchSchema.pre('save', async function(next) {
  try {
    // Handle streaming sources
    if (this.streamingUrl && (!this.streamingSources || this.streamingSources.length === 0)) {
      this.streamingSources = [{
        name: 'Default Source',
        url: this.streamingUrl,
        type: this.streamType || 'm3u8'
      }];
    }

    // Extract team names if title is modified or teams are not set
    if (this.isModified('title') || !this.team1 || !this.team2 || this.team1 === '' || this.team2 === '') {
      console.log('Processing title for team extraction:', this.title);
      
      const extractedTeams = extractTeamsFromTitle(this.title);
      console.log('Extracted teams:', extractedTeams);
      
      if (extractedTeams) {
        this.team1 = extractedTeams[0];
        this.team2 = extractedTeams[1];
        console.log('Set teams:', { team1: this.team1, team2: this.team2 });
      } else {
        console.log('Could not extract teams from title');
      }
    }

    next();
  } catch (error) {
    console.error('Error in pre-save middleware:', error);
    next(error);
  }
});

// Update middleware to handle team extraction during updates
matchSchema.pre('findOneAndUpdate', async function(next) {
  try {
    const update = this.getUpdate();
    
    // Handle $set updates
    const title = update.title || (update.$set && update.$set.title);
    
    if (title) {
      console.log('Processing title update for team extraction:', title);
      
      const extractedTeams = extractTeamsFromTitle(title);
      console.log('Extracted teams from update:', extractedTeams);
      
      if (extractedTeams) {
        update.$set = update.$set || {};
        update.$set.team1 = extractedTeams[0];
        update.$set.team2 = extractedTeams[1];
        console.log('Updated teams:', { team1: update.$set.team1, team2: update.$set.team2 });
      }
    }
    next();
  } catch (error) {
    console.error('Error in pre-update middleware:', error);
    next(error);
  }
});

const Match = mongoose.model('Match', matchSchema);

module.exports = Match; 