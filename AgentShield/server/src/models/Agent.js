/**
 * Agent.js — Represents an AI agent registered with AgentShield.
 *
 * Why it exists:
 *   Every AI agent that wants to use tools through AgentShield must first
 *   be registered. Registration gives AgentShield a permanent record of:
 *   - What the agent is allowed to do (permissions)
 *   - What tools it can access (toolIds)
 *   - How risky it is by default (riskProfile)
 *   - Its behavioral history (populated by the behavior service in Phase 9)
 *
 *   When an action evaluation request arrives, the first thing the context
 *   builder does is load this Agent document to answer: "who is this agent
 *   and what is it allowed to do?"
 *
 * Fields:
 *   name         — Human-readable display name. Required. Unique.
 *   description  — What this agent does. Important for human reviewers
 *                  evaluating approval requests.
 *   owner        — Reference to the User who registered/manages this agent.
 *                  Required. Used for access-scoping (admins see all agents,
 *                  analysts see agents they own).
 *   status       — ACTIVE, SUSPENDED, DISABLED.
 *                  SUSPENDED = human review needed, can't act.
 *                  DISABLED  = decommissioned, permanent.
 *   permissions  — Explicit capability flags. This is the core of least-privilege.
 *                  An agent with no DELETE_DATABASE permission cannot perform
 *                  DELETE_DATABASE regardless of what any policy says.
 *                  Permissions must be granted deliberately — no wildcards.
 *   toolIds      — The tools this agent is authorized to use. An agent
 *                  requesting a tool it's not linked to is immediately blocked.
 *   riskProfile  — Static configuration that affects how the risk engine
 *                  scores this agent's actions (see sub-schema below).
 *   metadata     — Free-form key-value store for integrations (e.g., external
 *                  agent ID, model name, deployment environment).
 *   lastSeenAt   — Updated whenever the agent successfully evaluates an action.
 *                  Useful for detecting stale/unused agents.
 *
 * Security considerations:
 *   - permissions is enforced deterministically by the action gateway (Phase 5).
 *     Even if a policy says ALLOW, missing permission = BLOCK.
 *   - status SUSPENDED blocks all actions from this agent.
 *   - toolIds prevents an agent from accessing tools it was never assigned.
 *
 * Indexes:
 *   owner    — "Show me all agents I own" is a very common query.
 *   status   — "Show me all active agents" / "Show me all suspended agents".
 *   compound (owner + status) — the most common admin query pattern.
 *
 * Relationships:
 *   owner  → User._id
 *   toolIds → Tool._id[]
 *   Action.agentId → Agent._id
 *   AgentBehavior.agentId → Agent._id
 *
 * Example document:
 *   {
 *     _id: ObjectId("..."),
 *     name: "CustomerSupportBot",
 *     description: "Handles customer queries and creates tickets",
 *     owner: ObjectId("user_123"),
 *     status: "ACTIVE",
 *     permissions: ["READ_DATABASE", "WRITE_DATABASE", "SEND_EMAIL"],
 *     toolIds: [ObjectId("tool_postgres"), ObjectId("tool_sendgrid")],
 *     riskProfile: {
 *       baseRiskLevel: "MEDIUM",
 *       maxActionsPerHour: 100,
 *       allowedHours: { start: 8, end: 20 }
 *     },
 *     metadata: { model: "gpt-4", environment: "production" },
 *     lastSeenAt: ISODate("2024-01-15T14:30:00Z"),
 *     createdAt: ISODate("2024-01-01T00:00:00Z"),
 *     updatedAt: ISODate("2024-01-15T14:30:00Z")
 *   }
 */
const mongoose = require("mongoose");
const { AGENT_STATUS, AGENT_PERMISSIONS, RISK_LEVELS } = require("../utils/constants");

// ─── Risk Profile Sub-schema ──────────────────────────────────────────────────
// Governs how the risk engine treats this agent's actions by default.
const riskProfileSchema = new mongoose.Schema(
  {
    baseRiskLevel: {
      type: String,
      enum: Object.values(RISK_LEVELS),
      default: RISK_LEVELS.LOW,
      // The risk engine uses this as a starting multiplier.
      // A "HIGH" base risk agent gets more scrutiny even for routine actions.
    },

    maxActionsPerHour: {
      type: Number,
      default: null, // null = no limit
      min: [1, "Max actions per hour must be at least 1"],
    },

    // Optional time window restriction: agent can only act between these hours (UTC).
    // Example: { start: 9, end: 17 } = business hours only.
    allowedHours: {
      start: { type: Number, min: 0, max: 23, default: null },
      end: { type: Number, min: 0, max: 23, default: null },
    },
  },
  { _id: false } // No separate _id for the sub-document
);

// ─── Main Agent Schema ────────────────────────────────────────────────────────
const agentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Agent name is required"],
      trim: true,
      unique: true,
      minlength: [2, "Agent name must be at least 2 characters"],
      maxlength: [100, "Agent name cannot exceed 100 characters"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Agent must have an owner"],
      // owner is required so we always know who is responsible for this agent.
    },

    status: {
      type: String,
      enum: {
        values: Object.values(AGENT_STATUS),
        message: `Status must be one of: ${Object.values(AGENT_STATUS).join(", ")}`,
      },
      default: AGENT_STATUS.ACTIVE,
    },

    permissions: {
      type: [String],
      // Each value must be a valid permission from our constants.
      validate: {
        validator: function (perms) {
          const valid = new Set(Object.values(AGENT_PERMISSIONS));
          return perms.every((p) => valid.has(p));
        },
        message: "One or more permissions are invalid",
      },
      default: [],
      // Default is empty — no permissions. Principle of least privilege.
      // Every permission must be explicitly granted.
    },

    toolIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tool" }],
      default: [],
      // The set of tools this agent is authorized to use.
      // An agent requesting a tool not in this list is blocked before policies run.
    },

    riskProfile: {
      type: riskProfileSchema,
      default: () => ({}),
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      // Free-form store. Examples: { model: "gpt-4o", region: "us-east-1" }
      // IMPORTANT: Never store secrets here. Use a secrets manager instead.
    },

    lastSeenAt: {
      type: Date,
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
agentSchema.index({ owner: 1 });
agentSchema.index({ status: 1 });
agentSchema.index({ owner: 1, status: 1 }); // Most common admin query

// ─── Instance Methods ─────────────────────────────────────────────────────────

/**
 * Check if this agent has a specific permission.
 * Used by the action gateway for quick permission checks.
 * @param {string} permission
 * @returns {boolean}
 */
agentSchema.methods.hasPermission = function (permission) {
  return this.permissions.includes(permission);
};

/**
 * Check if this agent has access to a specific tool.
 * @param {string|ObjectId} toolId
 * @returns {boolean}
 */
agentSchema.methods.hasTool = function (toolId) {
  return this.toolIds.some((id) => id.toString() === toolId.toString());
};

/**
 * Check if the agent is currently active.
 * @returns {boolean}
 */
agentSchema.methods.isOperational = function () {
  return this.status === AGENT_STATUS.ACTIVE;
};

const Agent = mongoose.model("Agent", agentSchema);

module.exports = Agent;
