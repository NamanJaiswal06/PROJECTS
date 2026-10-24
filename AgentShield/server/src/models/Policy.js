/**
 * Policy.js — Represents an administrator-defined security rule.
 *
 * Why it exists:
 *   Hard-coded security logic breaks every time the threat model changes.
 *   Configurable policies let administrators define security rules that
 *   AgentShield evaluates at runtime — without redeploying the backend.
 *
 *   Examples of policies:
 *   - "All DELETE actions require human approval"
 *   - "Agents cannot send email to external domains"
 *   - "Financial transfers above ₹10,000 are blocked"
 *   - "Bulk operations affecting more than 100 records require approval"
 *   - "Credential access is blocked for all agents"
 *
 * Policy evaluation model:
 *   A policy MATCHES an action if:
 *     1. The policy is enabled
 *     2. The policy scope includes this agent/tool/action (or is global)
 *     3. ALL conditions evaluate to true
 *
 *   When a policy matches, its `effect` (ALLOW/BLOCK/REQUIRE_APPROVAL)
 *   is applied. If multiple policies match, the strictest effect wins:
 *   BLOCK > REQUIRE_APPROVAL > ALLOW
 *
 * Fields:
 *   name                — Display name. Required. Unique.
 *   description         — Human-readable explanation. Important for approvers
 *                         who need to understand why an action is flagged.
 *   enabled             — Toggle without deleting. Disabled policies are skipped.
 *   priority            — Higher number = evaluated first. When two policies
 *                         conflict, higher priority wins (but strictest effect
 *                         still overrides — priority only matters for ordering).
 *   conditions          — Array of condition objects (see sub-schema).
 *                         ALL conditions must match (logical AND).
 *                         If you need OR logic, create multiple policies.
 *   effect              — What to do when all conditions match.
 *   appliesToAgents     — If non-empty, policy only applies to these agent IDs.
 *                         Empty = applies to all agents.
 *   appliesToTools      — If non-empty, policy only applies to actions on these tools.
 *                         Empty = applies to all tools.
 *   appliesToActionTypes— If non-empty, policy only applies to these action types.
 *                         Empty = applies to all action types.
 *   createdBy           — Who created this policy (audit trail).
 *   updatedBy           — Who last modified it.
 *
 * Condition schema:
 *   field    — Dot-notation path into the SecurityContext.
 *              Examples: "action.parameters.count", "tool.riskLevel",
 *                        "resource.reversible", "agent.permissions"
 *   operator — Comparison: eq, ne, gt, gte, lt, lte, in, nin, contains, exists
 *   value    — What to compare against. Can be string, number, boolean, array.
 *
 * Indexes:
 *   enabled + priority — The policy engine loads: Policy.find({ enabled: true }).sort({ priority: -1 })
 *   createdBy          — "Show me all policies created by this admin"
 *
 * Example document:
 *   {
 *     name: "Bulk Delete Protection",
 *     description: "Any deletion affecting 100+ records requires approval",
 *     enabled: true,
 *     priority: 100,
 *     conditions: [
 *       { field: "action.type", operator: "contains", value: "DELETE" },
 *       { field: "action.parameters.count", operator: "gte", value: 100 }
 *     ],
 *     effect: "REQUIRE_APPROVAL",
 *     appliesToAgents: [],
 *     appliesToTools: [],
 *     appliesToActionTypes: []
 *   }
 */
const mongoose = require("mongoose");
const { POLICY_EFFECTS } = require("../utils/constants");

// ─── Supported condition operators ───────────────────────────────────────────
const CONDITION_OPERATORS = [
  "eq",         // field === value
  "ne",         // field !== value
  "gt",         // field > value
  "gte",        // field >= value
  "lt",         // field < value
  "lte",        // field <= value
  "in",         // value.includes(field)   — field is one of [value]
  "nin",        // !value.includes(field)  — field is NOT one of [value]
  "contains",   // field.includes(value)   — field array/string contains value
  "notContains",// !field.includes(value)
  "startsWith", // field.startsWith(value)
  "exists",     // field is not null/undefined (value=true) or is (value=false)
];

// ─── Condition sub-schema ─────────────────────────────────────────────────────
const conditionSchema = new mongoose.Schema(
  {
    field: {
      type: String,
      required: [true, "Condition field is required"],
      trim: true,
      // Examples: "action.parameters.count", "tool.riskLevel", "agent.permissions"
    },

    operator: {
      type: String,
      required: [true, "Condition operator is required"],
      enum: {
        values: CONDITION_OPERATORS,
        message: `Operator must be one of: ${CONDITION_OPERATORS.join(", ")}`,
      },
    },

    value: {
      // Mixed type — can be string, number, boolean, or array.
      // Required; even for `exists` operator you pass true/false.
      type: mongoose.Schema.Types.Mixed,
      required: [true, "Condition value is required"],
    },
  },
  { _id: false }
);

// ─── Main Policy Schema ───────────────────────────────────────────────────────
const policySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Policy name is required"],
      unique: true,
      trim: true,
      minlength: [2, "Policy name must be at least 2 characters"],
      maxlength: [200, "Policy name cannot exceed 200 characters"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
      default: "",
    },

    enabled: {
      type: Boolean,
      default: true,
      // Disable temporarily without deleting. The policy engine skips disabled policies.
    },

    priority: {
      type: Number,
      default: 0,
      min: [0, "Priority must be >= 0"],
      max: [1000, "Priority cannot exceed 1000"],
      // Higher = evaluated first. When priorities are equal, evaluation order
      // is by createdAt (older first). The strictest effect always wins.
    },

    conditions: {
      type: [conditionSchema],
      required: [true, "At least one condition is required"],
      validate: {
        validator: (conds) => conds.length > 0,
        message: "Policy must have at least one condition",
      },
    },

    effect: {
      type: String,
      required: [true, "Policy effect is required"],
      enum: {
        values: Object.values(POLICY_EFFECTS),
        message: `Effect must be one of: ${Object.values(POLICY_EFFECTS).join(", ")}`,
      },
    },

    // Scope: who/what does this policy apply to?
    // Empty arrays mean "applies to everything" (global scope).
    appliesToAgents: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Agent" }],
      default: [],
    },

    appliesToTools: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tool" }],
      default: [],
    },

    appliesToActionTypes: {
      type: [String],
      default: [],
      // e.g., ["DELETE_USERS", "DROP_DATABASE", "TRANSFER_FUNDS"]
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "createdBy is required"],
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// The most critical query: the policy engine runs this on every action evaluation.
policySchema.index({ enabled: 1, priority: -1 });
// Scope-based lookup
policySchema.index({ appliesToAgents: 1 });
policySchema.index({ appliesToTools: 1 });
// Audit query: "show me all policies created by admin X"
policySchema.index({ createdBy: 1 });

// Export the CONDITION_OPERATORS so the validator can use the same list
policySchema.statics.CONDITION_OPERATORS = CONDITION_OPERATORS;

const Policy = mongoose.model("Policy", policySchema);

module.exports = Policy;
