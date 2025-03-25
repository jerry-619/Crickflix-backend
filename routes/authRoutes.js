const express = require('express');
const router = express.Router();
const { login, verifyToken, setupAdmin } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.post('/login', login);
router.post('/setup-admin', setupAdmin);

// Protected routes
router.get('/verify', protect, verifyToken);

module.exports = router; 