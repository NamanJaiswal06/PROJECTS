const { qdrant, COLLECTION } = require('../config/db');

/**
 * Upserts a single vector point into the unit_logs collection.
 * @param {string} id - UUID string for this point
 * @param {number[]} vector - embedding vector (size 1536)
 * @param {object} payload - structured log entry fields
 */
const upsertPoint = async (id, vector, payload) => {
  await qdrant.upsert(COLLECTION, {
    wait: true,
    points: [{ id, vector, payload }],
  });
};

/**
 * Semantic similarity search — ALWAYS scoped to a unit filter.
 * This ensures UNIT-27 results never bleed into a UNIT-14 query.
 *
 * @param {number[]} vector - query embedding
 * @param {object} unitFilter - { key: 'unit_id', match: { value: 'UNIT-27' } }
 * @param {number} topK - number of results
 */
const searchSimilar = async (vector, unitFilter, topK = 5) => {
  const queryParams = {
    query: vector,      // ← .query() uses `query`, not `vector`
    limit: topK,
    with_payload: true,
  };
  if (unitFilter) {
    queryParams.filter = { must: [unitFilter] };
  }
  // .query() returns { points: [...] }
  const result = await qdrant.query(COLLECTION, queryParams);
  return result.points || [];
};

/**
 * Filter-only query (no vector — used for fetching all logs for a unit).
 * @param {Array} filters - array of Qdrant filter conditions
 * @param {number} limit
 */
const filterPoints = async (filters, limit = 50) => {
  const response = await qdrant.scroll(COLLECTION, {
    filter: {
      must: filters.map((f) => ({
        key: f.key,
        match: f.match,
      })),
    },
    limit,
    with_payload: true,
    with_vector: false,
  });
  return response.points || [];
};

/**
 * Updates both the vector and selected payload fields of an existing point.
 * Use this when the text content of a log changes (needs re-embedding).
 */
const updatePoint = async (id, newVector, payloadUpdates) => {
  // Re-upsert with updated vector
  await qdrant.upsert(COLLECTION, {
    wait: true,
    points: [
      {
        id,
        vector: newVector,
        payload: payloadUpdates,
      },
    ],
  });
};

/**
 * Updates only payload fields without touching the vector.
 * Use for marking resolved: true, changing risk level, etc.
 */
const setPayload = async (id, payloadUpdates) => {
  await qdrant.setPayload(COLLECTION, {
    payload: payloadUpdates,
    points: [id],
    wait: true,
  });
};

/**
 * Deletes a single point from the collection.
 */
const deletePoint = async (id) => {
  await qdrant.delete(COLLECTION, {
    wait: true,
    points: [id],
  });
};

module.exports = { upsertPoint, searchSimilar, filterPoints, updatePoint, setPayload, deletePoint };
