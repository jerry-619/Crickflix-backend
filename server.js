const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const fileUpload = require('express-fileupload');

// Load env vars
dotenv.config();

// Create uploads directory if it doesn't exist
const createUploadDirs = async () => {
  const uploadsDir = path.join(__dirname, 'uploads');
  const thumbnailsDir = path.join(uploadsDir, 'thumbnails');

  try {
    // Create directories with proper permissions
    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.mkdir(thumbnailsDir, { recursive: true });
    
    // Set proper permissions (read/write for owner and group)
    await fs.chmod(uploadsDir, 0o775);
    await fs.chmod(thumbnailsDir, 0o775);
    
    console.log('Upload directories created successfully');
  } catch (error) {
    console.error('Error creating upload directories:', error);
  }
};

// Create upload directories
createUploadDirs();

// Route files
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const matchRoutes = require('./routes/matchRoutes');
const streamRoutes = require('./routes/streamRoutes');
const adminRoutes = require('./routes/adminRoutes');
const blogRoutes = require('./routes/blogRoutes');

const app = express();

// Enable CORS with proper configuration
app.use(cors({
  origin: [
    'http://localhost:5173',  // Vite dev server
    'http://localhost:3000',  // Frontend
    'http://localhost:3001',  // Admin
    process.env.FRONTEND_URL,
    process.env.ADMIN_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// File Upload Middleware
app.use(fileUpload({
  createParentPath: true,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  },
  abortOnLimit: true,
  useTempFiles: true,
  tempFileDir: '/tmp/',
  debug: true
}));

// Increase payload limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Static folder with proper path and CORS headers
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api', streamRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/blogs', blogRoutes);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {

})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.log('MongoDB connection error:', err));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File is too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ message: 'File upload error: ' + err.message });
  }
  
  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({ message: err.message });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request entity too large. Please reduce the file size.' });
  }
  
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


