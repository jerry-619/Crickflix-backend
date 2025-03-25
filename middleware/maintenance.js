const Setting = require('../models/Setting');

const checkMaintenance = async (req, res, next) => {
  try {
    const maintenance = await Setting.findOne({ key: 'maintenanceMode' });
    if (maintenance?.value && !req.path.startsWith('/admin')) {
      return res.status(503).json({
        message: 'Service unavailable due to maintenance'
      });
    }
    next();
  } catch (error) {
    console.error('Maintenance check error:', error);
    next();
  }
};

module.exports = checkMaintenance; 