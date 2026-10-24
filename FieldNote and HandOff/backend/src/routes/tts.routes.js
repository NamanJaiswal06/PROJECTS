const express = require('express');
const router = express.Router();
const { speak } = require('../controllers/tts.controller');
const { protect } = require('../middleware/authMiddleware');

// @route   POST /api/tts/speak
// @desc    Proxy text to Rime TTS — returns audio/mpeg bytes (key stays server-side)
// @access  Private
router.post('/speak', protect, speak);

module.exports = router;
