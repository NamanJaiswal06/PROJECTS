const asyncHandler = require('../utils/asyncHandler');
const Equipment = require('../models/Equipment');
const Incident  = require('../models/Incident');

// ─── GET /api/equipment ───────────────────────────────────────
// Returns all equipment (for dashboard list)
const getAllEquipment = asyncHandler(async (req, res) => {
  const equipment = await Equipment.find().sort({ equipment_id: 1 }).lean();
  res.json({ success: true, count: equipment.length, equipment });
});

// ─── GET /api/equipment/:id ───────────────────────────────────
// Returns one unit by equipment_id (e.g. "UNIT-27")
// Used by agent tool: getEquipment({ equipmentId })
const getEquipmentById = asyncHandler(async (req, res) => {
  const unit = await Equipment.findOne({
    equipment_id: req.params.id.toUpperCase(),
  }).lean();

  if (!unit) {
    res.status(404);
    throw new Error(`Equipment ${req.params.id.toUpperCase()} not found`);
  }

  res.json({ success: true, equipment: unit });
});

// ─── GET /api/equipment/:id/history ──────────────────────────
// Returns incident history for a unit (MongoDB — not Qdrant)
// Used by agent tool: getEquipmentHistory({ equipmentId, limit })
const getEquipmentHistory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const status = req.query.status; // optional filter

  const query = { unit_id: id.toUpperCase() };
  if (status) query.status = status;

  const incidents = await Incident.find(query)
    .populate('technician', 'username role')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  res.json({
    success: true,
    unit_id: id.toUpperCase(),
    count: incidents.length,
    incidents,
  });
});

module.exports = { getAllEquipment, getEquipmentById, getEquipmentHistory };
