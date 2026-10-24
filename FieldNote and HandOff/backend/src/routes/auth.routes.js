const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/auth.controller');
const { protect } = require('../middleware/authMiddleware');

// @route   POST /api/auth/register
// @desc    Register a new technician account
// @access  Public
router.post('/register', register);

// @route   POST /api/auth/login
// @desc    Authenticate and return JWT
// @access  Public
router.post('/login', login);

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', protect, getMe);

module.exports = router;
