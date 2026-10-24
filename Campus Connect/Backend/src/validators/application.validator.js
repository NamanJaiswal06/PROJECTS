"use strict";
const { z } = require("zod");

const createApplicationSchema = z.object({
  opportunityId: z.string().min(1, "opportunityId is required"),
  status: z.enum(["saved", "applied"]).optional().default("saved"),
});

const updateApplicationStatusSchema = z.object({
  status: z.enum(["shortlisted", "rejected", "selected"], {
    errorMap: () => ({
      message: "Status must be shortlisted, rejected, or selected",
    }),
  }),
});

module.exports = { createApplicationSchema, updateApplicationStatusSchema };
