const express = require('express');
const router = express.Router();
const { getStats } = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

// Protected admin routes
router.get('/stats', protect, admin, getStats);

module.exports = router; 