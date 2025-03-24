const Match = require('../models/Match');
const Category = require('../models/Category');
const Blog = require('../models/Blog');

// @desc    Get admin dashboard statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
const getStats = async (req, res) => {
  try {
    // Get total matches count
    const totalMatches = await Match.countDocuments();
    
    // Get matches by status
    const upcomingMatches = await Match.countDocuments({ status: 'upcoming' });
    const liveMatches = await Match.countDocuments({ status: 'live' });
    const completedMatches = await Match.countDocuments({ status: 'completed' });
    
    // Get total categories
    const totalCategories = await Category.countDocuments();
    
    // Get total views across all matches
    const matchViewsResult = await Match.aggregate([
      {
        $group: {
          _id: null,
          totalViews: { $sum: '$views' }
        }
      }
    ]);
    const matchViews = matchViewsResult[0]?.totalViews || 0;

    // Get blog statistics
    const totalBlogs = await Blog.countDocuments();
    const activeBlogs = await Blog.countDocuments({ isActive: true });
    
    // Get total blog views
    const blogViewsResult = await Blog.aggregate([
      {
        $group: {
          _id: null,
          totalViews: { $sum: '$views' }
        }
      }
    ]);
    const blogViews = blogViewsResult[0]?.totalViews || 0;

    // Get top blogs by views
    const topBlogs = await Blog.find()
      .sort({ views: -1 })
      .limit(5)
      .select('title author views createdAt');

    // Get recent blogs
    const recentBlogs = await Blog.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title author views createdAt');

    // Get matches with most views
    const topMatches = await Match.find()
      .sort({ views: -1 })
      .limit(5)
      .select('title views status');

    // Get recent matches
    const recentMatches = await Match.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title status createdAt');

    // Get upcoming matches
    const nextMatches = await Match.find({ 
      status: 'upcoming',
      scheduledTime: { $exists: true }
    })
      .sort({ scheduledTime: 1 })
      .limit(5)
      .select('title scheduledTime');

    res.json({
      stats: {
        totalMatches,
        upcomingMatches,
        liveMatches,
        completedMatches,
        totalCategories,
        totalViews: matchViews,
        totalBlogs,
        activeBlogs,
        totalBlogViews: blogViews
      },
      topMatches,
      recentMatches,
      nextMatches,
      topBlogs,
      recentBlogs
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getStats
}; 