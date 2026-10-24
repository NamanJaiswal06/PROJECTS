const express = require('express');
const router  = express.Router();
const { createIncident, getIncidentsByUnit } = require('../controllers/incidents.controller');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// POST /api/incidents              — create field-log entry (agent: recordObservation)
router.post('/', createIncident);

// GET  /api/incidents/:unit_id     — get all incidents for a unit
router.get('/:unit_id', getIncidentsByUnit);

module.exports = router;
