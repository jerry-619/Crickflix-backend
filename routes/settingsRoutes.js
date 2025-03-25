const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  getSettings,
  updateSettings,
  getMaintenanceStatus
} = require('../controllers/settingsController');

// Public routes
router.get('/maintenance', getMaintenanceStatus);

// Protected routes
router.get('/', protect, admin, getSettings);
router.put('/', protect, admin, updateSettings);

module.exports = router; 