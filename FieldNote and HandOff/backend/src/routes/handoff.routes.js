const express = require('express');
const router = express.Router();
const { generateHandoff, getLatestHandoff } = require('../controllers/handoff.controller');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// @route   POST /api/handoff/generate
// @desc    Generate end-of-shift handoff from all session logs
// @access  Private
router.post('/generate', generateHandoff);

// @route   GET /api/handoff/:unit_id/latest
// @desc    Get the latest handoff document for a unit
// @access  Private
router.get('/:unit_id/latest', getLatestHandoff);

module.exports = router;
