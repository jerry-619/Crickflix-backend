const Category = require('../models/Category');
const Match = require('../models/Match');
const fs = require('fs').promises;
const path = require('path');

// Helper function to delete file
const deleteFile = async (filePath) => {
  try {
    if (!filePath) return;
    const fullPath = path.join(__dirname, '..', filePath);
    await fs.unlink(fullPath);
    console.log('File deleted successfully:', fullPath);
  } catch (error) {
    console.error('Error deleting file:', error);
  }
};

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    
    // Transform thumbnail paths to full URLs
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const categoriesWithUrls = categories.map(cat => ({
      ...cat.toObject(),
      thumbnail: cat.thumbnail ? `${baseUrl}/${cat.thumbnail}` : null
    }));
    
    res.json(categoriesWithUrls);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single category by slug
// @route   GET /api/categories/:slug
// @access  Public
const getCategoryBySlug = async (req, res) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug });
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Transform thumbnail path to full URL
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const categoryWithUrl = {
      ...category.toObject(),
      thumbnail: category.thumbnail ? `${baseUrl}/${category.thumbnail}` : null
    };

    res.json(categoryWithUrl);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create new category
// @route   POST /api/categories
// @access  Private/Admin
const createCategory = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Thumbnail is required' });
    }

    const categoryData = {
      name: req.body.name,
      description: req.body.description || '',
      isActive: req.body.isActive === 'true',
      thumbnail: `uploads/thumbnails/${req.file.filename}`
    };

    const category = await Category.create(categoryData);
    
    // Return full URL for thumbnail
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const categoryWithUrl = {
      ...category.toObject(),
      thumbnail: `${baseUrl}/${category.thumbnail}`
    };

    res.status(201).json(categoryWithUrl);
  } catch (error) {
    if (req.file) {
      await deleteFile(`uploads/thumbnails/${req.file.filename}`);
    }
    console.error('Error creating category:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Category already exists' });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private/Admin
const updateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      if (req.file) {
        await deleteFile(`uploads/thumbnails/${req.file.filename}`);
      }
      return res.status(404).json({ message: 'Category not found' });
    }

    const categoryData = { ...req.body };
    
    // Handle thumbnail update
    if (req.file) {
      // Delete old thumbnail if it exists
      if (category.thumbnail) {
        await deleteFile(category.thumbnail);
      }
      categoryData.thumbnail = `uploads/thumbnails/${req.file.filename}`;
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      categoryData,
      { new: true, runValidators: true }
    );

    // Return full URL for thumbnail
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const categoryWithUrl = {
      ...updatedCategory.toObject(),
      thumbnail: updatedCategory.thumbnail ? `${baseUrl}/${updatedCategory.thumbnail}` : null
    };

    res.json(categoryWithUrl);
  } catch (error) {
    // Delete uploaded file if update fails
    if (req.file) {
      await deleteFile(`uploads/thumbnails/${req.file.filename}`);
    }

    console.error('Error updating category:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Category already exists' });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Check if category has matches
    const matchCount = await Match.countDocuments({ category: req.params.id });
    if (matchCount > 0) {
      return res.status(400).json({
        message: 'Cannot delete category with matches. Please delete or move matches first.'
      });
    }

    // Delete thumbnail if it exists
    if (category.thumbnail) {
      await deleteFile(category.thumbnail);
    }

    // Use deleteOne() instead of remove()
    await Category.deleteOne({ _id: req.params.id });
    // Or alternatively: await category.deleteOne();

    res.json({ message: 'Category removed successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

module.exports = {
  getCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory
}; 