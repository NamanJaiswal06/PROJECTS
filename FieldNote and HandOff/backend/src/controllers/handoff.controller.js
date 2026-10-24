const { v4: uuidv4 } = require('uuid');
const asyncHandler = require('../utils/asyncHandler');
const llmService = require('../services/llm.service');
const qdrantService = require('../services/qdrant.service');
const embeddingService = require('../services/embedding.service');
const Session = require('../models/Session');

// ─── POST /api/handoff/generate ───────────────────────────────────────────────
/**
 * Pulls all session logs from Qdrant, runs them through the handoff LLM prompt,
 * stores the result as a 'handoff' type point, and closes the session.
 *
 * Body: { unit_id, session_id }
 */
const generateHandoff = asyncHandler(async (req, res) => {
  const { unit_id, session_id } = req.body;

  if (!unit_id || !session_id) {
    res.status(400);
    throw new Error('unit_id and session_id are required');
  }

  // 1. Fetch all logs for this session from Qdrant
  const filters = [
    { key: 'unit_id', match: { value: unit_id.toUpperCase() } },
    { key: 'session_id', match: { value: session_id } },
  ];
  const sessionLogs = await qdrantService.filterPoints(filters, 200);

  if (sessionLogs.length === 0) {
    res.status(404);
    throw new Error('No logs found for this session');
  }

  // 2. Generate structured handoff via LLM (Prompt #4)
  const handoff = await llmService.generateHandoff({
    unit_id: unit_id.toUpperCase(),
    session_id,
    technician_name: req.user.username,
    all_session_logs: sessionLogs,
  });

  // 3. Store the handoff as a vector point so it's searchable
  const handoffText = `${handoff.summary} ${handoff.unresolved?.join(' ')} ${handoff.next_steps?.join(' ')}`;
  const vector = await embeddingService.embed(handoffText);
  const pointId = uuidv4();
  const payload = {
    unit_id: unit_id.toUpperCase(),
    session_id,
    technician: req.user.username,
    timestamp: new Date().toISOString(),
    type: 'handoff',
    text: handoff.summary,
    resolved: false,
    risk: handoff.risk_level || 'low',
    handoff_data: handoff, // full structured handoff stored in payload
  };
  await qdrantService.upsertPoint(pointId, vector, payload);

  // 4. Close the session in MongoDB
  await Session.findOneAndUpdate(
    { session_id },
    { status: 'completed', ended_at: new Date(), handoff_point_id: pointId }
  );

  res.status(201).json({ success: true, handoff, point_id: pointId });
});

// ─── GET /api/handoff/:unit_id/latest ─────────────────────────────────────────
/**
 * Returns the most recent handoff document for a unit from Qdrant.
 */
const getLatestHandoff = asyncHandler(async (req, res) => {
  const { unit_id } = req.params;

  const filters = [
    { key: 'unit_id', match: { value: unit_id.toUpperCase() } },
    { key: 'type', match: { value: 'handoff' } },
  ];
  const points = await qdrantService.filterPoints(filters, 50);

  if (points.length === 0) {
    return res.json({ success: true, handoff: null, message: 'No handoff found for this unit' });
  }

  // Sort by timestamp descending and return the latest
  const latest = points.sort(
    (a, b) => new Date(b.payload.timestamp) - new Date(a.payload.timestamp)
  )[0];

  res.json({ success: true, handoff: latest.payload.handoff_data, point_id: latest.id });
});

module.exports = { generateHandoff, getLatestHandoff };
