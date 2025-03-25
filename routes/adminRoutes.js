const express = require('express');
const router = express.Router();
const { getStats } = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');
const Setting = require('../models/Setting');

// Protected admin routes
router.get('/stats', protect, admin, getStats);

// Add new routes
router.get('/maintenance', protect, admin, async (req, res) => {
  const setting = await Setting.findOne({ key: 'maintenanceMode' });
  res.json({ maintenanceMode: setting?.value || false });
});

router.put('/maintenance', protect, admin, async (req, res) => {
  const { maintenanceMode } = req.body;
  const setting = await Setting.findOneAndUpdate(
    { key: 'maintenanceMode' },
    { value: maintenanceMode },
    { new: true, upsert: true }
  );
  res.json({ maintenanceMode: setting.value });
});

module.exports = router; 