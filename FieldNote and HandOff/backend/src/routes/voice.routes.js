const express = require('express');
const router = express.Router();
const { parseTranscript, respond, recover, correct } = require('../controllers/voice.controller');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// @route   POST /api/voice/parse
// @desc    Parse raw speech transcript into a structured log entry (Prompt #2)
// @access  Private
router.post('/parse', parseTranscript);

// @route   POST /api/voice/respond
// @desc    Retrieve similar past cases + draft spoken response (Prompt #3)
// @access  Private
router.post('/respond', respond);

// @route   POST /api/voice/recover
// @desc    Answer new technician's question from handoff context (Prompt #5)
// @access  Private
router.post('/recover', recover);

// @route   POST /api/voice/correct
// @desc    Process spoken correction and update/delete the target log (Prompt #7)
// @access  Private
router.post('/correct', correct);

module.exports = router;
