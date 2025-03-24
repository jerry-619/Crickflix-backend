const Blog = require('../models/Blog');
const asyncHandler = require('express-async-handler');
const cloudinary = require('../config/cloudinary');
const uploadToCloudinary = require('../utils/uploadToCloudinary');
const fs = require('fs').promises;
const path = require('path');

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

// @desc    Get all blogs
// @route   GET /api/blogs
// @access  Public
const getBlogs = asyncHandler(async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).json({ message: 'Failed to fetch blogs' });
  }
});

// @desc    Get single blog by slug
// @route   GET /api/blogs/:slug
// @access  Public
const getBlogBySlug = asyncHandler(async (req, res) => {
  try {
    const blog = await Blog.findOneAndUpdate(
      { slug: req.params.slug },
      { $inc: { views: 1 } },
      { new: true }
    );
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    
    res.json(blog);
  } catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).json({ message: 'Failed to fetch blog' });
  }
});

// @desc    Create blog
// @route   POST /api/blogs
// @access  Private/Admin
const createBlog = asyncHandler(async (req, res) => {
  const { title, content, author, isPublished = true } = req.body;

  if (!title || !content || !author) {
    res.status(400);
    throw new Error('Please fill in all required fields');
  }

  if (!req.file) {
    res.status(400);
    throw new Error('Please upload a thumbnail image');
  }

  try {
    // Upload thumbnail to Cloudinary
    const uploadResult = await uploadToCloudinary(req.file);

    const slug = title.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-');

    const blog = await Blog.create({
      title,
      content,
      author,
      thumbnail: uploadResult.url,
      thumbnailPublicId: uploadResult.public_id,
      slug,
      isPublished: isPublished === 'true'
    });

    // Emit socket event for new blog
    req.app.get('io').emit('blogCreated', blog);
    
    res.status(201).json(blog);
  } catch (error) {
    // Clean up uploaded file if blog creation fails
    if (req.file) {
      await fs.unlink(req.file.path).catch(console.error);
    }
    console.error('Error creating blog:', error);
    res.status(400).json({ message: 'Failed to create blog' });
  }
});

// @desc    Update blog
// @route   PUT /api/blogs/:id
// @access  Private/Admin
const updateBlog = asyncHandler(async (req, res) => {
  const blog = await Blog.findById(req.params.id);

  if (!blog) {
    res.status(404);
    throw new Error('Blog not found');
  }

  const { title, content, author, isPublished } = req.body;
  let thumbnailData = {};

  try {
    if (req.file) {
      // Delete old thumbnail from Cloudinary if it exists
      if (blog.thumbnailPublicId) {
        await deleteFromCloudinary(blog.thumbnailPublicId);
      }

      // Upload new thumbnail to Cloudinary
      const uploadResult = await uploadToCloudinary(req.file);
      thumbnailData = {
        thumbnail: uploadResult.url,
        thumbnailPublicId: uploadResult.public_id
      };
    }

    const updatedBlog = await Blog.findByIdAndUpdate(
      req.params.id,
      {
        title: title || blog.title,
        content: content || blog.content,
        author: author || blog.author,
        ...thumbnailData,
        isPublished: isPublished === 'true',
        slug: title ? title.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-') : blog.slug
      },
      { new: true, runValidators: true }
    );

    // Emit socket event for blog update
    req.app.get('io').emit('blogUpdated', updatedBlog);

    res.json(updatedBlog);
  } catch (error) {
    // Clean up uploaded file if update fails
    if (req.file) {
      await fs.unlink(req.file.path).catch(console.error);
    }
    console.error('Error updating blog:', error);
    res.status(400).json({ message: 'Could not update blog' });
  }
});

// @desc    Delete blog
// @route   DELETE /api/blogs/:id
// @access  Private/Admin
const deleteBlog = asyncHandler(async (req, res) => {
  const blog = await Blog.findById(req.params.id);

  if (!blog) {
    res.status(404);
    throw new Error('Blog not found');
  }

  try {
    // Delete thumbnail from Cloudinary if exists
    if (blog.thumbnailPublicId) {
      await deleteFromCloudinary(blog.thumbnailPublicId);
    }

    await blog.deleteOne();

    // Emit socket event for blog deletion
    req.app.get('io').emit('blogDeleted', req.params.id);

    res.json({ message: 'Blog deleted successfully' });
  } catch (error) {
    console.error('Error deleting blog:', error);
    res.status(500).json({ message: 'Failed to delete blog' });
  }
});

module.exports = {
  getBlogs,
  getBlogBySlug,
  createBlog,
  updateBlog,
  deleteBlog
}; 