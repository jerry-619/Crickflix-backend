const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
    // Remove any markdown code block syntax
    let cleaned = response.replace(/```json\n?|\n?```/g, '');
    // Remove any trailing/leading whitespace
    cleaned = cleaned.trim();
    console.log('Cleaned Response:', cleaned);
    return cleaned;
  } catch (error) {
    console.error('Error cleaning response:', error);
    return response;
  }
}

// Current IPL 2025 teams context
const IPL_2025_CONTEXT = `
Current IPL 2025 Teams and Key Information:
1. Mumbai Indians (MI)
Captain: Hardik Pandya
Key players: Rohit Sharma, Suryakumar Yadav, Tilak Varma, Will Jacks, Jasprit Bumrah, Mubeeb-ur-Rahman, Trent Boult

2. Chennai Super Kings (CSK)
Captain: MS Dhoni
Key players: Ruturaj Gaikwad, Ravindra Jadeja, Deepak Hooda, Rachin Ravindra, Sam Curran, Matheesha Pathirana

3. Gujarat Titans (GT)
Captain: Shubman Gill
Key players: Jos Buttler, Rashid Khan, Mohammed Siraj, Gerald Coetzee, Rahul Tewatia, Sai Sudharsan

4. Royal Challengers Bengaluru (RCB)
Captain: Rajat Patidar
Key players: Virat Kohli, Phil Salt, Jitesh Sharma, Krunal Pandya, Josh Hazlewood, Bhuvneshwar Kumar

5. Kolkata Knight Riders (KKR)
Captain: Ajinkya Rahane
Key players: Rinku Singh, Andre Russell, Sunil Narine, Moeen Ali, Anrich Nortje, Quinton de Kock

6. Rajasthan Royals (RR)
Captain: Sanju Samson
Key players: Yashasvi Jaiswal, Shimron Hetmyer, Riyan Parag, Jofra Archer, Wanindu Hasaranga

7. Lucknow Super Giants (LSG)
Captain: Rishabh Pant
Key players: David Miller, Nicholas Pooran, Mitchell Marsh, Ravi Bishnoi, Mohsin Khan, Shamar Joseph

8. Punjab Kings (PBKS)
Captain: Shreyas Iyer
Key players: Nehal Wadhera, Marcus Stoinis, Glenn Maxwell, Arshdeep Singh, Kagiso Rabada

9. Delhi Capitals (DC)
Captain: KL Rahul
Key players: Jake Fraser-McGurk, Mitchell Starc, Kuldeep Yadav, Axar Patel, T Natarajan

10. Sunrisers Hyderabad (SRH)
Captain: Pat Cummins
Key players: Ishan Kishan, Heinrich Klaasen, Travis Head, Mohammad Shami, Abhishek Sharma

Consider all recent trades, auctions, and team changes for IPL 2025. Base predictions on current team compositions and player availability as of March 29, 2025.
Important team changes to note:
- Hardik Pandya is now captain of Mumbai Indians
- Rajat Patidar leads RCB
- Shreyas Iyer moved to Punjab Kings as captain
- KL Rahul leads Delhi Capitals
- Pat Cummins captains Sunrisers Hyderabad
- Rishabh Pant returns as LSG captain
`;

// Add this helper function at the top with other helper functions
function isIPLTeam(teamName) {
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
  
  return iplTeams[teamName.toUpperCase()] || false;
}

