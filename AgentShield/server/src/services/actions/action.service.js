/**
 * action.service.js — The Action Evaluation Pipeline.
 *
 * This is the core of AgentShield. Every agent action flows through here.
 *
 * ─── Pipeline ─────────────────────────────────────────────────────────────────
 *
 *   evaluate(request, requestedByUserId):
 *
 *   HARD CHECKS (synchronous, immediate BLOCK if any fail):
 *   1. Load agent → must exist and be ACTIVE
 *   2. Agent must have the tool in its authorized toolIds
 *   3. Load tool → must exist and be isActive
 *   4. actionType must be in tool.allowedActions (whitelist)
 *
 *   POLICY ENGINE (async, database):
 *   5. Build SecurityContext = { agent, action, tool, resource }
 *   6. evaluatePolicies(context) → { matched, violations, highestEffect }
 *
 *   RISK SCORING (synchronous):
 *   7. computeRiskScore(context) → { score, factors }
 *
 *   FINAL DECISION:
 *   8. If any hard check failed → BLOCK
 *      If policy says BLOCK → BLOCK
 *      If policy says REQUIRE_APPROVAL → REQUIRE_APPROVAL
 *      Otherwise → ALLOW
 *
 *   AUDIT:
 *   9. Create Action record (async, fire-and-forget — does not delay response)
 *   10. Update agent.lastSeenAt (async, fire-and-forget)
 *
 * ─── Response Time ────────────────────────────────────────────────────────────
 *
 *   The critical path is: hard checks (sync) + policy load (1 DB query) +
 *   risk score (sync) = very fast.
 *
 *   The Action write is async. It DOES NOT delay the response. This is
 *   intentional — security decisions should never be blocked waiting for the
 *   audit write. If the audit write fails, we log it but return the decision.
 *
 * ─── Security Contract ────────────────────────────────────────────────────────
 *
 *   This service makes decisions. It does not execute actions.
 *   The AI agent is responsible for acting on the ALLOW decision.
 *   AgentShield is the firewall, not the executor.
 */
const Agent = require("../../models/Agent");
const Tool = require("../../models/Tool");
const Action = require("../../models/Action");
const AppError = require("../../utils/AppError");
const { evaluatePolicies } = require("../policies/policyEngine.service");
const { computeRiskScore } = require("./riskScorer");
const { updateLastSeen } = require("../agents/agent.service");
const { DECISIONS, APPROVAL_STATUS, AGENT_STATUS } = require("../../utils/constants");
const logger = require("../../utils/logger");

// ─── Evaluate ─────────────────────────────────────────────────────────────────

/**
 * Evaluate whether an agent action should be ALLOW / BLOCK / REQUIRE_APPROVAL.
 *
 * @param {object} request          — Validated request body (from Zod)
 * @param {string} requestedByUserId — The authenticated user's ID (req.user._id)
 * @returns {Promise<EvaluationResult>}
 */
