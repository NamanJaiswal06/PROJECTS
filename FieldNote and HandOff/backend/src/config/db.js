const mongoose = require('mongoose');
const { QdrantClient } = require('@qdrant/js-client-rest');

// ─── Qdrant singleton ─────────────────────────────────────────────────────────
const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  ...(process.env.QDRANT_API_KEY ? { apiKey: process.env.QDRANT_API_KEY.trim() } : {}),
  checkCompatibility: false,
});

const COLLECTION = process.env.QDRANT_COLLECTION || 'unit_logs';
const VECTOR_SIZE = 3072; // gemini-embedding-001 output dimension

/**
 * Ensures the `unit_logs` Qdrant collection exists with the correct schema.
 * Creates it (and payload indexes) on first run; safe to call on every startup.
 */
async function initQdrant() {
  try {
    const existing = await qdrant.getCollections();
    const exists = existing.collections.some((c) => c.name === COLLECTION);

    if (!exists) {
      await qdrant.createCollection(COLLECTION, {
        vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
      });

      // Index every field we filter on so searches stay O(1) at scale
      const keywordFields = ['unit_id', 'type', 'resolved', 'technician', 'session_id', 'risk',
                              'equipmentId', 'equipmentType', 'status', 'priority', 'location'];
      for (const field of keywordFields) {
        await qdrant.createPayloadIndex(COLLECTION, {
          field_name: field,
          field_schema: 'keyword',
        });
      }

      console.log(`✅ Qdrant: collection "${COLLECTION}" created with payload indexes`);
    } else {
      console.log(`✅ Qdrant: collection "${COLLECTION}" already exists`);
    }
  } catch (err) {
    console.error('❌ Qdrant init failed:', err.message);
    // Don't crash the server — Qdrant may start after this process
  }
}

// ─── MongoDB connection ───────────────────────────────────────────────────────
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Mongoose 7+ no longer needs these options, but left for clarity
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);

    // Init Qdrant collection after DB is ready
    await initQdrant();
  } catch (err) {
    console.error(`❌ MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
module.exports.qdrant = qdrant;
module.exports.COLLECTION = COLLECTION;
