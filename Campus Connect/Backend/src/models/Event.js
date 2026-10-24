"use strict";
const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    eventDate: {
      type: Date,
      required: [true, "Event date is required"],
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },
    registrationLink: {
      type: String,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);
