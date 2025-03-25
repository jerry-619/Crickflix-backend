const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    console.log('Login attempt with:', {
      email: req.body.email,
      passwordLength: req.body?.password?.length
    });

    const user = await User.findOne({ email: req.body.email });
    console.log('User found:', user ? 'Yes' : 'No');

    if (!user) {
      console.log('Login failed: User not found');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      console.log('Login failed: User account is disabled');
      return res.status(401).json({ message: 'Your account has been disabled' });
    }

    const isMatch = await user.matchPassword(req.body.password);
    console.log('Password match:', isMatch);

    if (!isMatch) {
      console.log('Login failed: Password mismatch');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);
    console.log('Login successful, token generated');

    res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// @desc    Get current user
// @route   GET /api/auth/verify
// @access  Private
const verifyToken = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ message: 'Server error during token verification' });
  }
};

// @desc    Create initial admin user
// @route   POST /api/auth/setup-admin
// @access  Public (should be disabled after first use)
const setupAdmin = async (req, res) => {
  try {
    console.log('Setting up admin user...');
    console.log('Environment variables:', {
      username: process.env.ADMIN_USERNAME,
      email: process.env.ADMIN_EMAIL,
      passwordLength: process.env.ADMIN_PASSWORD?.length
    });

    const adminExists = await User.findOne({ role: 'admin' });
    console.log('Existing admin found:', adminExists ? 'Yes' : 'No');

    if (adminExists) {
      console.log('Admin setup skipped: Admin already exists');
      return res.status(400).json({ message: 'Admin user already exists' });
    }

    const admin = await User.create({
      username: process.env.ADMIN_USERNAME,
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      role: 'admin',
      isActive: true
    });

    console.log('Admin user created successfully:', {
      username: admin.username,
      email: admin.email,
      role: admin.role
    });

    res.status(201).json({ message: 'Admin user created successfully' });
  } catch (error) {
    console.error('Admin setup error:', error);
    res.status(500).json({ message: 'Server error during admin setup' });
  }
};

module.exports = {
  login,
  verifyToken,
  setupAdmin
}; 