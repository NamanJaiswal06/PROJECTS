/**
 * seed-qdrant.js — ML Engineer's Qdrant seed script
 *
 * Purpose: Read incidents + handoffs already in MongoDB, embed each one,
 * and upsert into Qdrant. Run this AFTER seed.js has populated MongoDB.
 *
 * Usage:
 *   node seed-qdrant.js
 *
 * Verify afterwards:
 *   curl -X POST http://localhost:5000/api/memory/search \
 *     -H "Authorization: Bearer <token>" \
 *     -H "Content-Type: application/json" \
 *     -d '{"query":"compressor rattling on startup","equipmentId":"UNIT-27","k":3}'
 *
 * Expected: returns the loose-mounting-bolts case with score > 0.7
 */

'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { QdrantClient } = require('@qdrant/js-client-rest');

const Incident = require('./src/models/Incident');
const Handoff  = require('./src/models/Handoff');

// ── Clients ───────────────────────────────────────────────────────────────────
const genAI  = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  ...(process.env.QDRANT_API_KEY ? { apiKey: process.env.QDRANT_API_KEY.trim() } : {}),
  checkCompatibility: false,
});
const COLLECTION = process.env.QDRANT_COLLECTION || 'unit_logs';
const VECTOR_SIZE = 3072; // gemini-embedding-001

// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const embed = async (text) => {
  // gemini-embedding-001: free tier, 3072 dims
  const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
  const result = await model.embedContent(text.replace(/\n/g, ' '));
  return result.embedding.values;
};

// ── Ensure collection ─────────────────────────────────────────────────────────
const ensureCollection = async () => {
  const existing = await qdrant.getCollections();
  const exists = existing.collections.some((c) => c.name === COLLECTION);

  if (!exists) {
    console.log(`Creating Qdrant collection "${COLLECTION}"...`);
    await qdrant.createCollection(COLLECTION, {
      vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
    });

    // Index all filterable fields
    const fields = ['equipmentId', 'equipmentType', 'location', 'status', 'type', 'priority'];
    for (const field of fields) {
      await qdrant.createPayloadIndex(COLLECTION, {
        field_name: field,
        field_schema: 'keyword',
      });
    }
    console.log('✅ Collection created with payload indexes');
  } else {
    console.log(`✅ Collection "${COLLECTION}" already exists`);
  }
};

// ── Upsert incidents ──────────────────────────────────────────────────────────
const seedIncidents = async () => {
  const incidents = await Incident.find({}).lean();
  console.log(`\nSeeding ${incidents.length} incidents into Qdrant...`);

  let ok = 0;
  let fail = 0;

  for (const inc of incidents) {
    try {
      // Text pattern per execution plan: "symptom. finding. action. status."
      const text = [inc.symptom, inc.finding, inc.action, inc.status]
        .filter(Boolean)
        .join('. ') || inc.text || '';

      if (!text) {
        console.warn(`  ⚠  Skipping incident ${inc._id} — no embeddable text`);
        fail++;
        continue;
      }

      const vector = await embed(text);
      const pointId = inc.qdrant_point_id || uuidv4();

      await qdrant.upsert(COLLECTION, {
        wait: true,
        points: [
          {
            id: pointId,
            vector,
            payload: {
              type: inc.type || 'observation',
              equipmentId: inc.unit_id,
              equipmentType: 'compressor',
              location: 'Factory-A',
              symptom: inc.symptom || '',
              finding: inc.finding || '',
              action: inc.action || '',
              status: inc.status || 'unresolved',
              priority: inc.priority || 'low',
              technicianId: 'seed',
              timestamp: inc.createdAt?.toISOString() || new Date().toISOString(),
              text,
              mongo_id: inc._id.toString(),
            },
          },
        ],
      });

      console.log(`  ✓ [${inc.unit_id}] ${text.slice(0, 60)}...`);
      ok++;

      // Rate-limit: Gemini embedding free tier is 1500 req/min
      await sleep(100);
    } catch (err) {
      console.error(`  ✗ Incident ${inc._id}: ${err.message}`);
      fail++;
    }
  }

  console.log(`  Incidents: ${ok} upserted, ${fail} failed`);
};

// ── Upsert handoffs ───────────────────────────────────────────────────────────
const seedHandoffs = async () => {
  const handoffs = await Handoff.find({}).lean();
  console.log(`\nSeeding ${handoffs.length} handoffs into Qdrant...`);

  let ok = 0;
  let fail = 0;

  for (const h of handoffs) {
    try {
      // Text pattern: summary + unresolved + next_steps
      const text = [
        h.summary,
        h.unresolved?.length ? `Unresolved: ${h.unresolved.join(', ')}` : '',
        h.next_steps?.length ? `Next: ${h.next_steps.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join('. ');

      if (!text) {
        console.warn(`  ⚠  Skipping handoff ${h._id} — no embeddable text`);
        fail++;
        continue;
      }

      const vector = await embed(text);
      const pointId = h.qdrant_point_id || uuidv4();

      await qdrant.upsert(COLLECTION, {
        wait: true,
        points: [
          {
            id: pointId,
            vector,
            payload: {
              type: 'handoff',
              equipmentId: h.unit_id,
              equipmentType: 'compressor',
              location: 'Factory-A',
              symptom: '',
              finding: h.summary,
              action: h.next_steps?.join('; ') || '',
              status: h.unresolved?.length > 0 ? 'unresolved' : 'resolved',
              priority: h.risk_level || 'low',
              technicianId: 'seed',
              timestamp: h.generated_at?.toISOString() || new Date().toISOString(),
              text,
              mongo_id: h._id.toString(),
              handoff_data: {
                summary: h.summary,
                checked: h.checked,
                found: h.found,
                fixed: h.fixed,
                unresolved: h.unresolved,
                next_steps: h.next_steps,
                risk_level: h.risk_level,
              },
            },
          },
        ],
      });

      console.log(`  ✓ [${h.unit_id}] ${text.slice(0, 60)}...`);
      ok++;
      await sleep(100);
    } catch (err) {
      console.error(`  ✗ Handoff ${h._id}: ${err.message}`);
      fail++;
    }
  }

  console.log(`  Handoffs: ${ok} upserted, ${fail} failed`);
};

// ── Verify seed ────────────────────────────────────────────────────────────────
const verifySeed = async () => {
  console.log('\nVerification: querying "compressor rattling on startup" for UNIT-27...');

  const queryText = 'compressor rattling on startup';
  const vector = await embed(queryText);

  const hits = await qdrant.query(COLLECTION, {
    query: vector,
    limit: 3,
    filter: { must: [{ key: 'equipmentId', match: { value: 'UNIT-27' } }] },
    with_payload: true,
  });

  const hitsArr = hits.points || [];
  if (hitsArr.length === 0) {
    console.warn('  ⚠  No hits found — check that seed.js was run first');
    return;
  }

  console.log(`  ✅ Got ${hitsArr.length} hit(s):`);
  hitsArr.forEach((h, i) => {
    console.log(`     [${i + 1}] score=${h.score?.toFixed(3)} | ${h.payload?.text?.slice(0, 70)}`);
  });
};

// ── Main ──────────────────────────────────────────────────────────────────────
const main = async () => {
  console.log('=== FIELDNOTE — Qdrant seed ===\n');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ MongoDB connected');

  await ensureCollection();
  await seedIncidents();
  await seedHandoffs();
  await verifySeed();

  console.log('\n=== Done ===');
  await mongoose.disconnect();
  process.exit(0);
};

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
