const express = require('express');
const router = express.Router();
const { createEntry, getLogsByUnit, updateEntry, deleteEntry } = require('../controllers/logs.controller');
const { protect } = require('../middleware/authMiddleware');

// All log routes require authentication
router.use(protect);

// @route   POST /api/logs/entry
// @desc    Store a structured log entry in Qdrant
// @access  Private
router.post('/entry', createEntry);

// @route   GET /api/logs/:unit_id
// @desc    Get all logs for a unit (with optional ?type= and ?resolved= filters)
// @access  Private
router.get('/:unit_id', getLogsByUnit);

// @route   PATCH /api/logs/:point_id
// @desc    Update (correct) a log entry in Qdrant
// @access  Private
router.patch('/:point_id', updateEntry);

// @route   DELETE /api/logs/:point_id
// @desc    Delete a log entry from Qdrant
// @access  Private
router.delete('/:point_id', deleteEntry);

module.exports = router;
