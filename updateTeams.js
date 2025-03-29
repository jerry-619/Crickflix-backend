require('dotenv').config();
const mongoose = require('mongoose');
const Match = require('./models/Match');

async function updateTeams() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');

    const matches = await Match.find({});
    console.log(`Found ${matches.length} matches`);

    for (const match of matches) {
      const oldTeams = { team1: match.team1 || 'none', team2: match.team2 || 'none' };
      const wasModified = match.isModified('title');
      
      // Force title modification flag to trigger team extraction
      match.markModified('title');
      
      await match.save();
      
      console.log(`Updated match: ${match.title}`);
      console.log(`  Before: ${oldTeams.team1} vs ${oldTeams.team2}`);
      console.log(`  After:  ${match.team1} vs ${match.team2}`);
      console.log('---');
    }

    console.log('All matches updated successfully');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
}

updateTeams(); 