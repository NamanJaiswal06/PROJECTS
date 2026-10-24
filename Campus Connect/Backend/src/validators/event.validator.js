"use strict";
const { z } = require("zod");

const createEventSchema = z.object({
  title: z.string().min(1, "Title is required").trim(),
  description: z.string().min(1, "Description is required"),
  eventDate: z
.string()
    .datetime({ message: "eventDate must be a valid ISO 8601 date-time string" }),
  location: z.string().min(1, "Location is required").trim(),
  registrationLink: z.string().optional().default(""),
});

module.exports = { createEventSchema };
