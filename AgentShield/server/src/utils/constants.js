/**
 * constants.js — Centralized definitions for all enum-like values.
 *
 * Why this exists:
 *   Hardcoding strings like "ADMIN", "BLOCK", "HIGH" in multiple files
 *   creates a hidden coupling — if you rename one, you must find all
 *   occurrences manually. Centralizing here means models, services, and
 *   controllers all import from one authoritative source.
 *
 * Rule: Every string that appears in more than one file should be a constant.
 */

// ─── User Roles ───────────────────────────────────────────────────────────────
const USER_ROLES = {
  ADMIN: "ADMIN",     // Full access — can manage policies, agents, approvals
  ANALYST: "ANALYST", // Can view events, approve/reject actions
  VIEWER: "VIEWER",   // Read-only access
};

// ─── Agent Status ─────────────────────────────────────────────────────────────
const AGENT_STATUS = {
  ACTIVE: "ACTIVE",       // Normal operation
  SUSPENDED: "SUSPENDED", // Temporarily disabled — human review required
  DISABLED: "DISABLED",   // Permanently decommissioned
};

// ─── Agent Permissions ────────────────────────────────────────────────────────
// Explicit capability flags. Every agent starts with an empty set.
// Principle: Least privilege — only grant what is needed.
const AGENT_PERMISSIONS = {
  READ_DOCUMENT: "READ_DOCUMENT",
  WRITE_DOCUMENT: "WRITE_DOCUMENT",
  READ_DATABASE: "READ_DATABASE",
  WRITE_DATABASE: "WRITE_DATABASE",
  DELETE_DATABASE: "DELETE_DATABASE",
  SEND_EMAIL: "SEND_EMAIL",
  EXTERNAL_API_CALL: "EXTERNAL_API_CALL",
  TRANSFER_FUNDS: "TRANSFER_FUNDS",
  ACCESS_CREDENTIALS: "ACCESS_CREDENTIALS",
  READ_CALENDAR: "READ_CALENDAR",
  WRITE_CALENDAR: "WRITE_CALENDAR",
  BROWSE_WEB: "BROWSE_WEB",
  READ_FILE: "READ_FILE",
  WRITE_FILE: "WRITE_FILE",
  DELETE_FILE: "DELETE_FILE",
};

// ─── Tool Types ───────────────────────────────────────────────────────────────
const TOOL_TYPES = {
  DATABASE: "DATABASE",
  EMAIL: "EMAIL",
  FILE_STORAGE: "FILE_STORAGE",
  HTTP_API: "HTTP_API",
  CALENDAR: "CALENDAR",
  PAYMENT: "PAYMENT",
  BROWSER: "BROWSER",
  OTHER: "OTHER",
};

// ─── Tool Risk Levels ─────────────────────────────────────────────────────────
const RISK_LEVELS = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
};

// ─── Policy Effects ───────────────────────────────────────────────────────────
const POLICY_EFFECTS = {
  ALLOW: "ALLOW",
  BLOCK: "BLOCK",
  REQUIRE_APPROVAL: "REQUIRE_APPROVAL",
};

// ─── Decision Outcomes ────────────────────────────────────────────────────────
const DECISIONS = {
  ALLOW: "ALLOW",
  BLOCK: "BLOCK",
  REQUIRE_APPROVAL: "REQUIRE_APPROVAL",
};

// ─── Action Status ────────────────────────────────────────────────────────────
const ACTION_STATUS = {
  PENDING: "PENDING",       // Awaiting evaluation
  EVALUATED: "EVALUATED",   // Evaluation complete
  EXECUTED: "EXECUTED",     // Authorized and executed
  BLOCKED: "BLOCKED",       // Blocked by security engine
};

// ─── Approval Status ──────────────────────────────────────────────────────────
const APPROVAL_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  EXPIRED: "EXPIRED",
};

// ─── Security Event Types ─────────────────────────────────────────────────────
const SECURITY_EVENT_TYPES = {
  HIGH_RISK_ACTION: "HIGH_RISK_ACTION",
  POLICY_VIOLATION: "POLICY_VIOLATION",
  PROMPT_INJECTION: "PROMPT_INJECTION",
  DATA_EXFILTRATION: "DATA_EXFILTRATION",
  ANOMALOUS_BEHAVIOR: "ANOMALOUS_BEHAVIOR",
  PRIVILEGE_ESCALATION: "PRIVILEGE_ESCALATION",
  UNAUTHORIZED_ACTION: "UNAUTHORIZED_ACTION",
};

// ─── Security Event Severity ──────────────────────────────────────────────────
const SEVERITY = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
};

// ─── Audit Event Types ────────────────────────────────────────────────────────
const AUDIT_EVENTS = {
  // Auth
  USER_REGISTERED: "USER_REGISTERED",
  USER_LOGIN: "USER_LOGIN",
  USER_LOGOUT: "USER_LOGOUT",
  // Agents
  AGENT_CREATED: "AGENT_CREATED",
  AGENT_UPDATED: "AGENT_UPDATED",
  AGENT_SUSPENDED: "AGENT_SUSPENDED",
  AGENT_DELETED: "AGENT_DELETED",
  // Policies
  POLICY_CREATED: "POLICY_CREATED",
  POLICY_UPDATED: "POLICY_UPDATED",
  POLICY_DELETED: "POLICY_DELETED",
  // Actions
  ACTION_EVALUATED: "ACTION_EVALUATED",
  ACTION_ALLOWED: "ACTION_ALLOWED",
  ACTION_BLOCKED: "ACTION_BLOCKED",
  ACTION_EXECUTED: "ACTION_EXECUTED",
  // Approvals
  APPROVAL_CREATED: "APPROVAL_CREATED",
  APPROVAL_APPROVED: "APPROVAL_APPROVED",
  APPROVAL_REJECTED: "APPROVAL_REJECTED",
  APPROVAL_EXPIRED: "APPROVAL_EXPIRED",
};

// ─── ML Service Modes ─────────────────────────────────────────────────────────
const ML_MODES = {
  MOCK: "MOCK",   // Use local mock — for development before ML team delivers
  HTTP: "HTTP",   // Call real Python ML service over HTTP
};

// ─── Risk Thresholds (defaults — can be overridden by env vars) ───────────────
const DEFAULT_RISK_THRESHOLDS = {
  APPROVAL: 60, // Score >= this → REQUIRE_APPROVAL
  BLOCK: 80,    // Score >= this → BLOCK
};

// ─── Sensitive Actions (default deny unless explicitly authorized) ─────────────
const SENSITIVE_ACTIONS = new Set([
  "DELETE_USERS",
  "DROP_DATABASE",
  "DELETE_DATABASE",
  "TRANSFER_FUNDS",
  "ACCESS_CREDENTIALS",
  "EXPORT_CUSTOMERS",
  "CHANGE_PERMISSIONS",
  "GRANT_ADMIN",
]);

module.exports = {
  USER_ROLES,
  AGENT_STATUS,
  AGENT_PERMISSIONS,
  TOOL_TYPES,
  RISK_LEVELS,
  POLICY_EFFECTS,
  DECISIONS,
  ACTION_STATUS,
  APPROVAL_STATUS,
  SECURITY_EVENT_TYPES,
  SEVERITY,
  AUDIT_EVENTS,
  ML_MODES,
  DEFAULT_RISK_THRESHOLDS,
  SENSITIVE_ACTIONS,
};