async function getFantasyXI(team1, team2) {
  try {
    console.log(`Generating fantasy XI for ${team1} vs ${team2}`);
    
    // Updated IPL match detection
    const isIPLMatch = isIPLTeam(team1) && isIPLTeam(team2);
    console.log('Is IPL match:', isIPLMatch, { team1, team2 });
    
    const prompt = `You are simulating cricket match fantasy predictions. Create a realistic fantasy XI for today's match between ${team1} vs ${team2}.
${isIPLMatch ? IPL_2025_CONTEXT : ''}
Use your knowledge of cricket and current player statistics to create plausible predictions.
Important: DO NOT explain limitations or apologize - just generate the JSON data as requested.

Return this exact JSON structure:
    {
      "team1": "${team1}",
      "team2": "${team2}",
      "players": [
        {
          "name": "Player Name",
          "role": "Role (Batsman/Bowler/All-rounder/Wicket-keeper)",
          "team": "Team Name",
          "isCaptain": false,
          "isViceCaptain": false,
          "recentForm": "Brief note on performance in last 3 matches",
          "matchesPlayed": "5",
          "currentStats": {
            "runs": "125",
            "wickets": "3",
            "average": "31.25",
            "strikeRate": "145.35"
          },
          "selectionReason": "Brief reason why this player is selected"
        }
      ],
      "captain": {
        "name": "Captain Name",
        "team": "Team Name",
        "role": "Player Role",
        "reason": "Detailed reason for captain selection",
        "currentForm": "Recent performance stats",
        "expectedPoints": "Projected fantasy points"
      },
      "viceCaptain": {
        "name": "Vice Captain Name",
        "team": "Team Name",
        "role": "Player Role",
        "reason": "Detailed reason for vice-captain selection",
        "currentForm": "Recent performance stats",
        "expectedPoints": "Projected fantasy points"
      },
      "teamComposition": {
        "batsmen": "4",
        "bowlers": "4",
        "allRounders": "2",
        "wicketKeeper": "1"
      },
      "matchInfo": {
        "tournament": "${isIPLMatch ? 'IPL 2025' : 'Cricket Match'}",
        "venue": {
          "name": "Match Venue Name",
          "city": "City Name",
          "country": "Country Name",
          "description": "Detailed description of the venue including its history, pitch characteristics, boundary dimensions, and any notable features",
          "capacity": "Stadium capacity",
          "knownFor": ["Notable feature 1", "Notable feature 2"],
          "date": "${new Date().toISOString().split('T')[0]}",
          "matchTime": "Match start time (e.g., 7:30 PM IST)"
        },
        "pitchReport": "Brief pitch and weather conditions",
        "lastUpdated": "${new Date().toISOString()}"
      },
      "teamSummary": {
        "totalProjectedPoints": "Expected total fantasy points",
        "strengths": [
          "Key strength point 1",
          "Key strength point 2"
        ],
        "risks": [
          "Potential risk factor 1",
          "Potential risk factor 2"
        ],
        "analysis": "Detailed analysis of why this combination is recommended and how it's expected to perform"
      }
    }`;
    
    let result;
    try {
      console.log('Sending prompt to Gemini AI...');
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
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

    console.log('Fantasy XI generated successfully');
    try {
      const cleanedResponse = cleanJsonResponse(result);
      // Validate the cleaned response
      const parsed = JSON.parse(cleanedResponse);
      if (!parsed || !parsed.team1 || !parsed.team2 || !parsed.players) {
        throw new Error('Invalid response format from AI service.');
      }
      return cleanedResponse;
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      throw new Error('Failed to parse AI response. Please try again.');
    }
  } catch (error) {
    console.error('Error generating fantasy XI:', error);
    console.error('Error details:', error.message);
    throw new Error(error.message || 'Failed to generate fantasy XI. Please try again later.');
  }
}

async function getMatchPrediction(team1, team2) {
  try {
    console.log(`Generating match prediction for ${team1} vs ${team2}`);
    
    // Updated IPL match detection
    const isIPLMatch = isIPLTeam(team1) && isIPLTeam(team2);
    console.log('Is IPL match:', isIPLMatch, { team1, team2 });
    
    const prompt = `You are simulating cricket match predictions. Create a realistic prediction for today's match between ${team1} vs ${team2}.
${isIPLMatch ? IPL_2025_CONTEXT : ''}
Use your knowledge of cricket and current player statistics to create plausible predictions.
Important: DO NOT explain limitations or apologize - just generate the JSON data as requested.
Important: You MUST provide complete venue information including name, city, country, and description.

Return this exact JSON structure:
    {
      "team1": "${team1}",
      "team2": "${team2}",
      "venue": {
        "name": "Provide actual venue name (e.g., Wankhede Stadium, Eden Gardens, etc.)",
        "city": "Provide actual city name (e.g., Mumbai, Kolkata, etc.)",
        "country": "Provide actual country name (e.g., India)",
        "description": "Provide actual venue description with history and features",
        "capacity": "Provide actual stadium capacity (e.g., 33,000)",
        "knownFor": ["Provide actual notable features"],
        "date": "${new Date().toISOString().split('T')[0]}",
        "matchTime": "7:30 PM IST"
      },
      "team1Stats": {
        "recentForm": "Recent performance summary",
        "keyPlayers": ["Player 1", "Player 2", "Player 3"],
        "strengths": ["Strength 1", "Strength 2"],
        "weaknesses": ["Weakness 1", "Weakness 2"]
      },
      "team2Stats": {
        "recentForm": "Recent performance summary",
        "keyPlayers": ["Player 1", "Player 2", "Player 3"],
        "strengths": ["Strength 1", "Strength 2"],
        "weaknesses": ["Weakness 1", "Weakness 2"]
      },
      "matchAnalysis": {
        "conditions": {
          "weather": "Weather conditions",
          "pitch": "Detailed pitch conditions and behavior",
          "time": "Day/Night"
        },
        "keyBattles": [
          {
            "player1": "Team 1 Player",
            "player2": "Team 2 Player",
            "analysis": "Analysis of this matchup"
          }
        ],
        "winningProbability": {
          "team1": "55%",
          "team2": "45%"
        }
      },
      "prediction": {
        "winner": "Predicted winning team",
        "margin": "Predicted victory margin",
        "keyFactors": ["Factor 1", "Factor 2"],
        "confidence": "75%"
      }
    }`;

    let result;
    try {
      console.log('Sending prompt to Gemini AI...');
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
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
      
      // Validate venue information
      if (!parsed.venue || !parsed.venue.name || !parsed.venue.city || !parsed.venue.country) {
        throw new Error('Invalid venue information in AI response.');
      }

      // Ensure venue has all required fields
      parsed.venue = {
        name: parsed.venue.name || 'N/A',
        city: parsed.venue.city || 'N/A',
        country: parsed.venue.country || 'N/A',
        description: parsed.venue.description || 'No description available',
        capacity: parsed.venue.capacity || 'N/A',
        knownFor: Array.isArray(parsed.venue.knownFor) ? parsed.venue.knownFor : ['N/A'],
        date: new Date().toISOString().split('T')[0],
        matchTime: parsed.venue.matchTime || '7:30 PM IST'
      };

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
    console.log(`Generating toss prediction for ${team1} vs ${team2}`);
    
    // Updated IPL match detection
    const isIPLMatch = isIPLTeam(team1) && isIPLTeam(team2);
    console.log('Is IPL match:', isIPLMatch, { team1, team2 });
    
    const prompt = `You are simulating cricket match toss predictions. Create a realistic toss prediction for today's match between ${team1} vs ${team2}.
${isIPLMatch ? IPL_2025_CONTEXT : ''}
Use your knowledge of cricket and current statistics to create plausible predictions.
Important: DO NOT explain limitations or apologize - just generate the JSON data as requested.
Important: You MUST provide complete venue information including name, city, country, and description.

Return this exact JSON structure:
    {
      "team1": "${team1}",
      "team2": "${team2}",
      "matchVenue": {
        "name": "Provide actual venue name (e.g., Wankhede Stadium, Eden Gardens, etc.)",
        "city": "Provide actual city name (e.g., Mumbai, Kolkata, etc.)",
        "country": "Provide actual country name (e.g., India)",
        "description": "Provide actual venue description with history and features",
        "capacity": "Provide actual stadium capacity (e.g., 33,000)",
        "knownFor": ["Provide actual notable features"],
        "date": "${new Date().toISOString().split('T')[0]}",
        "matchTime": "7:30 PM IST"
      },
      "conditions": {
        "time": "Day/Night",
        "weather": "Weather conditions",
        "pitch": "Detailed pitch conditions and behavior"
      },
      "tossPrediction": {
        "winner": "Team predicted to win toss",
        "choice": "Bat/Bowl",
        "confidence": "65%",
        "reasoning": ["Reason 1", "Reason 2"]
      },
      "historicalData": {
        "team1TossWinRate": "Recent toss win percentage",
        "team2TossWinRate": "Recent toss win percentage",
        "venueTossPattern": "Common toss decisions at this venue",
        "venueHistory": "Historical toss decisions and their outcomes at this venue"
      }
    }`;

    let result;
    try {
      console.log('Sending prompt to Gemini AI...');
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
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
      
      // Validate venue information
      if (!parsed.matchVenue || !parsed.matchVenue.name || !parsed.matchVenue.city || !parsed.matchVenue.country) {
        throw new Error('Invalid venue information in AI response.');
      }

      // Ensure venue has all required fields
      parsed.matchVenue = {
        name: parsed.matchVenue.name || 'N/A',
        city: parsed.matchVenue.city || 'N/A',
        country: parsed.matchVenue.country || 'N/A',
        description: parsed.matchVenue.description || 'No description available',
        capacity: parsed.matchVenue.capacity || 'N/A',
        knownFor: Array.isArray(parsed.matchVenue.knownFor) ? parsed.matchVenue.knownFor : ['N/A'],
        date: new Date().toISOString().split('T')[0],
        matchTime: parsed.matchVenue.matchTime || '7:30 PM IST'
      };

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
  getFantasyXI,
  getMatchPrediction,
  getTossPrediction
}; 