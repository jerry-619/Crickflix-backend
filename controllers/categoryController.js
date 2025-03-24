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

// Helper function to save uploaded file
const saveUploadedFile = async (file, filename) => {
  try {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'thumbnails', filename);
    await file.mv(uploadPath);
    return `uploads/thumbnails/${filename}`;
  } catch (error) {
    console.error('Error saving file:', error);
    throw error;
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
    console.log('Creating category with data:', req.body);
    console.log('Files received:', req.files);

    if (!req.body.name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const categoryData = {
      name: req.body.name,
      description: req.body.description,
      isActive: req.body.isActive === 'true'
    };
    
    // Handle thumbnail upload
    if (req.files && req.files.thumbnail) {
      const file = req.files.thumbnail;
      const filename = `${Date.now()}-${file.name}`;
      categoryData.thumbnail = await saveUploadedFile(file, filename);
    }

    const category = await Category.create(categoryData);
    
    // Return full URL for thumbnail
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const categoryWithUrl = {
      ...category.toObject(),
      thumbnail: category.thumbnail ? `${baseUrl}/${category.thumbnail}` : null
    };

    res.status(201).json(categoryWithUrl);
  } catch (error) {
    // Delete uploaded file if category creation fails
    if (categoryData && categoryData.thumbnail) {
      await deleteFile(categoryData.thumbnail);
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
    console.log('Updating category with data:', req.body);
    console.log('Files received:', req.files);

    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const categoryData = {
      name: req.body.name,
      description: req.body.description,
      isActive: req.body.isActive === 'true'
    };
    
    // Handle thumbnail update
    if (req.files && req.files.thumbnail) {
      const file = req.files.thumbnail;
      const filename = `${Date.now()}-${file.name}`;
      
      // Delete old thumbnail if it exists
      if (category.thumbnail) {
        await deleteFile(category.thumbnail);
      }
      
      categoryData.thumbnail = await saveUploadedFile(file, filename);
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
    if (categoryData && categoryData.thumbnail) {
      await deleteFile(categoryData.thumbnail);
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

    await category.remove();
    res.json({ message: 'Category removed' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory
}; 