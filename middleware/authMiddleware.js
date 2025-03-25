const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  try {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from token
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
          return res.status(401).json({
            message: 'User not found',
            code: 'USER_NOT_FOUND'
          });
        }

        req.user = user;
        next();
      } catch (error) {
        if (error.name === 'TokenExpiredError') {
          return res.status(401).json({
            message: 'Token expired',
            code: 'TOKEN_EXPIRED'
          });
        }
        return res.status(401).json({
          message: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      }
    } else {
      res.status(401).json({
        message: 'No token provided',
        code: 'NO_TOKEN'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      message: 'Server error during authentication',
      code: 'SERVER_ERROR'
    });
  }
};

const admin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  if (!req.user.isAdmin) {
    return res.status(401).json({
      message: 'Admin access required',
      code: 'ADMIN_REQUIRED'
    });
  }

  next();
};

module.exports = { protect, admin }; 