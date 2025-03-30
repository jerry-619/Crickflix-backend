const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const createUploadDirs = () => {
  const dirs = [
    'uploads',
    'uploads/thumbnails',
    'uploads/logos'
  ];
  
  dirs.forEach(dir => {
    const fullPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });
};

// Create directories on startup
createUploadDirs();

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath;
    
    // Determine upload directory based on file type
    if (file.fieldname === 'thumbnail') {
      uploadPath = path.join(__dirname, '..', 'uploads', 'thumbnails');
    } else if (file.fieldname === 'logo') {
      uploadPath = path.join(__dirname, '..', 'uploads', 'logos');
    }
    
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Create unique filename with original extension
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    cb(null, filename);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Allow only images
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG and WebP images are allowed.'), false);
  }
};

// Initialize upload
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 5 // 5MB limit
  }
});

// Error handling middleware
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'File too large! Maximum size is 5MB.'
      });
    }
    return res.status(400).json({
      message: err.message
    });
  }
  
  if (err) {
    return res.status(400).json({
      message: err.message
    });
  }
  
  // Add file URLs to the request
  if (req.files) {
    Object.keys(req.files).forEach(fieldname => {
      req.files[fieldname] = req.files[fieldname].map(file => ({
        ...file,
        url: `/uploads/${fieldname}s/${file.filename}`
      }));
    });
  }
  
  next();
};

module.exports = {
  upload,
  handleUploadError
}; 