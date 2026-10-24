"use strict";
const { z } = require("zod");

const createOpportunitySchema = z.object({
  company: z.string().min(1, "Company is required").trim(),
  role: z.string().min(1, "Role is required").trim(),
  description: z.string().min(1, "Description is required"),
  eligibility: z.string().min(1, "Eligibility is required"),
  packageOrStipend: z.string().min(1, "Package or stipend is required"),
  deadline: z
    .string()
    .datetime({ message: "deadline must be a valid ISO 8601 date-time string" }),
  applicationLink: z.string().url("applicationLink must be a valid URL"),
});

module.exports = { createOpportunitySchema };
