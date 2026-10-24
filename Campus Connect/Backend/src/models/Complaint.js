"use strict";
const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    category: {
      type: String,
      enum: ["academic", "facilities", "administration", "other"],
      required: [true, "Category is required"],
    },
    status: {
      type: String,
      enum: ["submitted", "in_progress", "resolved"],
      default: "submitted",
    },
    teacherResponse: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Complaint", complaintSchema);
