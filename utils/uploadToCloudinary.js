const cloudinary = require('../config/cloudinary');
const fs = require('fs').promises;

const uploadToCloudinary = async (file) => {
  try {
    // Upload the file to Cloudinary
    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'crickflix', // This will create a folder in your Cloudinary account
      resource_type: 'auto'
    });

    // Delete the local file after successful upload
    await fs.unlink(file.path);

    // Return the Cloudinary URL and public_id
    return {
      url: result.secure_url,
      public_id: result.public_id
    };
  } catch (error) {
    // If upload fails, delete the local file and throw error
    await fs.unlink(file.path);
    throw error;
  }
};

module.exports = uploadToCloudinary; 