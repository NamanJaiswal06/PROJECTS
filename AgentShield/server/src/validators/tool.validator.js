/**
 * tool.validator.js — Zod schemas for tool endpoints.
 */
const { z } = require("zod");
const { TOOL_TYPES, RISK_LEVELS } = require("../utils/constants");

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Must be a valid ID");

// ─── Create Tool ──────────────────────────────────────────────────────────────
const createToolSchema = z.object({
  name: z
    .string({ required_error: "Tool name is required" })
    .trim()
    .min(2, "Tool name must be at least 2 characters")
    .max(100, "Tool name cannot exceed 100 characters"),

  description: z.string().trim().max(500).optional().default(""),

  type: z.enum(Object.values(TOOL_TYPES), {
    errorMap: (issue, ctx) => ({
      message: issue.code === "invalid_type" && ctx.data === undefined
        ? "Tool type is required"
        : `Type must be one of: ${Object.values(TOOL_TYPES).join(", ")}`,
    }),
  }),

  riskLevel: z.enum(Object.values(RISK_LEVELS), {
    errorMap: (issue, ctx) => ({
      message: issue.code === "invalid_type" && ctx.data === undefined
        ? "Risk level is required"
        : `Risk level must be one of: ${Object.values(RISK_LEVELS).join(", ")}`,
    }),
  }),

  allowedActions: z
    .array(z.string().trim().min(1).toUpperCase())
    .min(1, "At least one allowed action is required"),

  configuration: z.record(z.unknown()).optional().default({}),
  // Note: no credentials in configuration — validated by comment in model,
  // but future phases can add a key-blocklist check here.

  metadata: z.record(z.unknown()).optional().default({}),
});

// ─── Update Tool ──────────────────────────────────────────────────────────────
const updateToolSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2)
      .max(100)
      .optional(),

    description: z.string().trim().max(500).optional(),

    riskLevel: z
      .enum(Object.values(RISK_LEVELS), {
        errorMap: () => ({
          message: `Risk level must be one of: ${Object.values(RISK_LEVELS).join(", ")}`,
        }),
      })
      .optional(),

    allowedActions: z
      .array(z.string().trim().min(1).toUpperCase())
      .min(1)
      .optional(),

    isActive: z.boolean().optional(),

    configuration: z.record(z.unknown()).optional(),
    metadata: z.record(z.unknown()).optional(),
    // Note: type is intentionally NOT updatable — changing tool type would
    // invalidate policies and risk profiles that reference it. Create a new tool instead.
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Update payload must contain at least one field",
  });

// ─── Tool ID param ────────────────────────────────────────────────────────────
const toolIdSchema = z.object({
  id: objectIdSchema,
});

module.exports = { createToolSchema, updateToolSchema, toolIdSchema };
