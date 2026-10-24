/**
 * seed.js — Demo data seeder for FIELDNOTE hackathon
 *
 * Run once: node seed.js
 *
 * Seeds:
 *  - 3 Equipment units (UNIT-27, UNIT-14, UNIT-31)
 *  - 10 historical incidents for UNIT-27 + 3 for neighbors
 *  - 1 example handoff for UNIT-27 (powers recovery demo)
 *
 * After seeding, verify with:
 *   curl -X POST http://localhost:5000/api/memory/search \
 *     -H "Authorization: Bearer <token>" \
 *     -H "Content-Type: application/json" \
 *     -d '{"query":"compressor vibration on startup","equipmentId":"UNIT-27"}'
 */

require('dotenv').config();
const mongoose  = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { QdrantClient } = require('@qdrant/js-client-rest');

// ── Models ────────────────────────────────────────────────────
const Equipment = require('./src/models/Equipment');
const Incident  = require('./src/models/Incident');
const Handoff   = require('./src/models/Handoff');
const User      = require('./src/models/User');

const genAI   = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const qdrant  = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  ...(process.env.QDRANT_API_KEY ? { apiKey: process.env.QDRANT_API_KEY.trim() } : {}),
  checkCompatibility: false,
});
const COLLECTION = process.env.QDRANT_COLLECTION || 'unit_logs';

