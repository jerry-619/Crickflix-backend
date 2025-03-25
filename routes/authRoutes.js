const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  login,
  register,
  verifyToken,
  refreshToken
} = require('../controllers/authController');

// Public routes
router.post('/login', login);
router.post('/register', register);
router.post('/refresh-token', refreshToken);

// Protected routes
router.get('/verify', protect, verifyToken);

module.exports = router; 