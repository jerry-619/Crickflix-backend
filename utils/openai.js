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

async function getFantasyXI(team1, team2) {
  try {
    console.log(`Generating fantasy XI for ${team1} vs ${team2}`);
    const prompt = `You are simulating IPL 2025 fantasy predictions. Create a realistic fantasy XI for a match between ${team1} and ${team2}. 
${IPL_2025_CONTEXT}
Use your knowledge of cricket to create plausible current form and statistics that would make sense for IPL 2025.
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
          "matchesPlayed2025": "5",
          "currentStats2025": {
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
        "currentForm2025": "Recent performance stats",
        "expectedPoints": "Projected fantasy points"
      },
      "viceCaptain": {
        "name": "Vice Captain Name",
        "team": "Team Name",
        "role": "Player Role",
        "reason": "Detailed reason for vice-captain selection",
        "currentForm2025": "Recent performance stats",
        "expectedPoints": "Projected fantasy points"
      },
      "teamComposition": {
        "batsmen": "4",
        "bowlers": "4",
        "allRounders": "2",
        "wicketKeeper": "1"
      },
      "matchInfo": {
        "tournament": "IPL 2025",
        "venue": "Match Venue",
        "pitchReport": "Brief pitch and weather conditions",
        "date": "2025-03-29",
        "lastUpdated": "2025-03-29T${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}Z"
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
    
    const result = await retryOperation(async () => {
      console.log('Sending prompt to Gemini AI...');
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt
      });
      console.log('Received response from Gemini AI');
      console.log('Response object:', response);
      console.log('Response text:', response.text);
      return response.text;
    });

    console.log('Fantasy XI generated successfully');
    const cleanedResponse = cleanJsonResponse(result);
    return cleanedResponse;
  } catch (error) {
    console.error('Error generating fantasy XI:', error);
    console.error('Error details:', error.message);
    throw new Error('Failed to generate fantasy XI. Please try again later.');
  }
}

async function getMatchPrediction(team1, team2) {
  try {
    console.log(`Generating match prediction for ${team1} vs ${team2}`);
    const prompt = `You are simulating IPL 2025 match predictions. Create a realistic prediction for a match between ${team1} and ${team2}.
${IPL_2025_CONTEXT}
Use your knowledge of cricket to create plausible statistics and analysis that would make sense for IPL 2025.
Important: DO NOT explain limitations or apologize - just generate the JSON data as requested.

Return this exact JSON structure:
    {
      "team1": "${team1}",
      "team2": "${team2}",
      "team1Stats2025": {
        "matchesPlayed": "5",
        "matchesWon": "3",
        "currentPosition": "4",
        "recentForm": "W W L W L"
      },
      "team2Stats2025": {
        "matchesPlayed": "5",
        "matchesWon": "4",
        "currentPosition": "2",
        "recentForm": "W W W L W"
      },
      "team1Probability": "45%",
      "team2Probability": "55%",
      "analysis": "Detailed match analysis and prediction",
      "keyFactors": {
        "currentForm": "Team form analysis",
        "injuries": "Key player availability",
        "venue": "Venue impact analysis"
      },
      "matchInfo": {
        "tournament": "IPL 2025",
        "venue": "Match Venue",
        "date": "today date in dd/mm/yyyy format",
        "lastUpdated": "2025-03-29T${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}Z"
      }
    }`;
    
    const result = await retryOperation(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt
      });
      return response.text;
    });

    console.log('Match prediction generated successfully');
    const cleanedResponse = cleanJsonResponse(result);
    return cleanedResponse;
  } catch (error) {
    console.error('Error generating match prediction:', error);
    throw new Error('Failed to generate match prediction. Please try again later.');
  }
}

async function getTossPrediction(team1, team2) {
  try {
    console.log(`Generating toss prediction for ${team1} vs ${team2}`);
    const prompt = `You are simulating IPL 2025 toss predictions. Create a realistic toss prediction for a match between ${team1} and ${team2}.
${IPL_2025_CONTEXT}
Use your knowledge of cricket to create plausible statistics and analysis that would make sense for IPL 2025.
Important: DO NOT explain limitations or apologize - just generate the JSON data as requested.

Return this exact JSON structure:
    {
      "winner": "Predicted team to win toss",
      "decision": "Predicted decision (bat/field)",
      "tossStats2025": {
        "team1": {
          "tossesWon": "3",
          "battingFirst": "2",
          "fieldingFirst": "1",
          "tossWinRate": "60%"
        },
        "team2": {
          "tossesWon": "2",
          "battingFirst": "1",
          "fieldingFirst": "1",
          "tossWinRate": "40%"
        }
      },
      "venueStats2025": {
        "totalMatches": "4",
        "battingFirstWins": "3",
        "fieldingFirstWins": "1"
      },
      "reasoning": "Detailed toss prediction analysis",
      "matchInfo": {
        "tournament": "IPL 2025",
        "venue": "Match Venue",
        "date": "today date in dd/mm/yyyy format",
        "lastUpdated": "2025-03-29T${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}Z"
      }
    }`;
    
    const result = await retryOperation(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt
      });
      return response.text;
    });

    console.log('Toss prediction generated successfully');
    const cleanedResponse = cleanJsonResponse(result);
    return cleanedResponse;
  } catch (error) {
    console.error('Error generating toss prediction:', error);
    throw new Error('Failed to generate toss prediction. Please try again later.');
  }
}

module.exports = {
  getFantasyXI,
  getMatchPrediction,
  getTossPrediction
}; 