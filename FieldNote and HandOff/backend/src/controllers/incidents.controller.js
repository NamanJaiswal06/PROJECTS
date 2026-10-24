const { v4: uuidv4 } = require('uuid');
const asyncHandler = require('../utils/asyncHandler');
const Incident  = require('../models/Incident');
const qdrantSvc = require('../services/qdrant.service');
const embedSvc  = require('../services/embedding.service');

// ─── POST /api/incidents ──────────────────────────────────────
/**
 * Called by the ML engineer's `recordObservation` tool.
 * 1. Validates & persists a field-log entry to MongoDB
 * 2. Embeds the structured text → upserts to Qdrant
 *
 * Body (Zod-validated on the ML side before hitting this route):
 * { unit_id, session_id, type, symptom, finding, action, status,
 *   priority, next_action, text, raw_transcript? }
 */
const createIncident = asyncHandler(async (req, res) => {
  const {
    unit_id, session_id, type = 'observation',
    symptom = '', finding = '', action = '', status = 'unresolved',
    priority = 'low', next_action = '', text, raw_transcript = '',
  } = req.body;

  if (!unit_id || !session_id || !text) {
    res.status(400);
    throw new Error('unit_id, session_id, and text are required');
  }

  // 1. Save to MongoDB
  const incident = await Incident.create({
    unit_id: unit_id.toUpperCase(),
    session_id,
    technician: req.user._id,
    type, symptom, finding, action, status, priority, next_action,
    text, raw_transcript,
  });

  // 2. Build embeddable text: "symptom. finding. action. status."
  const embeddableText = [symptom, finding, action, status]
    .filter(Boolean)
    .join('. ') || text;

  // 3. Embed + upsert to Qdrant
  const vector = await embedSvc.embed(embeddableText);
  const pointId = uuidv4();
  await qdrantSvc.upsertPoint(pointId, vector, {
    type,
    equipmentId: unit_id.toUpperCase(),
    equipmentType: 'compressor',        // extend via Equipment lookup if needed
    location: '',
    symptom, finding, action,
    status, priority,
    technicianId: req.user.username,
    timestamp: new Date().toISOString(),
    text: embeddableText,
    session_id,
    mongo_id: incident._id.toString(),
  });

  // 4. Back-fill the Qdrant point ID on the Mongo doc
  incident.qdrant_point_id = pointId;
  await incident.save();

  res.status(201).json({ success: true, incident, qdrant_point_id: pointId });
});

// ─── GET /api/incidents/:unit_id ─────────────────────────────
const getIncidentsByUnit = asyncHandler(async (req, res) => {
  const { unit_id } = req.params;
  const { status, limit = 50 } = req.query;

  const query = { unit_id: unit_id.toUpperCase() };
  if (status) query.status = status;

  const incidents = await Incident.find(query)
    .populate('technician', 'username role')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .lean();

  res.json({ success: true, count: incidents.length, incidents });
});

module.exports = { createIncident, getIncidentsByUnit };
