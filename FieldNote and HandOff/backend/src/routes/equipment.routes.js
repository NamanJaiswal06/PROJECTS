const express = require('express');
const router  = express.Router();
const { getAllEquipment, getEquipmentById, getEquipmentHistory } = require('../controllers/equipment.controller');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// GET /api/equipment              — all units (dashboard list)
router.get('/', getAllEquipment);

// GET /api/equipment/:id          — single unit (agent: getEquipment)
router.get('/:id', getEquipmentById);

// GET /api/equipment/:id/history  — incident history (agent: getEquipmentHistory)
router.get('/:id/history', getEquipmentHistory);

module.exports = router;
