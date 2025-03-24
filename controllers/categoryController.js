const Category = require('../models/Category');
const Match = require('../models/Match');
const cloudinary = require('../config/cloudinary');
const uploadToCloudinary = require('../utils/uploadToCloudinary');
const fs = require('fs').promises;
const path = require('path');
const asyncHandler = require('express-async-handler');

// Helper function to delete file from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return;
    await cloudinary.uploader.destroy(publicId);
    console.log('File deleted from Cloudinary successfully:', publicId);
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
  }
};

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.json(categories);
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

    res.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create new category
// @route   POST /api/categories
// @access  Private/Admin
const createCategory = asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Thumbnail is required' });
    }

    // Upload thumbnail to Cloudinary
    const uploadResult = await uploadToCloudinary(req.file);

    const categoryData = {
      name: req.body.name,
      description: req.body.description || '',
      isActive: req.body.isActive === 'true',
      thumbnail: uploadResult.url,
      thumbnailPublicId: uploadResult.public_id
    };

    const category = await Category.create(categoryData);
    
    // Emit socket event for new category
    req.app.get('io').emit('categoryCreated', category);
    
    res.status(201).json(category);
  } catch (error) {
    if (req.file) {
      await fs.unlink(req.file.path).catch(console.error);
    }
    console.error('Error creating category:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Category already exists' });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
});

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private/Admin
const updateCategory = asyncHandler(async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      if (req.file) {
        await fs.unlink(req.file.path).catch(console.error);
      }
      return res.status(404).json({ message: 'Category not found' });
    }

    const categoryData = { ...req.body };
    
    // Handle thumbnail update
    if (req.file) {
      // Delete old thumbnail from Cloudinary if it exists
      if (category.thumbnailPublicId) {
        await deleteFromCloudinary(category.thumbnailPublicId);
      }

      // Upload new thumbnail to Cloudinary
      const uploadResult = await uploadToCloudinary(req.file);
      categoryData.thumbnail = uploadResult.url;
      categoryData.thumbnailPublicId = uploadResult.public_id;
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      categoryData,
      { new: true, runValidators: true }
    );

    // Emit socket event for category update
    req.app.get('io').emit('categoryUpdated', updatedCategory);

    res.json(updatedCategory);
  } catch (error) {
    // Delete uploaded file if update fails
    if (req.file) {
      await fs.unlink(req.file.path).catch(console.error);
    }

    console.error('Error updating category:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Category already exists' });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
});

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
const deleteCategory = asyncHandler(async (req, res) => {
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

    // Delete thumbnail from Cloudinary if it exists
    if (category.thumbnailPublicId) {
      await deleteFromCloudinary(category.thumbnailPublicId);
    }

    await Category.deleteOne({ _id: req.params.id });
    
    // Emit socket event for category deletion
    req.app.get('io').emit('categoryDeleted', req.params.id);

    res.json({ message: 'Category removed' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

module.exports = {
  getCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory
}; 