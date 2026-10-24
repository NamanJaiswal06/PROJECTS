/**
 * policy.validator.js — Zod schemas for policy endpoints.
 *
 * Key design notes:
 *   - conditions must have at least one entry (no empty policies)
 *   - field paths use dot notation (validated as non-empty strings)
 *   - value is z.unknown() because it can be string/number/boolean/array
 *   - appliesToAgents/Tools/ActionTypes default to [] (global scope)
 *   - createdBy is NOT accepted from client — set from req.user in service
 *   - enabled defaults to true on create; can be set on update
 */
const { z } = require("zod");
const { POLICY_EFFECTS } = require("../utils/constants");

const CONDITION_OPERATORS = [
  "eq", "ne", "gt", "gte", "lt", "lte",
  "in", "nin", "contains", "notContains", "startsWith", "exists",
];

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Must be a valid ID");

// ─── Single condition ─────────────────────────────────────────────────────────
const conditionSchema = z.object({
  field: z
    .string({ required_error: "Condition field is required" })
    .trim()
    .min(1, "Condition field cannot be empty")
    .regex(
      /^[a-zA-Z_][a-zA-Z0-9_.]*$/,
      "Field must be a valid dot-notation path (e.g. 'action.parameters.count')"
    ),

  operator: z.enum(CONDITION_OPERATORS, {
    errorMap: () => ({
      message: `Operator must be one of: ${CONDITION_OPERATORS.join(", ")}`,
    }),
  }),

  value: z.unknown().refine(
    (v) => v !== undefined,
    { message: "Condition value is required" }
  ),
});

// ─── Create Policy ────────────────────────────────────────────────────────────
const createPolicySchema = z.object({
  name: z
    .string({ required_error: "Policy name is required" })
    .trim()
    .min(2, "Policy name must be at least 2 characters")
    .max(200, "Policy name cannot exceed 200 characters"),

  description: z.string().trim().max(1000).optional().default(""),

  enabled: z.boolean().optional().default(true),

  priority: z
    .number()
    .int("Priority must be an integer")
    .min(0, "Priority must be >= 0")
    .max(1000, "Priority cannot exceed 1000")
    .optional()
    .default(0),

  conditions: z
    .array(conditionSchema)
    .min(1, "Policy must have at least one condition"),

  effect: z.enum(Object.values(POLICY_EFFECTS), {
    errorMap: (issue, ctx) => ({
      message: issue.code === "invalid_type" && ctx.data === undefined
        ? "Policy effect is required"
        : `Effect must be one of: ${Object.values(POLICY_EFFECTS).join(", ")}`,
    }),
  }),

  appliesToAgents: z.array(objectIdSchema).optional().default([]),
  appliesToTools: z.array(objectIdSchema).optional().default([]),
  appliesToActionTypes: z.array(z.string().trim().min(1)).optional().default([]),
  // Note: createdBy is NOT accepted from client
});

// ─── Update Policy ────────────────────────────────────────────────────────────
const updatePolicySchema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    description: z.string().trim().max(1000).optional(),
    enabled: z.boolean().optional(),
    priority: z.number().int().min(0).max(1000).optional(),
    conditions: z.array(conditionSchema).min(1).optional(),
    effect: z
      .enum(Object.values(POLICY_EFFECTS), {
        errorMap: () => ({
          message: `Effect must be one of: ${Object.values(POLICY_EFFECTS).join(", ")}`,
        }),
      })
      .optional(),
    appliesToAgents: z.array(objectIdSchema).optional(),
    appliesToTools: z.array(objectIdSchema).optional(),
    appliesToActionTypes: z.array(z.string().trim().min(1)).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Update payload must contain at least one field",
  });

// ─── Policy ID param ──────────────────────────────────────────────────────────
const policyIdSchema = z.object({
  id: objectIdSchema,
});

module.exports = { createPolicySchema, updatePolicySchema, policyIdSchema };
