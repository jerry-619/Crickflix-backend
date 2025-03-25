const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  maintenanceMode: {
    type: Boolean,
    default: false
  },
  maintenanceMessage: {
    type: String,
    default: "We're currently performing maintenance. Please check back soon."
  },
  allowAdminAccess: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
settingsSchema.pre('save', async function(next) {
  const Settings = this.constructor;
  if (this.isNew) {
    const count = await Settings.countDocuments();
    if (count > 0) {
      next(new Error('Only one settings document can exist'));
    }
  }
  next();
});

module.exports = mongoose.model('Settings', settingsSchema); 