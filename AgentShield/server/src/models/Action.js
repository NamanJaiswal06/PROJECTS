/**
 * Action.js — Immutable audit record for every action evaluation.
 *
 * Why it exists:
 *   Every time an AI agent asks "can I do X?", AgentShield evaluates it
 *   and writes the result here. This creates a permanent, tamper-evident
 *   audit trail. You can always answer: "who did what, when, and why was
 *   it allowed or blocked?"
 *
 *   This is also the data source for:
 *   - The real-time security dashboard (Phase 8)
 *   - Anomaly detection training data (Phase 10)
 *   - Compliance reports
 *
 * Why it is immutable:
 *   Action records must NEVER be edited after creation. A mutable audit log
 *   is not an audit log — it can be tampered with to hide malicious behavior.
 *   The schema enforces this via the service layer (no updateAction function).
 *
 * Fields:
 *   agentId          — Which agent requested the action
 *   toolId           — Which tool they wanted to use
 *   requestedBy      — The human user who invoked this agent (optional — some
 *                      agents run autonomously without a direct user trigger)
 *   actionType       — The verb (e.g., "DELETE_USERS", "SEND_EMAIL")
 *   parameters       — What the action would do (snapshot at evaluation time)
 *   reason           — Why the agent claims to need this action
 *   context          — The resource context: sensitivity, record count, etc.
 *
 *   decision         — The final verdict: ALLOW / BLOCK / REQUIRE_APPROVAL
 *   decisionReason   — A human-readable explanation for the decision
 *
 *   hardCheckResult  — Which hard check triggered first (if any)
 *   policyResult     — What the policy engine returned (matched policies, effect)
 *   riskScore        — 0–100 risk score computed at evaluation time
 *
 *   approvalStatus   — Only relevant when decision = REQUIRE_APPROVAL
 *   approvedBy       — Who approved/rejected it
 *   approvedAt       — When it was decided
 *   approvalNote     — Human note from the approver
 *
 *   evaluatedAt      — When evaluation ran (for audit ordering)
 *   processingTimeMs — How long the evaluation took (performance monitoring)
 *
 * Indexes:
 *   agentId          — "Show me all actions from this agent"
 *   decision         — "Show me all blocked actions"
 *   approvalStatus   — "Show me all pending approvals"
 *   evaluatedAt desc — "Show me recent actions"
 *   compound(agentId, evaluatedAt) — most common dashboard query pattern
 */
const mongoose = require("mongoose");
const { DECISIONS, APPROVAL_STATUS } = require("../utils/constants");

// ─── Hard-check result sub-schema ─────────────────────────────────────────────
const hardCheckResultSchema = new mongoose.Schema(
  {
    passed: { type: Boolean, required: true },
    reason: { type: String, default: "" },
    // Which specific check blocked (if passed=false):
    // "AGENT_NOT_ACTIVE" | "AGENT_MISSING_TOOL" | "TOOL_INACTIVE" |
    // "ACTION_NOT_ALLOWED" | null
    failedCheck: { type: String, default: null },
  },
  { _id: false }
);

// ─── Policy violation sub-schema (mirrors policyEngine result) ────────────────
const violationSchema = new mongoose.Schema(
  {
    policyId: { type: String, required: true },
    policyName: { type: String, required: true },
    effect: { type: String, required: true },
    priority: { type: Number },
    reason: { type: String },
  },
  { _id: false }
);

const policyResultSchema = new mongoose.Schema(
  {
    matched: { type: Boolean, required: true },
    violations: { type: [violationSchema], default: [] },
    highestEffect: { type: String },
    evaluatedCount: { type: Number, default: 0 },
  },
  { _id: false }
);

// ─── Main Action Schema ───────────────────────────────────────────────────────
const actionSchema = new mongoose.Schema(
  {
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agent",
      required: [true, "agentId is required"],
    },

    toolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tool",
      required: [true, "toolId is required"],
    },

    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      // null for autonomous agent runs without a human trigger
    },

    actionType: {
      type: String,
      required: [true, "actionType is required"],
      trim: true,
      uppercase: true,
    },

    parameters: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    reason: {
      type: String,
      trim: true,
      default: "No reason provided",
    },

    // Resource context snapshot at evaluation time
    context: {
      resource: { type: mongoose.Schema.Types.Mixed, default: {} },
    },

    // ─── Decision ────────────────────────────────────────────────────────────
    decision: {
      type: String,
      required: [true, "decision is required"],
      enum: {
        values: Object.values(DECISIONS),
        message: `Decision must be one of: ${Object.values(DECISIONS).join(", ")}`,
      },
    },

    decisionReason: {
      type: String,
      default: "",
    },

    hardCheckResult: {
      type: hardCheckResultSchema,
      default: null,
    },

    policyResult: {
      type: policyResultSchema,
      default: null,
    },

    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    // ─── Approval workflow (Phase 6) ─────────────────────────────────────────
    approvalStatus: {
      type: String,
      enum: {
        values: [...Object.values(APPROVAL_STATUS), null],
        message: `Approval status must be one of: ${Object.values(APPROVAL_STATUS).join(", ")}`,
      },
      default: null,
      // Set to PENDING when decision = REQUIRE_APPROVAL
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    approvalNote: {
      type: String,
      default: null,
    },

    // ─── Performance tracking ─────────────────────────────────────────────────
    evaluatedAt: {
      type: Date,
      default: Date.now,
    },

    processingTimeMs: {
      type: Number,
      default: 0,
    },
  },
  {
    // No timestamps: true — we control evaluatedAt manually.
    // updatedAt would suggest mutability; Action records are immutable post-creation.
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
actionSchema.index({ agentId: 1 });
actionSchema.index({ toolId: 1 });
actionSchema.index({ decision: 1 });
actionSchema.index({ approvalStatus: 1 });
actionSchema.index({ evaluatedAt: -1 });
actionSchema.index({ agentId: 1, evaluatedAt: -1 }); // most common dashboard query

const Action = mongoose.model("Action", actionSchema);

module.exports = Action;
