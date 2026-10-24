"use strict";
const { z } = require("zod");

const generateQuizSchema = z.object({
  opportunityId: z.string().min(1, "opportunityId is required"),
  numberOfQuestions: z
    .number({ invalid_type_error: "numberOfQuestions must be a number" })
    .int()
    .min(1, "Minimum 1 question")
    .max(15, "Maximum 15 questions")
    .default(5),
});

const submitQuizSchema = z.object({
  sessionId: z.string().min(1, "sessionId is required"),
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1, "questionId is required"),
        selectedOptionIndex: z
          .number({ invalid_type_error: "selectedOptionIndex must be a number" })
          .int()
          .min(0)
          .max(3),
      })
    )
    .min(1, "At least one answer is required"),
});

const generatePlanSchema = z.object({
  subject: z.string().min(1, "subject is required").trim(),
  topics: z
    .array(z.string().min(1))
    .min(1, "At least one topic is required")
    .max(20, "Maximum 20 topics"),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must be YYYY-MM-DD"),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "endDate must be YYYY-MM-DD"),
  classesPerWeek: z
    .number({ invalid_type_error: "classesPerWeek must be a number" })
    .int()
    .min(1)
    .max(7)
    .default(3),
});

module.exports = { generateQuizSchema, submitQuizSchema, generatePlanSchema };