const evaluate = async (request, requestedByUserId) => {
  const startTime = Date.now();
  const { agentId, toolId, actionType, parameters, reason, resource } = request;

  // ── STAGE 1: Hard checks ────────────────────────────────────────────────────
  // These checks are deterministic and override everything else.
  // No policy can override a hard block.

  // 1a. Load and validate agent
  const agent = await Agent.findById(agentId);

  if (!agent) {
    return _buildBlockedResult(
      "AGENT_NOT_FOUND",
      `Agent ${agentId} does not exist`,
      request, requestedByUserId, startTime, null, null
    );
  }

  if (agent.status !== AGENT_STATUS.ACTIVE) {
    return _buildBlockedResult(
      "AGENT_NOT_ACTIVE",
      `Agent is ${agent.status} — only ACTIVE agents can perform actions`,
      request, requestedByUserId, startTime, agent, null
    );
  }

  // 1b. Agent must have this tool in its authorized toolIds
  if (!agent.hasTool(toolId)) {
    return _buildBlockedResult(
      "AGENT_MISSING_TOOL",
      `Agent is not authorized to use tool ${toolId}`,
      request, requestedByUserId, startTime, agent, null
    );
  }

  // 1c. Load and validate tool
  const tool = await Tool.findById(toolId);

  if (!tool) {
    return _buildBlockedResult(
      "TOOL_NOT_FOUND",
      `Tool ${toolId} does not exist`,
      request, requestedByUserId, startTime, agent, null
    );
  }

  if (!tool.isActive) {
    return _buildBlockedResult(
      "TOOL_INACTIVE",
      `Tool "${tool.name}" is deactivated and cannot be used`,
      request, requestedByUserId, startTime, agent, tool
    );
  }

  // 1d. actionType must be in the tool's allowedActions whitelist
  if (!tool.isActionAllowed(actionType)) {
    return _buildBlockedResult(
      "ACTION_NOT_ALLOWED",
      `Action "${actionType}" is not in the allowed actions for tool "${tool.name}". Allowed: ${tool.allowedActions.join(", ")}`,
      request, requestedByUserId, startTime, agent, tool
    );
  }

  // ── STAGE 2: Build SecurityContext ──────────────────────────────────────────
  // This is the input to the policy engine. It contains a snapshot of all
  // relevant state at evaluation time.
  const securityContext = {
    agent: {
      _id: agent._id,
      permissions: agent.permissions,
      status: agent.status,
      riskProfile: agent.riskProfile,
    },
    user: { _id: requestedByUserId },
    action: {
      type: actionType,
      tool: tool.name,
      parameters: parameters || {},
      reason,
    },
    tool: {
      _id: tool._id,
      type: tool.type,
      riskLevel: tool.riskLevel,
      allowedActions: tool.allowedActions,
    },
    resource: resource || {},
  };

  // ── STAGE 3: Policy engine ──────────────────────────────────────────────────
  const policyResult = await evaluatePolicies(securityContext);

  // ── STAGE 4: Risk scoring ───────────────────────────────────────────────────
  const { score: riskScore, factors: riskFactors } = computeRiskScore(securityContext);

  // ── STAGE 5: Final decision ─────────────────────────────────────────────────
  let decision = DECISIONS.ALLOW;
  let decisionReason = "No matching policies — action is permitted";

  if (policyResult.highestEffect === DECISIONS.BLOCK) {
    decision = DECISIONS.BLOCK;
    const blockedBy = policyResult.violations
      .filter((v) => v.effect === DECISIONS.BLOCK)
      .map((v) => v.policyName)
      .join(", ");
    decisionReason = `Blocked by policy: ${blockedBy}`;
  } else if (policyResult.highestEffect === DECISIONS.REQUIRE_APPROVAL) {
    decision = DECISIONS.REQUIRE_APPROVAL;
    const flaggedBy = policyResult.violations
      .map((v) => v.policyName)
      .join(", ");
    decisionReason = `Requires human approval — flagged by: ${flaggedBy}`;
  }

  // ── STAGE 6: Write audit record (fire-and-forget) ───────────────────────────
  // We DON'T await this — the audit write must never delay the security response.
  // If the write fails, we log the error but the caller still gets their decision.
  const approvalStatus =
    decision === DECISIONS.REQUIRE_APPROVAL ? APPROVAL_STATUS.PENDING : null;

  const processingTimeMs = Date.now() - startTime;

  _writeAuditRecord({
    agentId,
    toolId,
    requestedBy: requestedByUserId,
    actionType,
    parameters,
    reason,
    context: { resource: resource || {} },
    decision,
    decisionReason,
    hardCheckResult: { passed: true, reason: "All hard checks passed", failedCheck: null },
    policyResult,
    riskScore,
    approvalStatus,
    evaluatedAt: new Date(),
    processingTimeMs,
  }).catch((err) => {
    logger.error("[actions] Failed to write audit record", {
      agentId,
      error: err.message,
    });
  });

  // Fire-and-forget: update agent's lastSeenAt
  updateLastSeen(agentId);

  // ── Response ─────────────────────────────────────────────────────────────────
  const result = {
    decision,
    decisionReason,
    riskScore,
    riskFactors,
    policyResult: {
      matched: policyResult.matched,
      violations: policyResult.violations,
      highestEffect: policyResult.highestEffect,
      evaluatedCount: policyResult.evaluatedCount,
    },
    hardCheckResult: { passed: true },
    approvalStatus,
    processingTimeMs,
    agentId,
    toolId,
    actionType,
  };

  logger.info("[actions] Evaluation complete", {
    agentId,
    toolId,
    actionType,
    decision,
    riskScore,
    processingTimeMs,
  });

  return result;
};

