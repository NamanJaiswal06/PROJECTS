const { v4: uuidv4 } = require('uuid');
const asyncHandler = require('../utils/asyncHandler');
const qdrantService = require('../services/qdrant.service');
const embeddingService = require('../services/embedding.service');
const Session = require('../models/Session');

// ─── POST /api/logs/entry ─────────────────────────────────────────────────────
/**
 * Stores a structured log entry into Qdrant.
 * Expects the entry to already be parsed (by /api/voice/parse) or sent directly.
 *
 * Body: { unit_id, session_id, type, text, resolved, risk }
 */
const createEntry = asyncHandler(async (req, res) => {
  const { unit_id, session_id, type, text, resolved = false, risk = 'low' } = req.body;

  if (!unit_id || !type || !text) {
    res.status(400);
    throw new Error('unit_id, type, and text are required');
  }

  const VALID_TYPES = ['observation', 'action', 'unresolved', 'handoff'];
  if (!VALID_TYPES.includes(type)) {
    res.status(400);
    throw new Error(`type must be one of: ${VALID_TYPES.join(', ')}`);
  }

  // 1. Generate embedding vector from the log text
  const vector = await embeddingService.embed(text);

  // 2. Build Qdrant payload
  const pointId = uuidv4();
  const payload = {
    unit_id: unit_id.toUpperCase(),
    session_id: session_id || null,
    technician: req.user.username,
    timestamp: new Date().toISOString(),
    type,
    text,
    resolved,
    risk,
  };

  // 3. Upsert to Qdrant
  await qdrantService.upsertPoint(pointId, vector, payload);

  // 4. Bump session log_count if session exists
  if (session_id) {
    await Session.findOneAndUpdate(
      { session_id },
      { $inc: { log_count: 1 }, risk_level: risk }
    );
  }

  res.status(201).json({ success: true, point_id: pointId, payload });
});

// ─── GET /api/logs/:unit_id ───────────────────────────────────────────────────
/**
 * Retrieves all log entries for a specific unit.
 * Optionally filter by ?type=observation&resolved=false
 */
const getLogsByUnit = asyncHandler(async (req, res) => {
  const { unit_id } = req.params;
  const { type, resolved, limit = 50 } = req.query;

  const filters = [{ key: 'unit_id', match: { value: unit_id.toUpperCase() } }];
  if (type) filters.push({ key: 'type', match: { value: type } });
  if (resolved !== undefined) {
    filters.push({ key: 'resolved', match: { value: resolved === 'true' } });
  }

  const points = await qdrantService.filterPoints(filters, parseInt(limit));

  res.json({
    success: true,
    count: points.length,
    unit_id: unit_id.toUpperCase(),
    logs: points,
  });
});

// ─── PATCH /api/logs/:point_id ────────────────────────────────────────────────
/**
 * Updates payload fields on an existing Qdrant point (correction flow).
 * Body: { text?, resolved?, risk?, type? }
 */
const updateEntry = asyncHandler(async (req, res) => {
  const { point_id } = req.params;
  const allowedFields = ['text', 'resolved', 'risk', 'type'];
  const updates = {};

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  if (Object.keys(updates).length === 0) {
    res.status(400);
    throw new Error('No valid fields to update');
  }

  // If text changed, re-embed and update the vector too
  if (updates.text) {
    const newVector = await embeddingService.embed(updates.text);
    await qdrantService.updatePoint(point_id, newVector, updates);
  } else {
    await qdrantService.setPayload(point_id, updates);
  }

  res.json({ success: true, point_id, updates });
});

// ─── DELETE /api/logs/:point_id ───────────────────────────────────────────────
const deleteEntry = asyncHandler(async (req, res) => {
  const { point_id } = req.params;
  await qdrantService.deletePoint(point_id);
  res.json({ success: true, message: `Log entry ${point_id} deleted` });
});

module.exports = { createEntry, getLogsByUnit, updateEntry, deleteEntry };
