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

// Protected admin routes
router.use(protect);
router.use(admin);

router.route('/')
  .get(getSettings)
  .put(updateSettings);

module.exports = router; 