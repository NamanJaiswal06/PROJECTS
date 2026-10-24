const asyncHandler = require('../utils/asyncHandler');
const llmService = require('../services/llm.service');
const qdrantService = require('../services/qdrant.service');
const embeddingService = require('../services/embedding.service');

// ─── POST /api/voice/parse ────────────────────────────────────────────────────
/**
 * Prompt #2 — converts a raw speech transcript into a structured log entry.
 * Body: { unit_id, raw_transcript }
 */
const parseTranscript = asyncHandler(async (req, res) => {
  const { unit_id, raw_transcript } = req.body;

  if (!unit_id || !raw_transcript) {
    res.status(400);
    throw new Error('unit_id and raw_transcript are required');
  }

  const parsed = await llmService.parseTranscript({
    unit_id: unit_id.toUpperCase(),
    technician_name: req.user.username,
    raw_transcript,
  });

  res.json({ success: true, parsed });
});

// ─── POST /api/voice/respond ──────────────────────────────────────────────────
/**
 * Prompt #3 — retrieves semantically similar past cases for the unit,
 * then drafts a spoken 2-sentence response for Rime.
 * Body: { unit_id, current_observation }
 */
const respond = asyncHandler(async (req, res) => {
  const { unit_id, current_observation } = req.body;

  if (!unit_id || !current_observation) {
    res.status(400);
    throw new Error('unit_id and current_observation are required');
  }

  const startTime = Date.now();

  // 1. Embed the current observation
  const queryVector = await embeddingService.embed(current_observation);

  // 2. Search Qdrant — FILTER to this unit_id first (never leak other units)
  const retrieved = await qdrantService.searchSimilar(
    queryVector,
    { key: 'unit_id', match: { value: unit_id.toUpperCase() } },
    5
  );

  // 3. Fetch the latest handoff for this unit
  const handoffFilter = [
    { key: 'unit_id', match: { value: unit_id.toUpperCase() } },
    { key: 'type', match: { value: 'handoff' } },
  ];
  const handoffPoints = await qdrantService.filterPoints(handoffFilter, 1);
  const lastHandoff = handoffPoints[0]?.payload?.handoff_data || null;

  // 4. Run LLM ranking + response drafting prompt
  const response = await llmService.draftResponse({
    current_observation,
    retrieved_cases: retrieved.map((r) => ({ id: r.id, score: r.score, ...r.payload })),
    last_handoff: lastHandoff,
  });

  const latencyMs = Date.now() - startTime;

  res.json({
    success: true,
    ...response,
    // Latency breakdown for the on-screen overlay feature
    latency: {
      total_ms: latencyMs,
      qdrant_results: retrieved.length,
    },
  });
});

// ─── POST /api/voice/recover ──────────────────────────────────────────────────
/**
 * Prompt #5 — answers a free-text question from a new technician using
 * the stored handoff + recent logs as context.
 * Body: { unit_id, question_text, technician_name? }
 */
const recover = asyncHandler(async (req, res) => {
  const { unit_id, question_text, technician_name } = req.body;

  if (!unit_id || !question_text) {
    res.status(400);
    throw new Error('unit_id and question_text are required');
  }

  // Fetch latest handoff
  const handoffFilter = [
    { key: 'unit_id', match: { value: unit_id.toUpperCase() } },
    { key: 'type', match: { value: 'handoff' } },
  ];
  const handoffPoints = await qdrantService.filterPoints(handoffFilter, 1);
  const latestHandoff = handoffPoints[0]?.payload?.handoff_data || null;

  // Fetch recent logs (last 20)
  const logFilter = [{ key: 'unit_id', match: { value: unit_id.toUpperCase() } }];
  const recentLogs = await qdrantService.filterPoints(logFilter, 20);

  const answer = await llmService.recover({
    new_technician_name: technician_name || req.user.username,
    unit_id: unit_id.toUpperCase(),
    question_text,
    latest_handoff: latestHandoff,
    recent_logs: recentLogs.map((r) => r.payload),
  });

  res.json({ success: true, ...answer });
});

// ─── POST /api/voice/correct ──────────────────────────────────────────────────
/**
 * Prompt #7 — processes a spoken correction, identifies the target log entry,
 * and updates or deletes it in Qdrant.
 * Body: { unit_id, correction_transcript }
 */
const correct = asyncHandler(async (req, res) => {
  const { unit_id, correction_transcript } = req.body;

  if (!unit_id || !correction_transcript) {
    res.status(400);
    throw new Error('unit_id and correction_transcript are required');
  }

  // Fetch recent entries for this unit to give the LLM context
  const filters = [{ key: 'unit_id', match: { value: unit_id.toUpperCase() } }];
  const recentEntries = await qdrantService.filterPoints(filters, 10);

  // Run correction prompt
  const correction = await llmService.correct({
    correction_transcript,
    recent_entries: recentEntries.map((r) => ({ id: r.id, ...r.payload })),
  });

  // Apply the correction to Qdrant
  let result;
  if (correction.action === 'delete') {
    // Find the matching point by summary match (best-effort)
    const matchingPoint = recentEntries.find((r) =>
      r.payload.text.toLowerCase().includes(correction.target_entry_summary.toLowerCase())
    );
    if (matchingPoint) {
      await qdrantService.deletePoint(matchingPoint.id);
      result = { action: 'deleted', point_id: matchingPoint.id };
    } else {
      result = { action: 'not_found', message: 'Could not identify the target entry' };
    }
  } else if (correction.action === 'update') {
    const matchingPoint = recentEntries.find((r) =>
      r.payload.text.toLowerCase().includes(correction.target_entry_summary.toLowerCase())
    );
    if (matchingPoint) {
      const newVector = await embeddingService.embed(correction.corrected_text);
      await qdrantService.updatePoint(matchingPoint.id, newVector, { text: correction.corrected_text });
      result = { action: 'updated', point_id: matchingPoint.id, new_text: correction.corrected_text };
    } else {
      result = { action: 'not_found', message: 'Could not identify the target entry' };
    }
  }

  res.json({ success: true, correction, result });
});

module.exports = { parseTranscript, respond, recover, correct };
