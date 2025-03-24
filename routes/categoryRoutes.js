const express = require('express');
const router = express.Router();
const { upload } = require('../server');
const {
  getCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');
const { protect, admin } = require('../middleware/authMiddleware');

// Public routes
router.get('/', getCategories);
router.get('/:slug', getCategoryBySlug);

// Protected routes
router.post('/', protect, admin, upload.single('thumbnail'), createCategory);
router.put('/:id', protect, admin, upload.single('thumbnail'), updateCategory);
router.delete('/:id', protect, admin, deleteCategory);

module.exports = router; 