"use strict";
const mongoose = require("mongoose");
const Opportunity = require("../models/Opportunity");
const { createOpportunitySchema } = require("../validators/opportunity.validator");
const { success, failure } = require("../utils/apiResponse");

/**
 * GET /api/opportunities
 * Authenticated — returns opportunities sorted by deadline ascending
 */
const listOpportunities = async (req, res, next) => {
  try {
    const opportunities = await Opportunity.find()
      .populate("createdBy", "name email role")
      .sort({ deadline: 1 });

    return success(res, 200, "Opportunities retrieved", opportunities);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/opportunities
 * Teacher only — creates a placement opportunity
 */
const createOpportunity = async (req, res, next) => {
  try {
    const parsed = createOpportunitySchema.safeParse(req.body);
    if (!parsed.success) {
      const messages = parsed.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return failure(res, 400, messages);
    }

    const data = {
      ...parsed.data,
      deadline: new Date(parsed.data.deadline),
      createdBy: req.user._id,
    };

    const opportunity = await Opportunity.create(data);
    await opportunity.populate("createdBy", "name email role");

    return success(res, 201, "Opportunity created", opportunity);
  } catch (err) {
    next(err);
  }
};

module.exports = { listOpportunities, createOpportunity };
