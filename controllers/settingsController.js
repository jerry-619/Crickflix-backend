const Settings = require('../models/Settings');

// Get settings
exports.getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update settings
exports.updateSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create(req.body);
    } else {
      settings = await Settings.findOneAndUpdate({}, req.body, {
        new: true,
        runValidators: true
      });
    }

    // Emit socket event for settings update
    req.app.get('io').emit('settingsUpdated', settings);

    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get maintenance status (public route)
exports.getMaintenanceStatus = async (req, res) => {
  try {
    const settings = await Settings.findOne();
    if (!settings) {
      return res.json({ maintenanceMode: false });
    }
    res.json({ 
      maintenanceMode: settings.maintenanceMode,
      maintenanceMessage: settings.maintenanceMessage
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 