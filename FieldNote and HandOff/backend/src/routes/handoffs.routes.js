const express = require('express');
const router  = express.Router();
const { createHandoff, getHandoff, getAllHandoffs } = require('../controllers/handoffs.controller');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// POST /api/handoffs                — create handoff (agent: createHandoff)
router.post('/', createHandoff);

// GET  /api/handoffs/:unit_id       — latest handoff (agent: getHandoff)
router.get('/:unit_id', getHandoff);

// GET  /api/handoffs/:unit_id/all   — all handoffs for a unit
router.get('/:unit_id/all', getAllHandoffs);

module.exports = router;
