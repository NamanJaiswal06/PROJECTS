/**
 * Tool.js — Represents a tool that AI agents can use through AgentShield.
 *
 * Why it exists:
 *   AgentShield needs a registry of every tool an agent might access —
 *   databases, email systems, file stores, payment APIs, etc. When an
 *   action evaluation request arrives, we look up the tool to determine:
 *   - What risk level does this tool carry? (database = HIGH, calendar = LOW)
 *   - Is this action type allowed on this tool? (SELECT is fine; DROP is not)
 *   - Is this tool currently active?
 *
 *   The Tool document is a key input to both the context builder and the
 *   risk engine. A "delete" action on a LOW-risk tool is very different
 *   from a "delete" on a HIGH-risk tool.
 *
 * Fields:
 *   name           — Unique identifier. e.g., "Production PostgreSQL", "SendGrid".
 *   description    — What this tool is and does. Helps human approvers understand context.
 *   type           — Broad category (DATABASE, EMAIL, PAYMENT, etc.).
 *                    Used by the risk engine and policy conditions.
 *   riskLevel      — Inherent risk: LOW / MEDIUM / HIGH / CRITICAL.
 *                    Even a "read" on a CRITICAL tool (e.g., credentials store)
 *                    gets extra scrutiny.
 *   allowedActions — Explicit list of action verbs permitted on this tool.
 *                    If an agent tries an action not in this list, it is blocked
 *                    before even reaching the policy engine.
 *                    Example: ["SELECT", "INSERT"] — no UPDATE or DELETE.
 *   isActive       — Soft-disable. A deactivated tool rejects all requests.
 *   configuration  — Tool-specific settings (endpoint URL, region, etc.)
 *                    NEVER store credentials here. Use a secrets manager.
 *   metadata       — Free-form store for integration details.
 *
 * Security considerations:
 *   - allowedActions is a whitelist. Anything not listed is implicitly blocked.
 *   - riskLevel feeds directly into the risk engine score.
 *   - Deactivating a tool (isActive = false) is an emergency kill-switch —
 *     all future requests to this tool are immediately rejected.
 *   - Never store API keys, connection strings, or credentials in this document.
 *
 * Indexes:
 *   type      — Common filter: "Show me all DATABASE tools".
 *   riskLevel — Risk dashboard queries: "Show all HIGH-risk tools".
 *   isActive  — Quickly filter active tools for dropdowns and validation.
 *
 * Example document:
 *   {
 *     _id: ObjectId("..."),
 *     name: "Production PostgreSQL",
 *     description: "Main customer database",
 *     type: "DATABASE",
 *     riskLevel: "HIGH",
 *     allowedActions: ["SELECT", "INSERT", "UPDATE"],
 *     isActive: true,
 *     configuration: { host: "db.internal", port: 5432, database: "customers" },
 *     metadata: { environment: "production", region: "us-east-1" },
 *     createdAt: ISODate("2024-01-01T00:00:00Z"),
 *     updatedAt: ISODate("2024-01-15T10:00:00Z")
 *   }
 */
const mongoose = require("mongoose");
const { TOOL_TYPES, RISK_LEVELS } = require("../utils/constants");

const toolSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tool name is required"],
      trim: true,
      unique: true,
      minlength: [2, "Tool name must be at least 2 characters"],
      maxlength: [100, "Tool name cannot exceed 100 characters"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },

    type: {
      type: String,
      required: [true, "Tool type is required"],
      enum: {
        values: Object.values(TOOL_TYPES),
        message: `Type must be one of: ${Object.values(TOOL_TYPES).join(", ")}`,
      },
    },

    riskLevel: {
      type: String,
      required: [true, "Risk level is required"],
      enum: {
        values: Object.values(RISK_LEVELS),
        message: `Risk level must be one of: ${Object.values(RISK_LEVELS).join(", ")}`,
      },
    },

    allowedActions: {
      type: [String],
      required: [true, "At least one allowed action is required"],
      validate: {
        validator: (actions) => actions.length > 0,
        message: "allowedActions must contain at least one action",
      },
      // Examples: ["SELECT", "INSERT"] for a database
      //           ["SEND", "READ_INBOX"] for email
      //           ["TRANSFER", "BALANCE_CHECK"] for payment
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // Tool-specific configuration: connection details, endpoints, etc.
    // CRITICAL: Do NOT store passwords, API keys, or tokens here.
    // This field is for non-sensitive configuration (host, port, region).
    configuration: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
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
toolSchema.index({ type: 1 });
toolSchema.index({ riskLevel: 1 });
toolSchema.index({ isActive: 1 });
toolSchema.index({ type: 1, riskLevel: 1 }); // Risk dashboard: "HIGH-risk DATABASE tools"

// ─── Instance Methods ─────────────────────────────────────────────────────────

/**
 * Check if a given action verb is allowed on this tool.
 * Used by the action gateway as a whitelist check.
 * @param {string} action
 * @returns {boolean}
 */
toolSchema.methods.isActionAllowed = function (action) {
  return this.allowedActions.includes(action.toUpperCase());
};

const Tool = mongoose.model("Tool", toolSchema);

module.exports = Tool;
