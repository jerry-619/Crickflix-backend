const express = require('express');
const router = express.Router();
const {
  getCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../utils/fileUpload');
const fileUpload = require('express-fileupload');
const path = require('path');

// Configure express-fileupload
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/',
  createParentPath: true
}));

// Public routes
router.get('/', getCategories);
router.get('/:slug', getCategoryBySlug);

// Protected routes
router.use(protect, admin);
router.post('/', async (req, res) => {
  try {
    const { name, description, isActive } = req.body;
    let thumbnailPath = '';

    // Handle file upload if exists
    if (req.files && req.files.thumbnail) {
      const file = req.files.thumbnail;
      const fileName = Date.now() + '_' + file.name;
      thumbnailPath = '/uploads/' + fileName;
      
      // Move file to uploads folder
      await file.mv(path.join(__dirname, 'public', 'uploads', fileName));
    }

    // Create category in MongoDB
    const category = new Category({
      name,
      description,
      isActive: isActive === 'true',
      thumbnail: thumbnailPath
    });

    await category.save();
    res.status(201).json(category);

  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ message: 'Error creating category' });
  }
});
router.put('/:id', upload.single('thumbnail'), updateCategory);
router.delete('/:id', deleteCategory);

module.exports = router; 