// ─── List Actions ─────────────────────────────────────────────────────────────

const listActions = async ({ agentId, toolId, decision, approvalStatus, page = 1, limit = 20 } = {}) => {
  const query = {};
  if (agentId) query.agentId = agentId;
  if (toolId) query.toolId = toolId;
  if (decision) query.decision = decision;
  if (approvalStatus) query.approvalStatus = approvalStatus;

  const safeLimit = Math.min(parseInt(limit, 10) || 20, 100);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const [actions, total] = await Promise.all([
    Action.find(query)
      .populate("agentId", "name status")
      .populate("toolId", "name type riskLevel")
      .populate("requestedBy", "name email")
      .sort({ evaluatedAt: -1 })
      .skip(skip)
      .limit(safeLimit),
    Action.countDocuments(query),
  ]);

  return { actions, total, page: safePage, pages: Math.ceil(total / safeLimit) };
};

// ─── Get Action by ID ─────────────────────────────────────────────────────────

const getActionById = async (actionId) => {
  const action = await Action.findById(actionId)
    .populate("agentId", "name status permissions")
    .populate("toolId", "name type riskLevel allowedActions")
    .populate("requestedBy", "name email role")
    .populate("approvedBy", "name email");

  if (!action) throw new AppError("Action not found", 404, "NOT_FOUND");
  return action;
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Build a BLOCK result for a hard-check failure and write the audit record.
 * Used when we know immediately (without running the policy engine) that
 * this action must be blocked.
 */
const _buildBlockedResult = async (
  failedCheck,
  reason,
  request,
  requestedByUserId,
  startTime,
  agent,
  tool
) => {
  const processingTimeMs = Date.now() - startTime;

  const result = {
    decision: DECISIONS.BLOCK,
    decisionReason: reason,
    riskScore: 100, // Unknown risk = maximum risk
    riskFactors: [`Hard block: ${failedCheck}`],
    policyResult: null,
    hardCheckResult: { passed: false, reason, failedCheck },
    approvalStatus: null,
    processingTimeMs,
    agentId: request.agentId,
    toolId: request.toolId,
    actionType: request.actionType,
  };

  // Write audit record even for hard-blocked actions
  _writeAuditRecord({
    agentId: request.agentId,
    toolId: request.toolId,
    requestedBy: requestedByUserId,
    actionType: request.actionType,
    parameters: request.parameters,
    reason: request.reason,
    context: { resource: request.resource || {} },
    decision: DECISIONS.BLOCK,
    decisionReason: reason,
    hardCheckResult: { passed: false, reason, failedCheck },
    policyResult: null,
    riskScore: 100,
    approvalStatus: null,
    evaluatedAt: new Date(),
    processingTimeMs,
  }).catch((err) => {
    logger.error("[actions] Failed to write hard-block audit record", { error: err.message });
  });

  logger.warn("[actions] Hard block", {
    failedCheck,
    reason,
    agentId: request.agentId,
    actionType: request.actionType,
  });

  return result;
};

/**
 * Write Action record to the database. Called fire-and-forget.
 */
const _writeAuditRecord = async (data) => {
  await Action.create(data);
};

module.exports = { evaluate, listActions, getActionById };
