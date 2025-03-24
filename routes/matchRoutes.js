const express = require('express');
const router = express.Router();
const {
  getMatches,
  getMatch,
  createMatch,
  updateMatch,
  deleteMatch,
  toggleLiveStatus,
  incrementViews
} = require('../controllers/matchController');
const { protect, admin } = require('../middleware/authMiddleware');
const { upload, handleUploadError } = require('../middleware/uploadMiddleware');

// Configure multiple file uploads
const uploadFields = [
  { name: 'thumbnail', maxCount: 1 },
  { name: 'logo', maxCount: 2 } // Allow up to 2 team logos
];

// Public routes
router.get('/', getMatches);
router.get('/:id', getMatch);
router.post('/:id/view', incrementViews);

// Protected routes
router.post('/',
  protect,
  admin,
  upload.fields(uploadFields),
  handleUploadError,
  createMatch
);

router.put('/:id',
  protect,
  admin,
  upload.fields(uploadFields),
  handleUploadError,
  updateMatch
);

router.delete('/:id', protect, admin, deleteMatch);
router.put('/:id/toggle-live', protect, admin, toggleLiveStatus);

module.exports = router; 