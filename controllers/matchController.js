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
    console.log('File deleted from Cloudinary successfully:', publicId);
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
  }
};

// @desc    Get all matches
// @route   GET /api/matches
// @access  Public
const getMatches = async (req, res) => {
  try {
    const query = {};
    
    // Filter by category if provided
    if (req.query.category) {
      const category = await Category.findOne({ slug: req.query.category });
      if (category) {
        query.category = category._id;
      }
    }

    const matches = await Match.find(query)
      .sort({ createdAt: -1 })
      .populate('category');
    
    res.json(matches);
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single match
// @route   GET /api/matches/:id
// @access  Public
const getMatch = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate('category', 'name slug');

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    res.json(match);
  } catch (error) {
    console.error('Error fetching match:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create new match
// @route   POST /api/matches
// @access  Private/Admin
const createMatch = asyncHandler(async (req, res) => {
  try {
    // Verify category exists
    const category = await Category.findById(req.body.category);
    if (!category) {
      if (req.files) {
        await Promise.all(Object.values(req.files).flat().map(f => fs.unlink(f.path)));
      }
      return res.status(400).json({ message: 'Invalid category' });
    }

    // Parse streaming sources from the request body
    let streamingSources = [];
    try {
      streamingSources = JSON.parse(req.body.streamingSources || '[]');
    } catch (error) {
      console.error('Error parsing streaming sources:', error);
      if (req.files) {
        await Promise.all(Object.values(req.files).flat().map(f => fs.unlink(f.path)));
      }
      return res.status(400).json({ message: 'Invalid streaming sources format' });
    }

    // Validate streaming sources for live matches
    if (req.body.status === 'live') {
      // Check if either old or new streaming method is provided
      const hasOldStreaming = req.body.streamingUrl || req.body.iframeUrl;
      const hasNewStreaming = streamingSources && streamingSources.length > 0;

      if (!hasOldStreaming && !hasNewStreaming) {
        if (req.files) {
          await Promise.all(Object.values(req.files).flat().map(f => fs.unlink(f.path)));
        }
        return res.status(400).json({ message: 'At least one streaming source is required for live matches' });
      }
    }

    // Validate scheduledTime for upcoming matches
    if (req.body.status === 'upcoming' && !req.body.scheduledTime) {
      if (req.files) {
        await Promise.all(Object.values(req.files).flat().map(f => fs.unlink(f.path)));
      }
      return res.status(400).json({ message: 'Scheduled time is required for upcoming matches' });
    }

    const matchData = {
      ...req.body,
      streamingSources
    };
    
    // Convert scheduledTime string to Date object
    if (matchData.scheduledTime) {
      matchData.scheduledTime = new Date(matchData.scheduledTime);
    }
    
    // Handle file uploads
    if (req.files && req.files.thumbnail) {
      const uploadResult = await uploadToCloudinary(req.files.thumbnail[0]);
      matchData.thumbnail = uploadResult.url;
      matchData.thumbnailPublicId = uploadResult.public_id;
    }

    // Create match
    const match = await Match.create(matchData);
    const populatedMatch = await Match.findById(match._id).populate('category', 'name slug');
    
    // Emit socket event for new match
    req.app.get('io').emit('matchCreated', populatedMatch);
    
    res.status(201).json(populatedMatch);
  } catch (error) {
    console.error('Error creating match:', error);
    // Delete uploaded files if match creation fails
    if (req.files) {
      await Promise.all(Object.values(req.files).flat().map(f => fs.unlink(f.path)));
    }
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// @desc    Update match
// @route   PUT /api/matches/:id
// @access  Private/Admin
const updateMatch = asyncHandler(async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      if (req.files) {
        await Promise.all(Object.values(req.files).flat().map(f => fs.unlink(f.path)));
      }
      return res.status(404).json({ message: 'Match not found' });
    }

    // Verify category exists if being updated
    if (req.body.category) {
      const category = await Category.findById(req.body.category);
      if (!category) {
        if (req.files) {
          await Promise.all(Object.values(req.files).flat().map(f => fs.unlink(f.path)));
        }
        return res.status(400).json({ message: 'Invalid category' });
      }
    }

    // Parse streaming sources from the request body
    let streamingSources = match.streamingSources;
    if (req.body.streamingSources) {
      try {
        streamingSources = JSON.parse(req.body.streamingSources);
      } catch (error) {
        console.error('Error parsing streaming sources:', error);
        if (req.files) {
          await Promise.all(Object.values(req.files).flat().map(f => fs.unlink(f.path)));
        }
        return res.status(400).json({ message: 'Invalid streaming sources format' });
      }
    }

    // Validate streaming sources for live matches
    if (req.body.status === 'live') {
      // Check if either old or new streaming method is provided
      const hasOldStreaming = req.body.streamingUrl || req.body.iframeUrl || match.streamingUrl || match.iframeUrl;
      const hasNewStreaming = streamingSources && streamingSources.length > 0;

      if (!hasOldStreaming && !hasNewStreaming) {
        if (req.files) {
          await Promise.all(Object.values(req.files).flat().map(f => fs.unlink(f.path)));
        }
        return res.status(400).json({ message: 'At least one streaming source is required for live matches' });
      }
    }

    // Validate scheduledTime for upcoming matches
    if (req.body.status === 'upcoming' && !req.body.scheduledTime) {
      if (req.files) {
        await Promise.all(Object.values(req.files).flat().map(f => fs.unlink(f.path)));
      }
      return res.status(400).json({ message: 'Scheduled time is required for upcoming matches' });
    }

    const matchData = {
      ...req.body,
      streamingSources
    };

    // Convert scheduledTime string to Date object
    if (matchData.scheduledTime) {
      matchData.scheduledTime = new Date(matchData.scheduledTime);
    }

    // Handle file uploads
    if (req.files && req.files.thumbnail) {
      // Delete old thumbnail from Cloudinary if it exists
      if (match.thumbnailPublicId) {
        await deleteFromCloudinary(match.thumbnailPublicId);
      }
      
      // Upload new thumbnail to Cloudinary
      const uploadResult = await uploadToCloudinary(req.files.thumbnail[0]);
      matchData.thumbnail = uploadResult.url;
      matchData.thumbnailPublicId = uploadResult.public_id;
    }

    const updatedMatch = await Match.findByIdAndUpdate(
      req.params.id,
      matchData,
      { new: true, runValidators: true }
    ).populate('category', 'name slug');

    if (!updatedMatch) {
      res.status(404);
      throw new Error('Match not found');
    }

    // Emit socket event for match update
    req.app.get('io').emit('matchUpdated', updatedMatch);

    res.json(updatedMatch);
  } catch (error) {
    console.error('Error updating match:', error);
    // Delete uploaded files if update fails
    if (req.files) {
      await Promise.all(Object.values(req.files).flat().map(f => fs.unlink(f.path)));
    }
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// @desc    Delete match
// @route   DELETE /api/matches/:id
// @access  Private/Admin
const deleteMatch = asyncHandler(async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      res.status(404);
      throw new Error('Match not found');
    }

    // Delete thumbnail from Cloudinary if exists
    if (match.thumbnailPublicId) {
      await deleteFromCloudinary(match.thumbnailPublicId);
    }

    await match.deleteOne();
    
    // Emit socket event for match deletion
    req.app.get('io').emit('matchDeleted', req.params.id);

    res.json({ message: 'Match removed', id: req.params.id });
  } catch (error) {
    console.error('Error deleting match:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
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
// @route   PUT /api/matches/:id/increment-views
// @access  Public
const incrementViews = async (req, res) => {
  try {
    const match = await Match.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    res.json({ views: match.views });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getMatches,
  getMatch,
  createMatch,
  updateMatch,
  deleteMatch,
  toggleLiveStatus,
  incrementViews
}; 