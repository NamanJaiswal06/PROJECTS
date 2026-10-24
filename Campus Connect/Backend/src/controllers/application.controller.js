"use strict";
const mongoose = require("mongoose");
const Application = require("../models/Application");
const Opportunity = require("../models/Opportunity");
const { createApplicationSchema, updateApplicationStatusSchema } = require("../validators/application.validator");
const { success, failure } = require("../utils/apiResponse");

/**
 * POST /api/applications
 * Student only — apply to an opportunity
 */
const createApplication = async (req, res, next) => {
  try {
    const parsed = createApplicationSchema.safeParse(req.body);
    if (!parsed.success) {
      const messages = parsed.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return failure(res, 400, messages);
    }

    const { opportunityId, status } = parsed.data;

    if (!mongoose.Types.ObjectId.isValid(opportunityId)) {
      return failure(res, 400, "Invalid opportunityId format.");
    }

    const opportunity = await Opportunity.findById(opportunityId);
    if (!opportunity) {
      return failure(res, 404, "Opportunity not found.");
    }

    // Prevent duplicates — check before attempting to save (also enforced by unique index)
    const existing = await Application.findOne({
      studentId: req.user._id,
      opportunityId,
    });
    if (existing) {
      return failure(res, 409, "You have already applied to this opportunity.");
    }

    const application = await Application.create({
      studentId: req.user._id,
      opportunityId,
      status,
    });

    await application.populate([
      { path: "opportunityId", select: "company role deadline" },
    ]);

    return success(res, 201, "Application submitted", application);
  } catch (err) {
    if (err.code === 11000) {
      return failure(res, 409, "You have already applied to this opportunity.");
    }
    next(err);
  }
};

/**
 * GET /api/applications/mine
 * Student only — returns the authenticated student's applications
 */
const getMyApplications = async (req, res, next) => {
  try {
    const applications = await Application.find({ studentId: req.user._id })
      .populate("opportunityId", "company role deadline packageOrStipend")
      .sort({ createdAt: -1 });

    return success(res, 200, "Applications retrieved", applications);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/applications/:id/status
 * Teacher only — update application status to shortlisted, rejected, or selected
 */
const updateApplicationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return failure(res, 400, "Invalid application ID format.");
    }

    const parsed = updateApplicationStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      const messages = parsed.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return failure(res, 400, messages);
    }

    const application = await Application.findById(id);
    if (!application) {
      return failure(res, 404, "Application not found.");
    }

    application.status = parsed.data.status;
    await application.save();

    return success(res, 200, "Application status updated", application);
  } catch (err) {
    next(err);
  }
};

module.exports = { createApplication, getMyApplications, updateApplicationStatus };
