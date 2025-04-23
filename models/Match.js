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
    enum: ['m3u8', 'dashmpd', 'iframe'],
    required: true
  },
  drmConfig: {
    type: Object,
    required: function() {
      return this.type === 'dashmpd';
    },
    validate: {
      validator: function(value) {
        if (this.type !== 'dashmpd') return true;
        return value && value.keyId && value.key;
      },
      message: 'DRM configuration must include keyId and key for DASH+DRM streams'
    }
  }
}, { _id: false });

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: true
  },
  logo: {
    type: String,
    default: ''
  },
  logoPublicId: {
    type: String,
    default: ''
  }
}, { _id: false });

// New schemas for predictions
const matchPredictionSchema = new mongoose.Schema({
  winningProbability: {
    team1: String,
    team2: String
  },
  prediction: {
    winner: String,
    margin: String,
    confidence: String
  },
  conditions: {
    weather: String,
    pitch: String,
    time: String
  },
  team1Stats: {
    recentForm: String,
    keyPlayers: [String]
  },
  team2Stats: {
    recentForm: String,
    keyPlayers: [String]
  },
  venue: {
    name: String,
    city: String,
    country: String,
    capacity: String,
    description: String,
    knownFor: [String]
  },
  generatedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const tossPredictionSchema = new mongoose.Schema({
  tossPrediction: {
    winner: String,
    choice: String,
    confidence: String,
    reasoning: [String]
  },
  conditions: {
    time: String,
    weather: String,
    pitch: String
  },
  historicalData: {
    team1TossWinRate: String,
    team2TossWinRate: String,
    venueTossPattern: String,
    venueHistory: String
  },
  matchVenue: {
    name: String,
    city: String,
    country: String,
    capacity: String,
    date: String,
    matchTime: String,
    description: String,
    knownFor: [String]
  },
  generatedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const fantasyPredictionSchema = new mongoose.Schema({
  captain: {
    name: String,
    role: String,
    team: String,
    currentForm: String,
    expectedPoints: String,
    reason: String
  },
  viceCaptain: {
    name: String,
    role: String,
    team: String,
    currentForm: String,
    expectedPoints: String,
    reason: String
  },
  players: [{
    name: String,
    role: String,
    team: String,
    isCaptain: Boolean,
    isViceCaptain: Boolean,
    recentForm: String,
    matchesPlayed: String,
    currentStats: {
      runs: String,
      wickets: String,
      average: String,
      strikeRate: String
    },
    selectionReason: String
  }],
  teamComposition: {
    batsmen: Number,
    bowlers: Number,
    allRounders: Number,
    wicketKeeper: Number
  },
  teamSummary: {
    totalProjectedPoints: String,
    strengths: [String],
    risks: [String],
    analysis: String
  },
  generatedAt: {
    type: Date,
    default: Date.now
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
    trim: true,
    default: ''
  },
  thumbnail: {
    type: String,
    default: ''
  },
  thumbnailPublicId: {
    type: String,
    default: ''
  },
  team1: {
    type: teamSchema,
    required: true,
    default: () => ({})
  },
  team2: {
    type: teamSchema,
    required: true,
    default: () => ({})
  },
  streamingUrl: {
    type: String,
    default: ''
  },
  iframeUrl: {
    type: String,
    default: ''
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
  },
  // Add prediction fields
  matchPrediction: {
    type: matchPredictionSchema,
    default: null
  },
  tossPrediction: {
    type: tossPredictionSchema,
    default: null
  },
  fantasyPrediction: {
    type: fantasyPredictionSchema,
    default: null
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
    // Extract team names if title is modified or teams are not set
    if (this.isModified('title') || !this.team1?.name || !this.team2?.name || this.team1.name === '' || this.team2.name === '') {
      console.log('Processing title for team extraction:', this.title);
      
      const extractedTeams = extractTeamsFromTitle(this.title);
      console.log('Extracted teams:', extractedTeams);
      
      if (extractedTeams) {
        this.team1 = {
          ...this.team1,
          name: extractedTeams[0]
        };
        this.team2 = {
          ...this.team2,
          name: extractedTeams[1]
        };
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
        
        // Get current document to preserve existing team data
        const doc = await this.model.findOne(this.getQuery());
        
        // Create plain objects for team data
        update.$set.team1 = {
          name: extractedTeams[0],
          logo: doc?.team1?.logo || '',
          logoPublicId: doc?.team1?.logoPublicId || ''
        };
        
        update.$set.team2 = {
          name: extractedTeams[1],
          logo: doc?.team2?.logo || '',
          logoPublicId: doc?.team2?.logoPublicId || ''
        };
        
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