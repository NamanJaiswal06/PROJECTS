const mongoose = require('mongoose');

/**
 * Handoff — end-of-shift summary document.
 * The ML engineer's `createHandoff` tool writes here via POST /api/handoffs.
 * The handoff summary is also embedded into Qdrant for semantic recovery.
 *
 * Contract shape (from context.md):
 * {
 *   unit_id, session_id, generated_at,
 *   summary, checked[], found[], fixed[],
 *   unresolved[], next_steps[], similar_cases[]
 * }
 */
const handoffSchema = new mongoose.Schema(
  {
    // ─── Identity ─────────────────────────────────────────────
    unit_id: {
      type: String,
      required: [true, 'unit_id is required'],
      uppercase: true,
      trim: true,
      index: true,
    },
    session_id: {
      type: String,
      required: true,
      index: true,
    },
    technician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,  // tool context may not have a User ObjectId
      default: null,
    },
    shift: {
      type: String,
      enum: ['morning', 'afternoon', 'night', 'custom'],
      default: 'custom',
    },
    generated_at: {
      type: Date,
      default: Date.now,
    },

    // ─── Structured handoff content (from context.md) ─────────
    summary: {
      type: String,
      required: [true, 'summary is required'],
      maxlength: [500, 'summary must be ≤ 500 characters for TTS compatibility'],
    },
    checked:    { type: [String], default: [] }, // what was inspected
    found:      { type: [String], default: [] }, // what was discovered
    fixed:      { type: [String], default: [] }, // what was resolved
    unresolved: { type: [String], default: [] }, // open issues — critical for recovery
    next_steps: { type: [String], default: [] }, // concrete next actions
    similar_cases: {
      type: [String],
      default: [], // Qdrant point IDs of similar historical incidents
    },

    // ─── Risk level (surfaces in UI + voice) ──────────────────
    risk_level: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low',
    },

    // ─── Qdrant cross-reference ────────────────────────────────
    qdrant_point_id: {
      type: String,
      default: null, // set once the handoff is indexed in Qdrant
    },
  },
  { timestamps: true }
);

// Fast lookup: latest handoff for a unit
handoffSchema.index({ unit_id: 1, generated_at: -1 });

module.exports = mongoose.model('Handoff', handoffSchema);
