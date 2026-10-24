const express = require('express');
const router  = express.Router();
const { searchMemory } = require('../controllers/memory.controller');
const { protect } = require('../middleware/authMiddleware');

// POST /api/memory/search — semantic search (agent: findSimilarCases)
router.post('/search', protect, searchMemory);

module.exports = router;
