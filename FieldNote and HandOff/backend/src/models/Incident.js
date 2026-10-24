const mongoose = require('mongoose');

/**
 * Incident — a granular field-log entry created during a technician's session.
 * Each spoken observation that gets structured becomes one Incident document.
 * The ML engineer's `recordObservation` tool writes to this collection via
 * POST /api/incidents.
 *
 * Contract shape (from context.md):
 * {
 *   id, unit_id, technician, timestamp,
 *   type: "observation",
 *   text: "Grinding noise near belt housing...",
 *   raw_transcript: "..."
 * }
 */
const incidentSchema = new mongoose.Schema(
  {
    // ─── Identity ──────────────────────────────────────────────
    unit_id: {
      type: String,
      required: [true, 'unit_id is required'],
      uppercase: true,
      trim: true,
      index: true, // e.g. "UNIT-27"
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

    // ─── Structured observation fields (Zod-validated on write) ──
    type: {
      type: String,
      enum: ['observation', 'action', 'finding', 'unresolved'],
      default: 'observation',
    },
    symptom:  { type: String, default: '' },
    finding:  { type: String, default: '' },
    action:   { type: String, default: '' },
    status: {
      type: String,
      enum: ['resolved', 'unresolved', 'monitoring'],
      default: 'unresolved',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low',
    },
    next_action: { type: String, default: '' },

    // ─── The summary text (what goes to Qdrant) ───────────────
    text: {
      type: String,
      required: [true, 'text summary is required'],
    },
    raw_transcript: {
      type: String,
      default: '',
    },

    // ─── Qdrant point ID (set after embedding) ─────────────────
    qdrant_point_id: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index for fast per-unit + status queries
incidentSchema.index({ unit_id: 1, status: 1 });
incidentSchema.index({ unit_id: 1, session_id: 1 });

module.exports = mongoose.model('Incident', incidentSchema);
