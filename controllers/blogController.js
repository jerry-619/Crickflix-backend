const Blog = require('../models/Blog');
const asyncHandler = require('express-async-handler');
const fs = require('fs').promises;
const path = require('path');

const saveBase64Image = async (base64String) => {
  try {
    // Extract the base64 data and file extension
    const matches = base64String.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
    
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid image format');
    }

    const extension = matches[1];
    const imageData = Buffer.from(matches[2], 'base64');

    // Create a unique filename
    const filename = `blog-${Date.now()}.${extension}`;
    const uploadPath = path.join(__dirname, '..', 'uploads', 'thumbnails', filename);

    // Save the file
    await fs.writeFile(uploadPath, imageData);

    // Return the relative path
    return `/uploads/thumbnails/${filename}`;
  } catch (error) {
    console.error('Error saving image:', error);
    throw new Error('Failed to save image');
  }
};

// @desc    Get all blogs
// @route   GET /api/blogs
// @access  Public
const getBlogs = asyncHandler(async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    
    // Transform thumbnail paths to full URLs
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const blogsWithUrls = blogs.map(blog => ({
      ...blog.toObject(),
      thumbnail: blog.thumbnail ? `${baseUrl}${blog.thumbnail}` : null
    }));
    
    res.json(blogsWithUrls);
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

    // Transform thumbnail path to full URL
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const blogWithUrl = {
      ...blog.toObject(),
      thumbnail: blog.thumbnail ? `${baseUrl}${blog.thumbnail}` : null
    };
    
    res.json(blogWithUrl);
  } catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).json({ message: 'Failed to fetch blog' });
  }
});

// @desc    Create blog
// @route   POST /api/blogs
// @access  Private/Admin
const createBlog = asyncHandler(async (req, res) => {
  try {
    const { title, content, thumbnail, author, slug, isActive } = req.body;

    // Handle base64 image
    let thumbnailPath = thumbnail;
    if (thumbnail && thumbnail.startsWith('data:image')) {
      thumbnailPath = await saveBase64Image(thumbnail);
    }

    const blog = await Blog.create({
      title,
      content,
      thumbnail: thumbnailPath,
      author,
      slug,
      isActive
    });

    // Transform thumbnail path to full URL
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const blogWithUrl = {
      ...blog.toObject(),
      thumbnail: blog.thumbnail ? `${baseUrl}${blog.thumbnail}` : null
    };

    res.status(201).json(blogWithUrl);
  } catch (error) {
    console.error('Error creating blog:', error);
    res.status(500).json({ message: error.message || 'Failed to create blog' });
  }
});

// @desc    Update blog
// @route   PUT /api/blogs/:id
// @access  Private/Admin
const updateBlog = asyncHandler(async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    const { thumbnail, title, content, author, slug, isActive } = req.body;
    
    // Handle base64 image if new image is uploaded
    let thumbnailPath = thumbnail;
    if (thumbnail && thumbnail.startsWith('data:image')) {
      thumbnailPath = await saveBase64Image(thumbnail);

      // Delete old thumbnail if it exists
      if (blog.thumbnail) {
        const oldPath = path.join(__dirname, '..', blog.thumbnail.replace(/^\//, ''));
        try {
          await fs.unlink(oldPath);
        } catch (err) {
          console.error('Error deleting old thumbnail:', err);
        }
      }
    }

    const updatedBlog = await Blog.findByIdAndUpdate(
      req.params.id,
      {
        title,
        content,
        thumbnail: thumbnailPath,
        author,
        slug,
        isActive
      },
      { new: true, runValidators: true }
    );

    // Transform thumbnail path to full URL
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const blogWithUrl = {
      ...updatedBlog.toObject(),
      thumbnail: updatedBlog.thumbnail ? `${baseUrl}${updatedBlog.thumbnail}` : null
    };

    res.json(blogWithUrl);
  } catch (error) {
    console.error('Error updating blog:', error);
    res.status(500).json({ message: error.message || 'Failed to update blog' });
  }
});

// @desc    Delete blog
// @route   DELETE /api/blogs/:id
// @access  Private/Admin
const deleteBlog = asyncHandler(async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    // Delete thumbnail if it exists
    if (blog.thumbnail) {
      const thumbnailPath = path.join(__dirname, '..', blog.thumbnail.replace(/^\//, ''));
      try {
        await fs.unlink(thumbnailPath);
      } catch (err) {
        console.error('Error deleting thumbnail:', err);
      }
    }

    await blog.deleteOne();
    res.json({ message: 'Blog removed' });
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