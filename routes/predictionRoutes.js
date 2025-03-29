const express = require('express');
const router = express.Router();
const {
  getMatchFantasyXI,
  getMatchWinPrediction,
  getMatchTossPrediction
} = require('../controllers/predictionController');

router.get('/:matchId/fantasy', getMatchFantasyXI);
router.get('/:matchId/match', getMatchWinPrediction);
router.get('/:matchId/toss', getMatchTossPrediction);

module.exports = router; 