// ── Helpers ───────────────────────────────────────────────────
const embed = async (text) => {
  // gemini-embedding-001 — 3072 dimensions, available on free tier
  const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
  const result = await model.embedContent(text.replace(/\n/g, ' '));
  return result.embedding.values; // 3072 dimensions
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Seed data ─────────────────────────────────────────────────

const EQUIPMENT = [
  {
    equipment_id: 'UNIT-27',
    name: 'Belt-Drive Air Compressor',
    type: 'compressor',
    location: 'Factory-A, Bay 3',
    manufacturer: 'Atlas Copco',
    model_number: 'GA-30+',
    status: 'degraded',
    specs: { rated_pressure: '150 PSI', belt_size: 'B52', motor_hp: '40', oil_capacity: '4L' },
    notes: 'Primary compressor for production line. Reported grinding noise since 2026-08-07.',
  },
  {
    equipment_id: 'UNIT-14',
    name: 'Piston Compressor (Backup)',
    type: 'compressor',
    location: 'Factory-A, Bay 1',
    manufacturer: 'Ingersoll Rand',
    model_number: 'T30-7.5',
    status: 'operational',
    specs: { rated_pressure: '175 PSI', motor_hp: '7.5', oil_capacity: '2.5L' },
    notes: 'Backup unit. Used during UNIT-27 maintenance windows.',
  },
  {
    equipment_id: 'UNIT-31',
    name: 'Rotary Screw Compressor',
    type: 'compressor',
    location: 'Factory-B, Bay 2',
    manufacturer: 'Kaeser',
    model_number: 'SM-11',
    status: 'operational',
    specs: { rated_pressure: '145 PSI', motor_hp: '15', oil_capacity: '7L' },
    notes: 'Newer unit. Oil-injected rotary screw type.',
  },
];

// 10 historical incidents for UNIT-27 (hero unit)
const UNIT27_INCIDENTS = [
  {
    symptom: 'compressor vibration on startup',
    finding: 'loose mounting bolts on motor bracket',
    action: 'torqued all mounting bolts to 45 Nm spec',
    status: 'resolved',
    priority: 'high',
    next_action: '',
    date: '2026-07-15',
  },
  {
    symptom: 'belt squealing at high load',
    finding: 'belt tension below spec, surface cracking visible',
    action: 'replaced B52 belt, re-tensioned to 6mm deflection',
    status: 'resolved',
    priority: 'medium',
    next_action: '',
    date: '2026-07-22',
  },
  {
    symptom: 'oil level low, minor seepage at rear seal',
    finding: 'rear crankshaft seal weeping — not yet catastrophic',
    action: 'topped up oil, flagged seal for replacement next PM window',
    status: 'monitoring',
    priority: 'medium',
    next_action: 'replace rear seal at next planned maintenance',
    date: '2026-07-28',
  },
  {
    symptom: 'pressure drops below 120 PSI under sustained load',
    finding: 'intake filter 80% blocked with debris',
    action: 'replaced air intake filter element',
    status: 'resolved',
    priority: 'medium',
    next_action: '',
    date: '2026-07-30',
  },
  {
    symptom: 'thermal cutout tripping at hour 3 of operation',
    finding: 'cooling fins heavily fouled, ambient temp 38C',
    action: 'pressure-washed fins, confirmed cutout reset correctly',
    status: 'resolved',
    priority: 'high',
    next_action: 'schedule fin cleaning every 30 days during summer',
    date: '2026-08-02',
  },
  {
    symptom: 'abnormal knocking sound from crankcase',
    finding: 'crankcase oil discoloured and sludgy',
    action: 'full oil change with ISO 68 compressor oil',
    status: 'resolved',
    priority: 'high',
    next_action: '',
    date: '2026-08-03',
  },
  {
    symptom: 'safety relief valve leaking intermittently',
    finding: 'relief valve seat corroded, opening at 130 PSI instead of 150',
    action: 'replaced relief valve assembly, confirmed correct setting',
    status: 'resolved',
    priority: 'high',
    next_action: '',
    date: '2026-08-04',
  },
  {
    symptom: 'grinding noise near belt housing during operation',
    finding: 'idler pulley bearing worn — noise increases with load',
    action: 'ordered replacement bearing, temporarily reduced load',
    status: 'unresolved',
    priority: 'high',
    next_action: 'replace idler pulley bearing when part arrives (ETA 2026-08-10)',
    date: '2026-08-07',
  },
  {
    symptom: 'motor running hot — surface temp 85C after 2 hours',
    finding: 'motor ventilation slots 40% blocked by cotton-waste accumulation',
    action: 'cleared motor ventilation slots, confirmed temp drop to 62C',
    status: 'resolved',
    priority: 'medium',
    next_action: '',
    date: '2026-08-08',
  },
  {
    symptom: 'discharge valve chattering at low RPM',
    finding: 'discharge valve spring weakened — confirmed with pressure gauge test',
    action: 'adjusted unloader valve, monitoring — spring replacement pending',
    status: 'unresolved',
    priority: 'medium',
    next_action: 'replace discharge valve spring at next inspection',
    date: '2026-08-09',
  },
];

// 3 incidents for neighbor units (tests cross-equipment Qdrant scoping)
const NEIGHBOR_INCIDENTS = [
  {
    unit_id: 'UNIT-14',
    symptom: 'piston slap noise at cold start',
    finding: 'piston rings worn — blow-by confirmed with compression test',
    action: 'unit flagged for ring replacement during next shutdown window',
    status: 'monitoring',
    priority: 'medium',
    next_action: 'schedule ring replacement',
  },
  {
    unit_id: 'UNIT-31',
    symptom: 'oil-water separator not draining automatically',
    finding: 'float valve in separator stuck open',
    action: 'cleaned and freed float valve, confirmed auto-drain cycle',
    status: 'resolved',
    priority: 'low',
    next_action: '',
  },
  {
    unit_id: 'UNIT-31',
    symptom: 'compressor vibration — similar to UNIT-27 vibration last month',
    finding: 'inlet filter bypass gasket split — causing unfiltered air ingestion',
    action: 'replaced bypass gasket and inlet filter',
    status: 'resolved',
    priority: 'high',
    next_action: '',
  },
];

// Example handoff for recovery demo
const EXAMPLE_HANDOFF = {
  unit_id: 'UNIT-27',
  session_id: 'sess_seed_001',
  shift: 'morning',
  summary: 'Grinding noise persists after belt adjustment; idler pulley bearing worn and bearing replacement is on order — unit running at reduced load until part arrives.',
  checked: ['belt tension', 'oil level', 'intake filter', 'cooling fins', 'motor temp', 'discharge valve'],
  found: ['grinding noise near belt housing — idler pulley bearing worn', 'discharge valve chattering at low RPM'],
  fixed: ['motor ventilation slots cleared', 'oil change completed'],
  unresolved: ['idler pulley bearing worn — replacement on order (ETA 2026-08-10)', 'discharge valve spring weakened'],
  next_steps: [
    'Replace idler pulley bearing when part arrives — part number SKF-6205',
    'Replace discharge valve spring at next inspection',
    'Monitor oil level daily until rear seal is replaced at next PM',
  ],
  similar_cases: [],
  risk_level: 'high',
};

// ── Main seeder ───────────────────────────────────────────────
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ MongoDB connected');

  // Find or create a seed technician
  let tech = await User.findOne({ username: 'raj_tech' }).select('+password');
  if (!tech) {
    tech = await User.create({
      username: 'raj_tech',
      email: 'raj@factory-a.com',
      password: 'FieldNote2026!',
      role: 'technician',
    });
    console.log('✅ Created seed technician: raj_tech / FieldNote2026!');
  } else {
    console.log('ℹ️  Seed technician already exists');
  }

  // ── Equipment ────────────────────────────────────────────────
  console.log('\n📦 Seeding equipment…');
  for (const eq of EQUIPMENT) {
    await Equipment.findOneAndUpdate(
      { equipment_id: eq.equipment_id },
      eq,
      { upsert: true, new: true }
    );
    console.log(`   ✓ ${eq.equipment_id} — ${eq.name}`);
  }

  // ── Ensure Qdrant collection ─────────────────────────────────
  const existing = await qdrant.getCollections();
  if (!existing.collections.some((c) => c.name === COLLECTION)) {
    await qdrant.createCollection(COLLECTION, {
      vectors: { size: 3072, distance: 'Cosine' }, // gemini-embedding-001 = 3072d
    });
    const fields = ['equipmentId', 'equipmentType', 'location', 'status', 'type', 'unit_id', 'session_id', 'priority', 'risk'];
    for (const f of fields) {
      await qdrant.createPayloadIndex(COLLECTION, { field_name: f, field_schema: 'keyword' });
    }
    console.log(`\n✅ Qdrant collection "${COLLECTION}" created (3072-dim, gemini-embedding-001)`);
  } else {
    console.log(`\nℹ️  Qdrant collection "${COLLECTION}" already exists`);
    console.log('   ⚠️  If you changed from OpenAI to Gemini, delete the old collection first:');
    console.log(`      curl -X DELETE http://localhost:6333/collections/${COLLECTION}`);
  }

  // ── Incidents (UNIT-27) ──────────────────────────────────────
  console.log('\n📋 Seeding UNIT-27 incidents…');
  await Incident.deleteMany({ unit_id: 'UNIT-27', session_id: 'sess_seed_001' });

  const qdrantPoints = [];

  for (let i = 0; i < UNIT27_INCIDENTS.length; i++) {
    const inc = UNIT27_INCIDENTS[i];
    const embeddableText = `${inc.symptom}. ${inc.finding}. ${inc.action}. ${inc.status}.`;
    const vector = await embed(embeddableText);
    const pointId = uuidv4();

    const doc = await Incident.create({
      unit_id: 'UNIT-27',
      session_id: 'sess_seed_001',
      technician: tech._id,
      type: 'observation',
      symptom: inc.symptom,
      finding: inc.finding,
      action: inc.action,
      status: inc.status,
      priority: inc.priority,
      next_action: inc.next_action,
      text: embeddableText,
      raw_transcript: '',
      qdrant_point_id: pointId,
    });

    qdrantPoints.push({
      id: pointId,
      vector,
      payload: {
        type: 'incident',
        equipmentId: 'UNIT-27',
        equipmentType: 'compressor',
        location: 'Factory-A, Bay 3',
        symptom: inc.symptom,
        finding: inc.finding,
        action: inc.action,
        status: inc.status,
        priority: inc.priority,
        technicianId: 'raj_tech',
        timestamp: new Date(inc.date).toISOString(),
        text: embeddableText,
        session_id: 'sess_seed_001',
        mongo_id: doc._id.toString(),
      },
    });

    console.log(`   ✓ [${i + 1}/10] ${inc.symptom.slice(0, 60)}`);
    await sleep(200); // Rate limit embeddings
  }

  // ── Incidents (neighbors) ────────────────────────────────────
  console.log('\n📋 Seeding neighbor unit incidents…');
  for (const inc of NEIGHBOR_INCIDENTS) {
    const embeddableText = `${inc.symptom}. ${inc.finding}. ${inc.action}. ${inc.status}.`;
    const vector = await embed(embeddableText);
    const pointId = uuidv4();

    const doc = await Incident.create({
      unit_id: inc.unit_id,
      session_id: 'sess_seed_neighbor',
      technician: tech._id,
      type: 'observation',
      symptom: inc.symptom,
      finding: inc.finding,
      action: inc.action,
      status: inc.status,
      priority: inc.priority,
      next_action: inc.next_action || '',
      text: embeddableText,
      qdrant_point_id: pointId,
    });

    qdrantPoints.push({
      id: pointId,
      vector,
      payload: {
        type: 'incident',
        equipmentId: inc.unit_id,
        equipmentType: 'compressor',
        location: inc.unit_id === 'UNIT-14' ? 'Factory-A, Bay 1' : 'Factory-B, Bay 2',
        symptom: inc.symptom,
        finding: inc.finding,
        action: inc.action,
        status: inc.status,
        priority: inc.priority,
        technicianId: 'raj_tech',
        timestamp: new Date().toISOString(),
        text: embeddableText,
        session_id: 'sess_seed_neighbor',
        mongo_id: doc._id.toString(),
      },
    });

    console.log(`   ✓ ${inc.unit_id}: ${inc.symptom.slice(0, 55)}`);
    await sleep(200);
  }

  // ── Upsert all incident points to Qdrant (batch) ─────────────
  await qdrant.upsert(COLLECTION, { wait: true, points: qdrantPoints });
  console.log(`\n✅ Upserted ${qdrantPoints.length} points to Qdrant`);

  // ── Example handoff ──────────────────────────────────────────
  console.log('\n📤 Seeding example UNIT-27 handoff…');
  await Handoff.deleteOne({ session_id: EXAMPLE_HANDOFF.session_id });

  const handoffText = [
    EXAMPLE_HANDOFF.summary,
    `Unresolved: ${EXAMPLE_HANDOFF.unresolved.join(', ')}`,
    `Next: ${EXAMPLE_HANDOFF.next_steps.join(', ')}`,
  ].join('. ');

  const handoffVector = await embed(handoffText);
  const handoffPointId = uuidv4();

  const handoffDoc = await Handoff.create({
    ...EXAMPLE_HANDOFF,
    technician: tech._id,
    generated_at: new Date('2026-08-09T08:00:00Z'),
    qdrant_point_id: handoffPointId,
  });

  await qdrant.upsert(COLLECTION, {
    wait: true,
    points: [{
      id: handoffPointId,
      vector: handoffVector,
      payload: {
        type: 'handoff',
        equipmentId: 'UNIT-27',
        equipmentType: 'compressor',
        location: 'Factory-A, Bay 3',
        symptom: '',
        finding: EXAMPLE_HANDOFF.summary,
        action: EXAMPLE_HANDOFF.next_steps.join('; '),
        status: 'unresolved',
        priority: 'high',
        technicianId: 'raj_tech',
        timestamp: new Date('2026-08-09T08:00:00Z').toISOString(),
        text: handoffText,
        session_id: EXAMPLE_HANDOFF.session_id,
        mongo_id: handoffDoc._id.toString(),
        handoff_data: EXAMPLE_HANDOFF,
      },
    }],
  });

  console.log('   ✓ Handoff seeded + indexed in Qdrant');

  // ── Sanity check ─────────────────────────────────────────────
  console.log('\n🔍 Sanity check — querying "compressor vibration on startup" (UNIT-27 only)…');
  try {
    const testVec = await embed('compressor vibration on startup');
    const hits = await qdrant.query(COLLECTION, {
      query: testVec,
      limit: 3,
      filter: { must: [{ key: 'equipmentId', match: { value: 'UNIT-27' } }] },
      with_payload: true,
    });
    const results = hits.points || hits;
    if (results.length === 0) {
      console.log('   ⚠️  No hits returned — check payload field names');
    } else {
      results.forEach((h, i) => {
        const score = h.score?.toFixed(3) ?? '?';
        console.log(`   [${i + 1}] score=${score} — ${h.payload?.symptom?.slice(0, 60) || h.payload?.text?.slice(0, 60)}`);
      });
      console.log(`   ✅ Retrieval working! Top score: ${results[0]?.score?.toFixed(3)}`);
    }
  } catch (searchErr) {
    console.warn('   ⚠️  Sanity check skipped:', searchErr.message.slice(0, 80));
    console.warn('   Data is seeded — run `npm run eval` to verify retrieval.');
  }

  console.log('\n🎉 Seed complete!\n');
  console.log('─────────────────────────────────────────────────────');
  console.log('Demo credentials:');
  console.log('  Email:    raj@factory-a.com');
  console.log('  Password: FieldNote2026!');
  console.log('─────────────────────────────────────────────────────\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
