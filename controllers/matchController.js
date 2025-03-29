const Match = require('../models/Match');
const Category = require('../models/Category');
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
    console.log('Cloudinary: File deleted successfully');
  } catch (error) {
    console.error('Cloudinary: Delete operation failed');
  }
};

// @desc    Get all matches
// @route   GET /api/matches
// @access  Public
const getMatches = asyncHandler(async (req, res) => {
  const { category, status } = req.query;
  const filter = {};
  
  if (category) {
    filter.category = category;
  }
  
  if (status) {
    filter.status = status;
  }
  
  const matches = await Match.find(filter)
    .populate('category', 'name')
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

// @desc    Create new match
// @route   POST /api/matches
// @access  Private/Admin
const createMatch = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    streamingUrl,
    iframeUrl,
    streamType,
    streamingSources,
    category,
    isLive,
    status,
    scheduledTime
  } = req.body;

  // Validate category exists
  const categoryExists = await Category.findById(category);
  if (!category || !categoryExists) {
    res.status(400);
    throw new Error('Invalid category');
  }

  // Validate streaming sources
  if (streamingSources) {
    for (const source of streamingSources) {
      if (!source.name || !source.url) {
        res.status(400);
        throw new Error('Streaming sources must have name and url');
      }
    }
  }

  // Validate scheduled time for upcoming matches
  if (status === 'upcoming' && !scheduledTime) {
    res.status(400);
    throw new Error('Scheduled time is required for upcoming matches');
  }

  let thumbnailData = null;
  if (req.file) {
    thumbnailData = await uploadToCloudinary(req.file.path);
  }

  const match = await Match.create({
    title,
    description,
    thumbnail: thumbnailData?.url,
    thumbnailPublicId: thumbnailData?.public_id,
    streamingUrl,
    iframeUrl,
    streamType,
    streamingSources,
    category,
    isLive,
    status,
    scheduledTime: status === 'upcoming' ? new Date(scheduledTime) : undefined
  });

  // Teams will be automatically extracted in the pre-save middleware

  // Emit socket event for new match
  req.io.emit('matchCreated', match);

  res.status(201).json(match);
});

// @desc    Update match
// @route   PUT /api/matches/:id
// @access  Private/Admin
const updateMatch = asyncHandler(async (req, res) => {
  const match = await Match.findById(req.params.id);

  if (!match) {
    res.status(404);
    throw new Error('Match not found');
  }

  const {
    title,
    description,
    streamingUrl,
    iframeUrl,
    streamType,
    streamingSources,
    category,
    isLive,
    status,
    scheduledTime
  } = req.body;

  // Validate category if provided
  if (category) {
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      res.status(400);
      throw new Error('Invalid category');
    }
  }

  // Validate streaming sources if provided and not completing match
  if (streamingSources && status !== 'completed') {
    for (const source of streamingSources) {
      if (!source.name || !source.url) {
        res.status(400);
        throw new Error('Streaming sources must have name and url');
      }
    }
  }

  // Handle thumbnail upload if provided
  let thumbnailData = null;
  if (req.file) {
    // Delete old thumbnail if exists
    if (match.thumbnailPublicId) {
      await deleteFromCloudinary(match.thumbnailPublicId);
    }
    thumbnailData = await uploadToCloudinary(req.file.path);
  }

  // If match is being completed, keep existing streaming sources
  const updatedStreamingSources = status === 'completed' ? match.streamingSources : streamingSources;

  const updatedMatch = await Match.findByIdAndUpdate(
    req.params.id,
    {
      title,
      description,
      ...(thumbnailData && {
        thumbnail: thumbnailData.url,
        thumbnailPublicId: thumbnailData.public_id
      }),
      streamingUrl,
      iframeUrl,
      streamType,
      streamingSources: updatedStreamingSources,
      category,
      isLive,
      status,
      ...(status === 'upcoming' && scheduledTime && {
        scheduledTime: new Date(scheduledTime)
      })
    },
    { new: true }
  );

  // Teams will be automatically extracted in the pre-update middleware

  // Emit socket event for updated match
  req.io.emit('matchUpdated', updatedMatch);

  res.json(updatedMatch);
});

// @desc    Delete match
// @route   DELETE /api/matches/:id
// @access  Private/Admin
const deleteMatch = asyncHandler(async (req, res) => {
  const match = await Match.findById(req.params.id);

  if (!match) {
    res.status(404);
    throw new Error('Match not found');
  }

  // Delete thumbnail from cloudinary if exists
  if (match.thumbnailPublicId) {
    await deleteFromCloudinary(match.thumbnailPublicId);
  }

  await match.deleteOne();

  // Emit socket event for deleted match
  req.io.emit('matchDeleted', req.params.id);

  res.json({ message: 'Match removed' });
});

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