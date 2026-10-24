/**
 * action.validator.js — Zod schemas for action evaluation requests.
 *
 * Critical security rules enforced here:
 *   - riskScore is NOT accepted from the client (computed server-side)
 *   - decision is NOT accepted from the client (determined by the engine)
 *   - requestedBy is NOT accepted from the client (set from req.user)
 *   - actionType is normalized to UPPERCASE
 *   - resource fields are optional (not all actions have resource context)
 */
const { z } = require("zod");
const { RISK_LEVELS } = require("../utils/constants");

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Must be a valid ID");

// ─── Evaluate Action ──────────────────────────────────────────────────────────
const evaluateActionSchema = z.object({
  agentId: z
    .string({ required_error: "agentId is required" })
    .regex(/^[0-9a-fA-F]{24}$/, "agentId must be a valid ID"),

  toolId: z
    .string({ required_error: "toolId is required" })
    .regex(/^[0-9a-fA-F]{24}$/, "toolId must be a valid ID"),

  actionType: z
    .string({ required_error: "actionType is required" })
    .trim()
    .min(1, "actionType cannot be empty")
    .max(100, "actionType cannot exceed 100 characters")
    .toUpperCase(),
  // Normalized to uppercase: "delete_users" → "DELETE_USERS"

  parameters: z.record(z.unknown()).optional().default({}),
  // e.g., { count: 12000, filter: "inactive=true" }
  // The policy engine accesses these as action.parameters.count

  reason: z
    .string()
    .trim()
    .max(500, "Reason cannot exceed 500 characters")
    .optional()
    .default("No reason provided"),
  // Why the agent claims to need this action.
  // Used by human approvers when reviewing REQUIRE_APPROVAL decisions.

  // Resource context: optional metadata about what will be affected.
  // NOT everything needs to be provided — omitted fields default to null.
  // The policy engine uses dot-notation to access these as resource.*
  resource: z
    .object({
      sensitivity: z
        .enum(Object.values(RISK_LEVELS), {
          errorMap: () => ({
            message: `sensitivity must be one of: ${Object.values(RISK_LEVELS).join(", ")}`,
          }),
        })
        .optional()
        .nullable(),
      // LOW/MEDIUM/HIGH/CRITICAL — how sensitive is the data being acted on

      recordCount: z
        .number()
        .int("recordCount must be an integer")
        .nonnegative("recordCount must be >= 0")
        .optional()
        .nullable(),
      // How many records will be affected? Used for bulk-operation policies.

      reversible: z.boolean().optional().nullable(),
      // Can this action be undone? False = higher risk score

      destination: z
        .enum(["internal", "external"])
        .optional()
        .nullable(),
      // "external" triggers data-exfiltration policies
    })
    .optional()
    .default({}),

  // NOTE: The following are NEVER accepted from the client:
  //   - riskScore    → computed by the risk scorer
  //   - decision     → determined by the evaluation engine
  //   - requestedBy  → set from req.user._id in the controller
  //   - approvalStatus → set by the engine based on decision
});

// ─── List Actions (query params) ──────────────────────────────────────────────
const listActionsQuerySchema = z.object({
  agentId: objectIdSchema.optional(),
  toolId: objectIdSchema.optional(),
  decision: z
    .enum(["ALLOW", "BLOCK", "REQUIRE_APPROVAL"])
    .optional(),
  approvalStatus: z
    .enum(["PENDING", "APPROVED", "REJECTED", "EXPIRED"])
    .optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

// ─── Action ID param ──────────────────────────────────────────────────────────
const actionIdSchema = z.object({
  id: objectIdSchema,
});

module.exports = { evaluateActionSchema, listActionsQuerySchema, actionIdSchema };
