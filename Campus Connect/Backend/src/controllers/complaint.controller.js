"use strict";
const mongoose = require("mongoose");
const Complaint = require("../models/Complaint");
const { createComplaintSchema, updateComplaintStatusSchema } = require("../validators/complaint.validator");
const { success, failure } = require("../utils/apiResponse");

/**
 * POST /api/complaints
 * Student only — submit a complaint; studentId derived from req.user
 */
const createComplaint = async (req, res, next) => {
  try {
    const parsed = createComplaintSchema.safeParse(req.body);
    if (!parsed.success) {
      const messages = parsed.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return failure(res, 400, messages);
    }

    const { title, description, category } = parsed.data;

    const complaint = await Complaint.create({
      studentId: req.user._id, // always server-derived
      title,
      description,
      category,
    });

    return success(res, 201, "Complaint submitted", complaint);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/complaints/mine
 * Student only — returns only the authenticated student's complaints
 */
const getMyComplaints = async (req, res, next) => {
  try {
    const complaints = await Complaint.find({ studentId: req.user._id }).sort({
      createdAt: -1,
    });

    return success(res, 200, "Complaints retrieved", complaints);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/complaints
 * Teacher only — returns all classroom complaints
 */
const getAllComplaints = async (req, res, next) => {
  try {
    const complaints = await Complaint.find()
      .populate("studentId", "name email")
      .sort({ createdAt: -1 });

    return success(res, 200, "All complaints retrieved", complaints);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/complaints/:id/status
 * Teacher only — update status and optionally add a teacherResponse
 */
const updateComplaintStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return failure(res, 400, "Invalid complaint ID format.");
    }

    const parsed = updateComplaintStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      const messages = parsed.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return failure(res, 400, messages);
    }

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return failure(res, 404, "Complaint not found.");
    }

    if (parsed.data.status !== undefined) {
      complaint.status = parsed.data.status;
    }
    if (parsed.data.teacherResponse !== undefined) {
      complaint.teacherResponse = parsed.data.teacherResponse;
    }

    await complaint.save();

    return success(res, 200, "Complaint updated", complaint);
  } catch (err) {
    next(err);
  }
};

module.exports = { createComplaint, getMyComplaints, getAllComplaints, updateComplaintStatus };
