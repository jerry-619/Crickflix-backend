const { GoogleGenAI } = require("@google/genai");
const mongoose = require('mongoose');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Define schema for caching AI responses
const predictionSchema = new mongoose.Schema({
  team1: String,
  team2: String,
  type: String, // 'match', 'toss'
  response: Object,
  createdAt: { type: Date, default: Date.now, expires: 86400 } // Expires after 24 hours
});

const Prediction = mongoose.model('Prediction', predictionSchema);

// Helper function to retry failed requests
async function retryOperation(operation, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.log(`Attempt ${i + 1} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
    }
  }
}

// Helper function to clean AI response
function cleanJsonResponse(response) {
  try {
    console.log('Raw AI Response:', response);
    
    // First try to find JSON content in markdown code blocks
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      const jsonContent = jsonMatch[1];
      console.log('Extracted JSON from code block:', jsonContent);
      return jsonContent;
    }
    
    // If no code block found, try to find JSON content directly
    const jsonStart = response.indexOf('{');
    const jsonEnd = response.lastIndexOf('}') + 1;
    if (jsonStart !== -1 && jsonEnd !== -1) {
      const jsonContent = response.slice(jsonStart, jsonEnd);
      console.log('Extracted JSON directly:', jsonContent);
      return jsonContent;
    }
    
    // If still no JSON found, try to clean the response
    let cleaned = response;
    
    // Remove any markdown code block syntax
    cleaned = cleaned.replace(/```json\n?|\n?```/g, '');
    
    // Remove any explanatory text before the JSON
    cleaned = cleaned.replace(/^[\s\S]*?(\{)/, '$1');
    
    // Remove any text after the JSON
    cleaned = cleaned.replace(/(\})[\s\S]*$/, '$1');
    
    // Remove any trailing/leading whitespace
    cleaned = cleaned.trim();
    
    console.log('Cleaned response:', cleaned);
    return cleaned;
  } catch (error) {
    console.error('Error cleaning response:', error);
    throw new Error('Failed to extract JSON from AI response');
  }
}

// Helper function to validate JSON structure
function validateJsonStructure(json, requiredFields) {
  try {
    for (const field of requiredFields) {
      if (!json[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    return true;
  } catch (error) {
    console.error('JSON validation error:', error);
    throw error;
  }
}

// Helper function to get cached prediction
async function getCachedPrediction(team1, team2, type) {
  try {
    const prediction = await Prediction.findOne({
      team1: team1,
      team2: team2,
      type: type,
      createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Within last 24 hours
    });
    return prediction;
  } catch (error) {
    console.error('Error fetching cached prediction:', error);
    return null;
  }
}

// Helper function to cache prediction
async function cachePrediction(team1, team2, type, response) {
  try {
    await Prediction.findOneAndUpdate(
      { team1, team2, type },
      { response, createdAt: new Date() },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error('Error caching prediction:', error);
  }
}

// Updated IPL 2025 teams context with real-time data integration
const IPL_2025_CONTEXT = `
Current IPL 2025 Teams and Key Information (Updated as of ${new Date().toISOString().split('T')[0]}):

1. Mumbai Indians (MI)
Captain: Hardik Pandya
Key players: Rohit Sharma, Suryakumar Yadav, Tilak Varma, Will Jacks, Jasprit Bumrah, Mubeeb-ur-Rahman, Trent Boult
Recent form: [Use latest match data from ESPNcricinfo or Cricbuzz]
Team strengths: [Use latest performance data from official IPL website]
Team weaknesses: [Use latest performance data from official IPL website]

2. Chennai Super Kings (CSK)
Captain: MS Dhoni
Key players: Ruturaj Gaikwad, Ravindra Jadeja, Deepak Hooda, Rachin Ravindra, Sam Curran, Matheesha Pathirana
Recent form: [Use latest match data from ESPNcricinfo or Cricbuzz]
Team strengths: [Use latest performance data from official IPL website]
Team weaknesses: [Use latest performance data from official IPL website]

3. Gujarat Titans (GT)
Captain: Shubman Gill
Key players: Jos Buttler, Rashid Khan, Mohammed Siraj, Gerald Coetzee, Rahul Tewatia, Sai Sudharsan
Recent form: [Use latest match data from ESPNcricinfo or Cricbuzz]
Team strengths: [Use latest performance data from official IPL website]
Team weaknesses: [Use latest performance data from official IPL website]

4. Royal Challengers Bengaluru (RCB)
Captain: Rajat Patidar
Key players: Virat Kohli, Phil Salt, Jitesh Sharma, Krunal Pandya, Josh Hazlewood, Bhuvneshwar Kumar
Recent form: [Use latest match data from ESPNcricinfo or Cricbuzz]
Team strengths: [Use latest performance data from official IPL website]
Team weaknesses: [Use latest performance data from official IPL website]

5. Kolkata Knight Riders (KKR)
Captain: Ajinkya Rahane
Key players: Rinku Singh, Andre Russell, Sunil Narine, Moeen Ali, Anrich Nortje, Quinton de Kock
Recent form: [Use latest match data from ESPNcricinfo or Cricbuzz]
Team strengths: [Use latest performance data from official IPL website]
Team weaknesses: [Use latest performance data from official IPL website]

6. Rajasthan Royals (RR)
Captain: Sanju Samson
Key players: Yashasvi Jaiswal, Shimron Hetmyer, Riyan Parag, Jofra Archer, Wanindu Hasaranga
Recent form: [Use latest match data from ESPNcricinfo or Cricbuzz]
Team strengths: [Use latest performance data from official IPL website]
Team weaknesses: [Use latest performance data from official IPL website]

7. Lucknow Super Giants (LSG)
Captain: Rishabh Pant
Key players: David Miller, Nicholas Pooran, Mitchell Marsh, Ravi Bishnoi, Mohsin Khan, Shamar Joseph
Recent form: [Use latest match data from ESPNcricinfo or Cricbuzz]
Team strengths: [Use latest performance data from official IPL website]
Team weaknesses: [Use latest performance data from official IPL website]

8. Punjab Kings (PBKS)
Captain: Shreyas Iyer
Key players: Nehal Wadhera, Marcus Stoinis, Glenn Maxwell, Arshdeep Singh, Kagiso Rabada
Recent form: [Use latest match data from ESPNcricinfo or Cricbuzz]
Team strengths: [Use latest performance data from official IPL website]
Team weaknesses: [Use latest performance data from official IPL website]

9. Delhi Capitals (DC)
Captain: KL Rahul
Key players: Jake Fraser-McGurk, Mitchell Starc, Kuldeep Yadav, Axar Patel, T Natarajan
Recent form: [Use latest match data from ESPNcricinfo or Cricbuzz]
Team strengths: [Use latest performance data from official IPL website]
Team weaknesses: [Use latest performance data from official IPL website]

10. Sunrisers Hyderabad (SRH)
Captain: Pat Cummins
Key players: Ishan Kishan, Heinrich Klaasen, Travis Head, Mohammad Shami, Abhishek Sharma
Recent form: [Use latest match data from ESPNcricinfo or Cricbuzz]
Team strengths: [Use latest performance data from official IPL website]
Team weaknesses: [Use latest performance data from official IPL website]

Important Notes:
1. Use real-time data from ESPNcricinfo, Cricbuzz, or official IPL website
2. Consider current player injuries and availability from official sources
3. Analyze current form and performance trends from recent matches
4. Take into account head-to-head records in the current season
5. Consider venue-specific performance data from the current season
6. Factor in current weather conditions from reliable weather APIs
7. Include recent team changes and tactical adjustments
8. Use up-to-date player rankings and form guides
9. Consider recent match results and momentum
10. Analyze current tournament standings and playoff scenarios

Data Sources:
1. ESPNcricinfo - For live scores and match statistics
2. Cricbuzz - For player performance and team analysis
3. Official IPL Website - For team compositions and updates
4. Weather API - For current match conditions
5. Sports Analytics Websites - For advanced statistics
6. Cricket News Websites - For latest updates and expert opinions

Base all predictions on the most recent and relevant data available from these sources.`;

// Add this helper function at the top with other helper functions
function isIPLTeam(teamName) {
  // Handle both string and object team names
  const name = typeof teamName === 'string' ? teamName : teamName?.name || '';
  
  const iplTeams = {
    // Abbreviations
    'MI': true, 'CSK': true, 'RCB': true, 'KKR': true, 'SRH': true, 
    'RR': true, 'PBKS': true, 'DC': true, 'GT': true, 'LSG': true,
    // Full names
    'MUMBAI INDIANS': true, 'CHENNAI SUPER KINGS': true, 
    'ROYAL CHALLENGERS BENGALURU': true, 'KOLKATA KNIGHT RIDERS': true,
    'SUNRISERS HYDERABAD': true, 'RAJASTHAN ROYALS': true,
    'PUNJAB KINGS': true, 'DELHI CAPITALS': true,
    'GUJARAT TITANS': true, 'LUCKNOW SUPER GIANTS': true
  };
  
  return iplTeams[name.toUpperCase()] || false;
}

async function getMatchPrediction(team1, team2) {
  try {
    // Extract team names
    const team1Name = typeof team1 === 'string' ? team1 : team1?.name || 'Team 1';
    const team2Name = typeof team2 === 'string' ? team2 : team2?.name || 'Team 2';
    
    console.log(`Generating match prediction for ${team1Name} vs ${team2Name}`);
    
    // Check for cached prediction
    const cachedPrediction = await getCachedPrediction(team1Name, team2Name, 'match');
    if (cachedPrediction) {
      console.log('Using cached match prediction');
      return JSON.stringify(cachedPrediction.response);
    }
    
    // Updated IPL match detection
    const isIPLMatch = isIPLTeam(team1) && isIPLTeam(team2);
    console.log('Is IPL match:', isIPLMatch, { team1: team1Name, team2: team2Name });
    
    const prompt = `Use real-time data from ESPNcricinfo, Cricbuzz, google and official IPL sources to create a highly accurate prediction for today's match between ${team1Name} vs ${team2Name}.
${isIPLMatch ? IPL_2025_CONTEXT : ''}

Important Instructions:
1. Use only real-time match data and team statistics from official sources
2. Consider current form and recent performances from the last 3 matches
3. Factor in player injuries and availability from official team updates
4. Analyze head-to-head records in current season
5. Consider venue-specific performance data
6. Include current weather conditions from reliable weather APIs
7. Use up-to-date team rankings and form guides
8. Consider recent team changes and tactical adjustments
9. Analyze current tournament standings
10. Focus on teams with high probability of success

Data Sources:
- ESPNcricinfo for live scores and statistics
- Cricbuzz for team performance
- Official IPL website for team updates
- Weather API for match conditions
- Sports analytics websites for advanced stats

Return this exact JSON structure:
    {
      "team1": "${team1Name}",
      "team2": "${team2Name}",
      "venue": {
        "name": "Actual stadium name from official IPL schedule",
        "city": "Actual city name from official IPL schedule",
        "country": "Actual country name from official IPL schedule",
        "description": "Detailed description of the venue including current pitch conditions",
        "capacity": "Actual stadium capacity",
        "knownFor": ["Actual notable features"],
        "date": "Today's date",
        "matchTime": "Actual match start time from official schedule"
      },
      "team1Stats": {
        "recentForm": "Detailed analysis of last 3 matches with actual statistics from ESPNcricinfo",
        "keyPlayers": ["Current in-form players from official sources"],
        "strengths": ["Current team strengths from recent matches"],
        "weaknesses": ["Current team weaknesses from recent matches"]
      },
      "team2Stats": {
        "recentForm": "Detailed analysis of last 3 matches with actual statistics from ESPNcricinfo",
        "keyPlayers": ["Current in-form players from official sources"],
        "strengths": ["Current team strengths from recent matches"],
        "weaknesses": ["Current team weaknesses from recent matches"]
      },
      "matchAnalysis": {
        "conditions": {
          "weather": "Current weather conditions from weather API",
          "pitch": "Detailed current pitch conditions from official sources",
          "time": "Day/Night"
        },
        "keyBattles": [
          {
            "player1": "Current in-form player from team 1",
            "player2": "Current in-form player from team 2",
            "analysis": "Detailed analysis of this matchup based on current form"
          }
        ],
        "winningProbability": {
          "team1": "Probability based on current form and conditions",
          "team2": "Probability based on current form and conditions"
        }
      },
      "prediction": {
        "winner": "Predicted winning team based on current form",
        "margin": "Predicted victory margin based on current form",
        "keyFactors": ["Key factors based on current form"],
        "confidence": "Confidence percentage based on current data"
      }
    }`;

    let result;
    try {
      console.log('Sending prompt to Gemini AI...');
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt
      });
      console.log('Received response from Gemini AI');
      result = response.text;
    } catch (aiError) {
      console.error('Error from Gemini AI:', aiError);
      throw new Error('Failed to generate predictions. AI service error.');
    }

    if (!result) {
      throw new Error('No response received from AI service.');
    }

    console.log('Match prediction generated successfully');
    try {
      const cleanedResponse = cleanJsonResponse(result);
      const parsed = JSON.parse(cleanedResponse);
      
      // Validate the parsed response
      validateJsonStructure(parsed, ['team1', 'team2', 'venue', 'team1Stats', 'team2Stats', 'matchAnalysis', 'prediction']);
      
      // Cache the prediction
      await cachePrediction(team1Name, team2Name, 'match', parsed);
      
      return JSON.stringify(parsed);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      throw new Error('Failed to parse AI response. Please try again.');
    }
  } catch (error) {
    console.error('Error generating match prediction:', error);
    console.error('Error details:', error.message);
    throw new Error('Failed to generate match prediction. Please try again later.');
  }
}

async function getTossPrediction(team1, team2) {
  try {
    // Extract team names
    const team1Name = typeof team1 === 'string' ? team1 : team1?.name || 'Team 1';
    const team2Name = typeof team2 === 'string' ? team2 : team2?.name || 'Team 2';
    
    console.log(`Generating toss prediction for ${team1Name} vs ${team2Name}`);
    
    // Check for cached prediction
    const cachedPrediction = await getCachedPrediction(team1Name, team2Name, 'toss');
    if (cachedPrediction) {
      console.log('Using cached toss prediction');
      return JSON.stringify(cachedPrediction.response);
    }
    
    // Updated IPL match detection
    const isIPLMatch = isIPLTeam(team1) && isIPLTeam(team2);
    console.log('Is IPL match:', isIPLMatch, { team1: team1Name, team2: team2Name });
    
    const prompt = `Use real-time data from ESPNcricinfo, Cricbuzz, google and official IPL sources to create a highly accurate toss prediction for today's match between ${team1Name} vs ${team2Name}.
${isIPLMatch ? IPL_2025_CONTEXT : ''}

Important Instructions:
1. Use only real-time toss data and team statistics from official sources
2. Consider current toss trends and patterns from recent matches
3. Factor in current weather conditions from weather API
4. Analyze venue-specific toss patterns from current season
5. Consider team's recent toss decisions from official sources
6. Include current pitch conditions from official sources
7. Use up-to-date team strategies from recent matches
8. Consider recent match timings from official schedule
9. Analyze current tournament trends
10. Focus on high probability predictions

Data Sources:
- ESPNcricinfo for live scores and statistics
- Cricbuzz for team performance
- Official IPL website for team updates
- Weather API for match conditions
- Sports analytics websites for advanced stats

Return this exact JSON structure:
    {
      "team1": "${team1Name}",
      "team2": "${team2Name}",
      "matchVenue": {
        "name": "Actual stadium name from official IPL schedule",
        "city": "Actual city name from official IPL schedule",
        "country": "Actual country name from official IPL schedule",
        "description": "Detailed description of the venue including current pitch conditions",
        "capacity": "Actual stadium capacity",
        "knownFor": ["Actual notable features"],
        "date": "Today's date",
        "matchTime": "Actual match start time from official schedule"
      },
      "conditions": {
        "time": "Day/Night",
        "weather": "Current weather conditions from weather API",
        "pitch": "Detailed current pitch conditions from official sources"
      },
      "tossPrediction": {
        "winner": "Predicted toss winner based on current data",
        "choice": "Bat/Bowl based on current conditions",
        "confidence": "Confidence percentage based on current data",
        "reasoning": ["Detailed reasons based on current form and conditions"]
      },
      "historicalData": {
        "team1TossWinRate": "Current season toss win percentage from official sources",
        "team2TossWinRate": "Current season toss win percentage from official sources",
        "venueTossPattern": "Current season toss patterns at this venue",
        "venueHistory": "Recent toss decisions and outcomes at this venue"
      }
    }`;

    let result;
    try {
      console.log('Sending prompt to Gemini AI...');
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt
      });
      console.log('Received response from Gemini AI');
      result = response.text;
    } catch (aiError) {
      console.error('Error from Gemini AI:', aiError);
      throw new Error('Failed to generate predictions. AI service error.');
    }

    if (!result) {
      throw new Error('No response received from AI service.');
    }

    console.log('Toss prediction generated successfully');
    try {
      const cleanedResponse = cleanJsonResponse(result);
      const parsed = JSON.parse(cleanedResponse);
      
      // Validate the parsed response
      validateJsonStructure(parsed, ['team1', 'team2', 'matchVenue', 'conditions', 'tossPrediction', 'historicalData']);
      
      // Cache the prediction
      await cachePrediction(team1Name, team2Name, 'toss', parsed);
      
      return JSON.stringify(parsed);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      throw new Error('Failed to parse AI response. Please try again.');
    }
  } catch (error) {
    console.error('Error generating toss prediction:', error);
    console.error('Error details:', error.message);
    throw new Error('Failed to generate toss prediction. Please try again later.');
  }
}

module.exports = {
  getMatchPrediction,
  getTossPrediction
}; 