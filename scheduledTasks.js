const cron = require('node-cron');
const Match = require('./models/Match'); // Adjust the path as necessary

const scheduledTasks = () => {
  // Schedule a job to run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      // Find matches that are upcoming and whose scheduled time has passed
      const matchesToUpdate = await Match.find({
        status: 'upcoming',
        scheduledTime: { $lt: now }
      });

      if (matchesToUpdate.length > 0) {
        // Update the status of each match to 'live' and set isLive to true
        await Promise.all(matchesToUpdate.map(async (match) => {
          match.status = 'live';
          match.isLive = true; // Set isLive to true
          await match.save();
          console.log(`Match ${match.title} status updated to live and isLive set to true.`);
        }));
      }
    } catch (error) {
      console.error('Error updating match statuses:', error);
    }
  });
};

module.exports = scheduledTasks; 