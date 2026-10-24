const { v4: uuidv4 } = require('uuid');
const asyncHandler = require('../utils/asyncHandler');
const HandoffModel = require('../models/Handoff');
const Incident     = require('../models/Incident');
const qdrantSvc    = require('../services/qdrant.service');
const embedSvc     = require('../services/embedding.service');

// ─── POST /api/handoffs ───────────────────────────────────────
/**
 * Called by the ML engineer's `createHandoff` tool.
 * 1. Validates & persists the handoff summary to MongoDB
 * 2. Embeds summary + unresolved issues → upserts to Qdrant
 *    (this is what powers the next technician's recovery query)
 *
 * Body: { unit_id, session_id, shift?, summary, checked[], found[],
 *         fixed[], unresolved[], next_steps[], similar_cases?, risk_level? }
 */
const createHandoff = asyncHandler(async (req, res) => {
  const {
    unit_id, session_id, shift = 'custom',
    summary, checked = [], found = [], fixed = [],
    unresolved = [], next_steps = [], similar_cases = [],
    risk_level = 'low',
  } = req.body;

  if (!unit_id || !session_id || !summary) {
    res.status(400);
    throw new Error('unit_id, session_id, and summary are required');
  }

  // 1. Save to MongoDB
  const handoff = await HandoffModel.create({
    unit_id: unit_id.toUpperCase(),
    session_id,
    technician: req.user._id,
    shift, summary, checked, found, fixed,
    unresolved, next_steps, similar_cases, risk_level,
  });

  // 2. Build embeddable text: summary + unresolved + next_steps
  const embeddableText = [
    summary,
    unresolved.length ? `Unresolved: ${unresolved.join(', ')}` : '',
    next_steps.length ? `Next: ${next_steps.join(', ')}` : '',
  ].filter(Boolean).join('. ');

  // 3. Embed + upsert to Qdrant
  const vector = await embedSvc.embed(embeddableText);
  const pointId = uuidv4();
  await qdrantSvc.upsertPoint(pointId, vector, {
    type: 'handoff',
    equipmentId: unit_id.toUpperCase(),
    equipmentType: 'compressor',
    location: '',
    symptom: '',
    finding: summary,
    action: next_steps.join('; '),
    status: unresolved.length > 0 ? 'unresolved' : 'resolved',
    priority: risk_level,
    technicianId: req.user.username,
    timestamp: new Date().toISOString(),
    text: embeddableText,
    session_id,
    mongo_id: handoff._id.toString(),
    // Full structured data attached for recovery queries
    handoff_data: { summary, checked, found, fixed, unresolved, next_steps, similar_cases, risk_level },
  });

  // 4. Back-fill Qdrant point ID
  handoff.qdrant_point_id = pointId;
  await handoff.save();

  res.status(201).json({ success: true, handoff, qdrant_point_id: pointId });
});

// ─── GET /api/handoffs/:unit_id ───────────────────────────────
/**
 * Called by the ML engineer's `getHandoff` tool.
 * Returns the most recent handoff for a unit from MongoDB.
 */
const getHandoff = asyncHandler(async (req, res) => {
  const { unit_id } = req.params;
  const { shift } = req.query;

  const query = { unit_id: unit_id.toUpperCase() };
  if (shift) query.shift = shift;

  const handoff = await HandoffModel.findOne(query)
    .populate('technician', 'username role')
    .sort({ generated_at: -1 })
    .lean();

  if (!handoff) {
    return res.json({
      success: true,
      handoff: null,
      message: `No handoff found for ${unit_id.toUpperCase()}`,
    });
  }

  res.json({ success: true, handoff });
});

// ─── GET /api/handoffs/:unit_id/all ──────────────────────────
const getAllHandoffs = asyncHandler(async (req, res) => {
  const { unit_id } = req.params;
  const handoffs = await HandoffModel.find({ unit_id: unit_id.toUpperCase() })
    .populate('technician', 'username role')
    .sort({ generated_at: -1 })
    .limit(10)
    .lean();

  res.json({ success: true, count: handoffs.length, handoffs });
});

module.exports = { createHandoff, getHandoff, getAllHandoffs };
