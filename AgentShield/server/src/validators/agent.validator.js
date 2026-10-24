/**
 * agent.validator.js — Zod schemas for agent endpoints.
 *
 * Design decisions:
 *   - permissions is validated against the AGENT_PERMISSIONS constant set.
 *     Unknown permission strings are rejected, not silently dropped.
 *   - toolIds must be valid MongoDB ObjectId strings. The service layer
 *     additionally verifies the referenced Tool documents actually exist.
 *   - riskProfile fields are optional with sensible defaults.
 *   - status is NOT accepted on create — new agents always start ACTIVE.
 *   - status IS accepted on update (for suspend/activate operations).
 */
const { z } = require("zod");
const { AGENT_PERMISSIONS, AGENT_STATUS, RISK_LEVELS } = require("../utils/constants");

// MongoDB ObjectId pattern (24 hex characters)
const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Must be a valid ID");

const riskProfileSchema = z
  .object({
    baseRiskLevel: z
      .enum(Object.values(RISK_LEVELS), {
        errorMap: () => ({
          message: `baseRiskLevel must be one of: ${Object.values(RISK_LEVELS).join(", ")}`,
        }),
      })
      .optional(),
    maxActionsPerHour: z
      .number()
      .int()
      .positive("Max actions per hour must be a positive integer")
      .nullable()
      .optional(),
    allowedHours: z
      .object({
        start: z.number().int().min(0).max(23),
        end: z.number().int().min(0).max(23),
      })
      .optional(),
  })
  .optional();

// ─── Create Agent ─────────────────────────────────────────────────────────────
const createAgentSchema = z.object({
  name: z
    .string({ required_error: "Agent name is required" })
    .trim()
    .min(2, "Agent name must be at least 2 characters")
    .max(100, "Agent name cannot exceed 100 characters"),

  description: z.string().trim().max(500).optional().default(""),

  permissions: z
    .array(
      z.enum(Object.values(AGENT_PERMISSIONS), {
        errorMap: () => ({
          message: `Each permission must be one of: ${Object.values(AGENT_PERMISSIONS).join(", ")}`,
        }),
      })
    )
    .optional()
    .default([]),

  toolIds: z.array(objectIdSchema).optional().default([]),

  riskProfile: riskProfileSchema,

  metadata: z.record(z.unknown()).optional().default({}),
  // Note: status is NOT accepted here — new agents always start ACTIVE.
  // Note: owner is NOT accepted here — set from req.user in the service.
});

// ─── Update Agent ─────────────────────────────────────────────────────────────
const updateAgentSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Agent name must be at least 2 characters")
      .max(100, "Agent name cannot exceed 100 characters")
      .optional(),

    description: z.string().trim().max(500).optional(),

    status: z
      .enum(Object.values(AGENT_STATUS), {
        errorMap: () => ({
          message: `Status must be one of: ${Object.values(AGENT_STATUS).join(", ")}`,
        }),
      })
      .optional(),

    permissions: z
      .array(
        z.enum(Object.values(AGENT_PERMISSIONS), {
          errorMap: () => ({
            message: `Each permission must be one of: ${Object.values(AGENT_PERMISSIONS).join(", ")}`,
          }),
        })
      )
      .optional(),

    toolIds: z.array(objectIdSchema).optional(),

    riskProfile: riskProfileSchema,

    metadata: z.record(z.unknown()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Update payload must contain at least one field",
  });

// ─── Agent ID param ───────────────────────────────────────────────────────────
const agentIdSchema = z.object({
  id: objectIdSchema,
});

module.exports = { createAgentSchema, updateAgentSchema, agentIdSchema };
