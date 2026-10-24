"use strict";
const mongoose = require("mongoose");

/**
 * TeachingPlan stores AI-generated teaching schedules (optional persistence).
 * Plans are labelled as suggestions and never auto-mark topics complete.
 */
const teachingPlanSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subject: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    classesPerWeek: { type: Number, required: true, min: 1, max: 7 },
    // AI-generated schedule
    schedule: [
      {
        topic: { type: String, required: true },
        plannedDate: { type: Date, required: true },
        sessionObjective: { type: String, required: true },
        // Completion is tracked manually — AI never sets this
        completed: { type: Boolean, default: false },
      },
    ],
    aiGenerated: { type: Boolean, default: true }, // always true for now
    disclaimer: {
      type: String,
      default:
        "This teaching plan is AI-generated and intended as a suggestion only. Review and adjust before use.",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TeachingPlan", teachingPlanSchema);
