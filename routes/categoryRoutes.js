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

// Public routes
router.get('/', getCategories);
router.get('/:slug', getCategoryBySlug);

// Protected routes
router.use(protect, admin);
router.post('/', upload.single('thumbnail'), createCategory);
router.put('/:id', upload.single('thumbnail'), updateCategory);
router.delete('/:id', deleteCategory);

module.exports = router; 