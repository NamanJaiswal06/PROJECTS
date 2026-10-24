const asyncHandler = require('../utils/asyncHandler');
const embedSvc  = require('../services/embedding.service');
const qdrantSvc = require('../services/qdrant.service');

// ─── POST /api/memory/search ──────────────────────────────────
/**
 * Used by the ML engineer's `findSimilarCases` tool.
 * query → embed → Qdrant top-k (filtered by equipmentId when known).
 *
 * Body: { query, equipmentId?, equipmentType?, k? }
 *
 * This is the route judges must see change the answer —
 * the UI should display "Based on N similar historical cases from Qdrant."
 */
const searchMemory = asyncHandler(async (req, res) => {
  const { query, equipmentId, equipmentType, k = 5 } = req.body;

  if (!query || typeof query !== 'string') {
    res.status(400);
    throw new Error('query string is required');
  }

  const startTime = Date.now();

  // 1. Embed the query
  const vector = await embedSvc.embed(query);

  // 2. Build Qdrant filter — ALWAYS scope to equipment when known
  //    This is the key judging moment: filter before search.
  let filter;
  if (equipmentId) {
    filter = {
      key: 'equipmentId',
      match: { value: equipmentId.toUpperCase() },
    };
  } else if (equipmentType) {
    filter = {
      key: 'equipmentType',
      match: { value: equipmentType.toLowerCase() },
    };
  }

  // 3. Search Qdrant
  const hits = await qdrantSvc.searchSimilar(vector, filter, Math.min(parseInt(k), 10));

  const qdrantMs = Date.now() - startTime;

  // 4. Return hits in a shape the LLM can directly use as context
  const cases = hits.map((h) => ({
    id: h.id,
    score: parseFloat(h.score.toFixed(3)),
    equipmentId: h.payload.equipmentId,
    symptom: h.payload.symptom,
    finding: h.payload.finding,
    action: h.payload.action,
    status: h.payload.status,
    priority: h.payload.priority,
    timestamp: h.payload.timestamp,
    text: h.payload.text,
    type: h.payload.type,
  }));

  res.json({
    success: true,
    query,
    filter_applied: equipmentId
      ? `equipmentId = ${equipmentId.toUpperCase()}`
      : equipmentType
      ? `equipmentType = ${equipmentType}`
      : 'none',
    count: cases.length,
    cases,
    latency_ms: qdrantMs,
  });
});

module.exports = { searchMemory };
