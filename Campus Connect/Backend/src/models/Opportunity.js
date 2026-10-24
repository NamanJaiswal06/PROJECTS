"use strict";
const mongoose = require("mongoose");

const opportunitySchema = new mongoose.Schema(
  {
    company: {
      type: String,
      required: [true, "Company is required"],
      trim: true,
    },
    role: {
      type: String,
      required: [true, "Role is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    eligibility: {
      type: String,
      required: [true, "Eligibility is required"],
    },
    packageOrStipend: {
      type: String,
      required: [true, "Package or stipend is required"],
    },
    deadline: {
      type: Date,
      required: [true, "Deadline is required"],
    },
    applicationLink: {
      type: String,
      required: [true, "Application link is required"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Opportunity", opportunitySchema);
