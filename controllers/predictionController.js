const asyncHandler = require('express-async-handler');
const Match = require('../models/Match');
const { getFantasyXI, getMatchPrediction, getTossPrediction } = require('../utils/openai');

// Helper function to safely parse JSON
function safeJsonParse(str) {
  try {
    // First try direct parsing
    return JSON.parse(str);
  } catch (error) {
    console.log('Initial JSON parse failed, attempting to clean the string');
    try {
      // Try to clean the string and parse again
      const cleaned = str.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('Failed to parse JSON even after cleaning:', error);
      throw new Error('Invalid JSON format in response');
    }
  }
}

// @desc    Get Fantasy XI prediction for a match
// @route   GET /api/predictions/:matchId/fantasy
// @access  Public
const getMatchFantasyXI = asyncHandler(async (req, res) => {
  try {
    console.log('Fetching fantasy XI for match:', req.params.matchId);
    
    const match = await Match.findById(req.params.matchId);
    if (!match) {
      console.log('Match not found:', req.params.matchId);
      res.status(404);
      throw new Error('Match not found');
    }

    console.log('Match found:', { title: match.title, team1: match.team1, team2: match.team2 });

    if (!match.team1 || !match.team2) {
      console.log('Teams not found in match data');
      res.status(400);
      throw new Error('Match teams are not properly configured');
    }

    const fantasyXI = await getFantasyXI(match.team1, match.team2);
    console.log('Fantasy XI generated successfully');
    
    try {
      const parsedResponse = safeJsonParse(fantasyXI);
      res.json(parsedResponse);
    } catch (parseError) {
      console.error('Error parsing fantasy XI response:', parseError);
      res.status(500);
      throw new Error('Invalid response format from prediction service');
    }
  } catch (error) {
    console.error('Error in getMatchFantasyXI:', error);
    res.status(error.status || 500);
    throw error;
  }
});

// @desc    Get match win prediction
// @route   GET /api/predictions/:matchId/match
// @access  Public
const getMatchWinPrediction = asyncHandler(async (req, res) => {
  try {
    console.log('Fetching match prediction for:', req.params.matchId);
    
    const match = await Match.findById(req.params.matchId);
    if (!match) {
      console.log('Match not found:', req.params.matchId);
      res.status(404);
      throw new Error('Match not found');
    }

    console.log('Match found:', { title: match.title, team1: match.team1, team2: match.team2 });

    if (!match.team1 || !match.team2) {
      console.log('Teams not found in match data');
      res.status(400);
      throw new Error('Match teams are not properly configured');
    }

    const prediction = await getMatchPrediction(match.team1, match.team2);
    console.log('Match prediction generated successfully');
    
    try {
      const parsedResponse = safeJsonParse(prediction);
      console.log('Parsed prediction response:', parsedResponse);
      
      // Basic validation of the response structure
      if (!parsedResponse || !parsedResponse.matchAnalysis) {
        throw new Error('Invalid prediction format: Missing required fields');
      }
      
      res.json(parsedResponse);
    } catch (parseError) {
      console.error('Error parsing match prediction response:', parseError);
      res.status(500);
      throw new Error('Invalid response format from prediction service');
    }
  } catch (error) {
    console.error('Error in getMatchWinPrediction:', error);
    res.status(error.status || 500);
    throw error;
  }
});

// @desc    Get toss prediction
// @route   GET /api/predictions/:matchId/toss
// @access  Public
const getMatchTossPrediction = asyncHandler(async (req, res) => {
  try {
    console.log('Fetching toss prediction for:', req.params.matchId);
    
    const match = await Match.findById(req.params.matchId);
    if (!match) {
      console.log('Match not found:', req.params.matchId);
      res.status(404);
      throw new Error('Match not found');
    }

    console.log('Match found:', { title: match.title, team1: match.team1, team2: match.team2 });

    if (!match.team1 || !match.team2) {
      console.log('Teams not found in match data');
      res.status(400);
      throw new Error('Match teams are not properly configured');
    }

    const prediction = await getTossPrediction(match.team1, match.team2);
    console.log('Toss prediction generated successfully');
    
    try {
      const parsedResponse = safeJsonParse(prediction);
      res.json(parsedResponse);
    } catch (parseError) {
      console.error('Error parsing toss prediction response:', parseError);
      res.status(500);
      throw new Error('Invalid response format from prediction service');
    }
  } catch (error) {
    console.error('Error in getMatchTossPrediction:', error);
    res.status(error.status || 500);
    throw error;
  }
});

module.exports = {
  getMatchFantasyXI,
  getMatchWinPrediction,
  getMatchTossPrediction
}; 