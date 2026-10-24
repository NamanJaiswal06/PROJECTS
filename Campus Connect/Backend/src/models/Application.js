"use strict";
const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    opportunityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Opportunity",
      required: true,
    },
    status: {
      type: String,
      enum: ["saved", "applied", "shortlisted", "rejected", "selected"],
      default: "saved",
    },
  },
  { timestamps: true }
);

// Prevent duplicate applications from the same student to the same opportunity
applicationSchema.index({ studentId: 1, opportunityId: 1 }, { unique: true });

module.exports = mongoose.model("Application", applicationSchema);
