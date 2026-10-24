"use strict";
const Event = require("../models/Event");
const { createEventSchema } = require("../validators/event.validator");
const { success, failure } = require("../utils/apiResponse");

/**
 * GET /api/events
 * Authenticated — returns upcoming events ordered by eventDate ascending
 */
const listEvents = async (req, res, next) => {
  try {
    const events = await Event.find()
      .populate("createdBy", "name email role")
      .sort({ eventDate: 1 });

    return success(res, 200, "Events retrieved", events);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/events
 * Teacher only — creates an event
 */
const createEvent = async (req, res, next) => {
  try {
    const parsed = createEventSchema.safeParse(req.body);
    if (!parsed.success) {
      const messages = parsed.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return failure(res, 400, messages);
    }

    const { title, description, eventDate, location, registrationLink } =
      parsed.data;

    const event = await Event.create({
      title,
      description,
      eventDate: new Date(eventDate),
      location,
      registrationLink: registrationLink || "",
      createdBy: req.user._id,
    });

    await event.populate("createdBy", "name email role");

    return success(res, 201, "Event created", event);
  } catch (err) {
    next(err);
  }
};

module.exports = { listEvents, createEvent };
