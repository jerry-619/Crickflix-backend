const Match = require('../models/Match');
const Category = require('../models/Category');
const cloudinary = require('../config/cloudinary');
const asyncHandler = require('express-async-handler');
const moment = require('moment-timezone');
const fs = require('fs').promises;

// Helper function to upload file to Cloudinary
const uploadToCloudinary = async (file, folder = 'thumbnails') => {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: `crickflix/${folder}`,
      resource_type: 'auto'
    });
    
    // Delete local file after upload
    await fs.unlink(file.path);
    
    return {
      url: result.secure_url,
      public_id: result.public_id
    };
  } catch (error) {
    console.error('Cloudinary upload failed:', error);
    throw new Error('Image upload failed');
  }
};

// Helper function to delete file from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return;
    await cloudinary.uploader.destroy(publicId);
    console.log('Cloudinary: File deleted successfully');
  } catch (error) {
    console.error('Cloudinary: Delete operation failed:', error);
  }
};

// @desc    Get all matches
// @route   GET /api/matches
// @access  Public
const getMatches = asyncHandler(async (req, res) => {
  const { category, status } = req.query;
  const filter = {};
  
  if (category) {
    // Find category by slug first
    const categoryDoc = await Category.findOne({ slug: category });
    if (!categoryDoc) {
      return res.status(404).json({ message: 'Category not found' });
    }
    filter.category = categoryDoc._id;
  }
  
  if (status) {
    filter.status = status;
  }
  
  const matches = await Match.find(filter)
    .populate('category', 'name slug')
    .sort({ createdAt: -1 });

  // Extract teams for any matches that need it
  for (const match of matches) {
    if (!match.team1 || !match.team2 || match.team1 === '' || match.team2 === '') {
      match.markModified('title');
      await match.save();
    }
  }
  
  res.json(matches);
});

// @desc    Get single match
// @route   GET /api/matches/:id
// @access  Public
const getMatch = asyncHandler(async (req, res) => {
  const match = await Match.findById(req.params.id).populate('category', 'name');
  
  if (!match) {
    res.status(404);
    throw new Error('Match not found');
  }

  // Extract teams if needed
  if (!match.team1 || !match.team2 || match.team1 === '' || match.team2 === '') {
    match.markModified('title');
    await match.save();
  }

  res.json(match);
});

// @desc    Create a new match
// @route   POST /api/matches
// @access  Private/Admin
const createMatch = async (req, res) => {
  try {
    const { title, description, team1, team2, startTime, category } = req.body;

    // Upload thumbnail to Cloudinary if provided
    let thumbnailData = null;
    if (req.files?.thumbnail?.[0]) {
      thumbnailData = await uploadToCloudinary(req.files.thumbnail[0], 'thumbnails');
    }

    // Upload team logos to Cloudinary if provided
    const logoData = [];
    if (req.files?.logo) {
      for (const logo of req.files.logo) {
        const data = await uploadToCloudinary(logo, 'logos');
        logoData.push(data);
      }
    }

    const match = await Match.create({
      title,
      description,
      thumbnail: thumbnailData?.url || '',
      thumbnailPublicId: thumbnailData?.public_id || '',
      team1: {
        name: team1,
        logo: logoData[0]?.url || '',
        logoPublicId: logoData[0]?.public_id || ''
      },
      team2: {
        name: team2,
        logo: logoData[1]?.url || '',
        logoPublicId: logoData[1]?.public_id || ''
      },
      startTime,
      category
    });

    res.status(201).json(match);
  } catch (error) {
    console.error('Error creating match:', error);
    res.status(500).json({ message: 'Failed to create match', error: error.message });
  }
};

// @desc    Update a match
// @route   PUT /api/matches/:id
// @access  Private/Admin
const updateMatch = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const { title, description, team1, team2, startTime, category } = req.body;

    // Upload new thumbnail if provided
    let thumbnailData = null;
    if (req.files?.thumbnail?.[0]) {
      // Delete old thumbnail if exists
      if (match.thumbnailPublicId) {
        await deleteFromCloudinary(match.thumbnailPublicId);
      }
      thumbnailData = await uploadToCloudinary(req.files.thumbnail[0], 'thumbnails');
    }

    // Upload new team logos if provided
    const logoData = [];
    if (req.files?.logo) {
      // Delete old logos if they exist
      if (match.team1.logoPublicId) {
        await deleteFromCloudinary(match.team1.logoPublicId);
      }
      if (match.team2.logoPublicId) {
        await deleteFromCloudinary(match.team2.logoPublicId);
      }
      
      for (const logo of req.files.logo) {
        const data = await uploadToCloudinary(logo, 'logos');
        logoData.push(data);
      }
    }

    match.title = title || match.title;
    match.description = description || match.description;
    match.thumbnail = thumbnailData?.url || match.thumbnail;
    match.thumbnailPublicId = thumbnailData?.public_id || match.thumbnailPublicId;
    match.team1 = {
      name: team1 || match.team1.name,
      logo: logoData[0]?.url || match.team1.logo,
      logoPublicId: logoData[0]?.public_id || match.team1.logoPublicId
    };
    match.team2 = {
      name: team2 || match.team2.name,
      logo: logoData[1]?.url || match.team2.logo,
      logoPublicId: logoData[1]?.public_id || match.team2.logoPublicId
    };
    match.startTime = startTime || match.startTime;
    match.category = category || match.category;

    const updatedMatch = await match.save();
    res.json(updatedMatch);
  } catch (error) {
    console.error('Error updating match:', error);
    res.status(500).json({ message: 'Failed to update match', error: error.message });
  }
};

// @desc    Delete match
// @route   DELETE /api/matches/:id
// @access  Private/Admin
const deleteMatch = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    // Delete all associated images from Cloudinary
    if (match.thumbnailPublicId) {
      await deleteFromCloudinary(match.thumbnailPublicId);
    }
    if (match.team1.logoPublicId) {
      await deleteFromCloudinary(match.team1.logoPublicId);
    }
    if (match.team2.logoPublicId) {
      await deleteFromCloudinary(match.team2.logoPublicId);
    }

    await match.deleteOne();

    // Emit socket event for deleted match if Socket.IO is available
    if (req.io) {
      req.io.emit('matchDeleted', req.params.id);
    }

    res.json({ message: 'Match removed' });
  } catch (error) {
    console.error('Error deleting match:', error);
    res.status(500).json({ message: 'Failed to delete match', error: error.message });
  }
};

// @desc    Toggle match live status
// @route   PUT /api/matches/:id/toggle-live
// @access  Private/Admin
const toggleLiveStatus = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    match.isLive = !match.isLive;
    await match.save();

    res.json(match);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Increment match views
// @route   POST /api/matches/:id/view
// @access  Public
const incrementViews = asyncHandler(async (req, res) => {
  const match = await Match.findByIdAndUpdate(
    req.params.id,
    { $inc: { views: 1 } },
    { new: true }
  );

  if (!match) {
    res.status(404);
    throw new Error('Match not found');
  }

  res.json({ views: match.views });
});

module.exports = {
  getMatches,
  getMatch,
  createMatch,
  updateMatch,
  deleteMatch,
  toggleLiveStatus,
  incrementViews
}; 