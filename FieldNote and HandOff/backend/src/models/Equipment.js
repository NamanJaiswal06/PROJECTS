const mongoose = require('mongoose');

/**
 * Equipment — represents a physical unit (e.g. UNIT-27, a compressor)
 * One document per machine. Used for quick lookup by the agent's getEquipment tool.
 */
const equipmentSchema = new mongoose.Schema(
  {
    equipment_id: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true, // e.g. "UNIT-27"
    },
    name: {
      type: String,
      required: true,
      trim: true, // e.g. "Belt-Drive Compressor"
    },
    type: {
      type: String,
      required: true,
      lowercase: true,
      trim: true, // e.g. "compressor"
    },
    location: {
      type: String,
      required: true,
      trim: true, // e.g. "Factory-A, Bay 3"
    },
    manufacturer: { type: String, trim: true },
    model_number:  { type: String, trim: true },
    install_date:  { type: Date, default: null },
    // Current operational status
    status: {
      type: String,
      enum: ['operational', 'degraded', 'offline', 'under_maintenance'],
      default: 'operational',
    },
    // Quick-reference fields the agent can surface
    specs: {
      type: Map,
      of: String,
      default: {},
      // e.g. { "rated_pressure": "150 PSI", "belt_size": "B52" }
    },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Equipment', equipmentSchema);
