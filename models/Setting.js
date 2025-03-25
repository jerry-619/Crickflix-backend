const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },
  value: mongoose.Schema.Types.Mixed
}, { timestamps: true });

const Setting = mongoose.model('Setting', settingSchema);

// Create maintenance mode setting if not exists
Setting.findOne({ key: 'maintenanceMode' })
  .then(setting => {
    if (!setting) {
      Setting.create({ key: 'maintenanceMode', value: false });
    }
  });

module.exports = Setting; 