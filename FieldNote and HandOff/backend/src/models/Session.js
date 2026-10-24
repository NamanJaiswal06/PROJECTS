const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const sessionSchema = new mongoose.Schema(
  {
    session_id: {
      type: String,
      default: () => `sess_${uuidv4().replace(/-/g, '').slice(0, 8)}`,
      unique: true,
      index: true,
    },
    unit_id: {
      type: String,
      required: [true, 'unit_id is required'],
      trim: true,
      uppercase: true, // e.g. "UNIT-27"
    },
    technician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'completed'],
      default: 'active',
    },
    started_at: {
      type: Date,
      default: Date.now,
    },
    ended_at: {
      type: Date,
      default: null,
    },
    // Cached handoff document ID in Qdrant (set when handoff is generated)
    handoff_point_id: {
      type: String,
      default: null,
    },
    // Quick summary stats — updated as logs come in
    log_count: {
      type: Number,
      default: 0,
    },
    risk_level: {
      type: String,
      enum: ['low', 'medium', 'high', null],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast lookups by unit + status
sessionSchema.index({ unit_id: 1, status: 1 });
sessionSchema.index({ technician: 1, status: 1 });

module.exports = mongoose.model('Session', sessionSchema);
