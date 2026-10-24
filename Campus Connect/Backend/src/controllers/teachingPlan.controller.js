"use strict";
const mongoose = require("mongoose");
const TeachingPlan = require("../models/TeachingPlan");
const { generateTeachingPlan } = require("../services/placementPrep.service");
const { generatePlanSchema } = require("../validators/placementPrep.validator");
const { success, failure } = require("../utils/apiResponse");

/**
 * POST /api/teaching-plans/generate
 * Teacher only — generates an AI teaching schedule and persists it.
 */
const generatePlanHandler = async (req, res, next) => {
  try {
    const parsed = generatePlanSchema.safeParse(req.body);
    if (!parsed.success) {
      const messages = parsed.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return failure(res, 400, messages);
    }

    const { subject, topics, startDate, endDate, classesPerWeek } = parsed.data;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return failure(res, 400, "Invalid startDate or endDate.");
    }
    if (end <= start) {
      return failure(res, 400, "endDate must be after startDate.");
    }

    // Estimate available slots — sanity check
    const daysInRange =
      Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const weeksInRange = daysInRange / 7;
    const maxSlots = Math.floor(weeksInRange * classesPerWeek);
    if (maxSlots < 1) {
      return failure(
        res,
        400,
        "The date range is too short to schedule any classes. Extend the range or increase classesPerWeek."
      );
    }

    // Generate via AI
    let schedule;
    try {
      schedule = await generateTeachingPlan(
        subject,
        topics,
        start,
        end,
        classesPerWeek
      );
    } catch (err) {
      if (err.statusCode) return failure(res, err.statusCode, err.message);
      throw err;
    }

    // Persist
    const plan = await TeachingPlan.create({
      teacherId: req.user._id,
      subject,
      startDate: start,
      endDate: end,
      classesPerWeek,
      schedule: schedule.map((s) => ({
        topic: s.topic,
        plannedDate: new Date(s.plannedDate),
        sessionObjective: s.sessionObjective,
        completed: false,
      })),
    });

    return success(res, 201, "Teaching plan generated", {
      planId: plan._id,
      subject: plan.subject,
      startDate: plan.startDate,
      endDate: plan.endDate,
      classesPerWeek: plan.classesPerWeek,
      disclaimer: plan.disclaimer,
      aiGenerated: plan.aiGenerated,
      schedule: plan.schedule,
      createdAt: plan.createdAt,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/teaching-plans
 * Teacher only — lists the teacher's saved plans
 */
const listPlansHandler = async (req, res, next) => {
  try {
    const plans = await TeachingPlan.find({ teacherId: req.user._id })
      .select("-schedule") // omit schedule for list view
      .sort({ createdAt: -1 });

    return success(res, 200, "Teaching plans retrieved", plans);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/teaching-plans/:id
 * Teacher only — retrieves a single plan
 */
const getPlanHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return failure(res, 400, "Invalid plan ID format.");
    }

    const plan = await TeachingPlan.findById(id);
    if (!plan) return failure(res, 404, "Teaching plan not found.");

    if (plan.teacherId.toString() !== req.user._id.toString()) {
      return failure(res, 403, "You can only view your own teaching plans.");
    }

    return success(res, 200, "Teaching plan retrieved", plan);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/teaching-plans/:planId/sessions/:sessionIndex/complete
 * Teacher only — manually marks a session as completed
 */
const markSessionCompleteHandler = async (req, res, next) => {
  try {
    const { planId, sessionIndex } = req.params;
    const idx = parseInt(sessionIndex, 10);

    if (!mongoose.Types.ObjectId.isValid(planId)) {
      return failure(res, 400, "Invalid plan ID format.");
    }
    if (isNaN(idx) || idx < 0) {
      return failure(res, 400, "sessionIndex must be a non-negative integer.");
    }

    const plan = await TeachingPlan.findById(planId);
    if (!plan) return failure(res, 404, "Teaching plan not found.");
    if (plan.teacherId.toString() !== req.user._id.toString()) {
      return failure(res, 403, "You can only update your own plans.");
    }
    if (!plan.schedule[idx]) {
      return failure(res, 404, `Session at index ${idx} not found.`);
    }

    plan.schedule[idx].completed = true;
    await plan.save();

    return success(res, 200, "Session marked as completed", {
      planId: plan._id,
      session: plan.schedule[idx],
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  generatePlanHandler,
  listPlansHandler,
  getPlanHandler,
  markSessionCompleteHandler,
};
