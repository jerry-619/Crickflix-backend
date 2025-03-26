const express = require('express');
const router = express.Router();

// Import route modules
const matchRoutes = require('./match.routes');
const categoryRoutes = require('./category.routes');
const blogRoutes = require('./blog.routes');
const uploadRoutes = require('./upload.routes');

// Simple ping route for keep-alive
router.get('/ping', (req, res) => {
  res.status(200).json({ message: 'Server is alive' });
});

// Use route modules
router.use('/matches', matchRoutes);
router.use('/categories', categoryRoutes);
router.use('/blogs', blogRoutes);
router.use('/upload', uploadRoutes);

module.exports = router; 