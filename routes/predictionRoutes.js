const express = require('express');
const router = express.Router();
const {
  getMatchWinPrediction,
  getMatchTossPrediction
} = require('../controllers/predictionController');

router.get('/:matchId/match', getMatchWinPrediction);
router.get('/:matchId/toss', getMatchTossPrediction);

module.exports = router; 