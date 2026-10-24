/**
 * agent.service.js — Business logic for agent management.
 *
 * Responsibilities:
 *   - CRUD operations on Agent documents
 *   - Validating that toolIds reference real Tool documents
 *   - Enforcing agent status transitions
 *   - Updating lastSeenAt (called by the action gateway in Phase 5)
 *
 * What this service does NOT do:
 *   - HTTP concerns (req/res/status codes) — that is the controller's job
 *   - Action evaluation — that is the action service's job (Phase 5)
 *   - Policy evaluation — that is the policy engine's job (Phase 4)
 */
const Agent = require("../../models/Agent");
const Tool = require("../../models/Tool");
const AppError = require("../../utils/AppError");
const { AGENT_STATUS } = require("../../utils/constants");
const logger = require("../../utils/logger");

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Register a new agent.
 *
 * @param {object} data       — Validated agent fields (from Zod)
 * @param {string} ownerId    — The authenticated user's ID (set from req.user)
 * @returns {Promise<Agent>}
 */
const createAgent = async (data, ownerId) => {
  // Validate that all referenced toolIds actually exist in the database.
  // This prevents silent dangling references that would cause confusing
  // "tool not found" errors later during action evaluation.
  if (data.toolIds && data.toolIds.length > 0) {
    await validateToolIds(data.toolIds);
  }

  const agent = await Agent.create({
    ...data,
    owner: ownerId,
    status: AGENT_STATUS.ACTIVE, // Always start active — client cannot override
  });

  logger.info("[agents] Agent created", {
    agentId: agent._id,
    name: agent.name,
    ownerId,
    permissionCount: agent.permissions.length,
  });

  return agent;
};

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * List agents with optional filters.
 *
 * Supported query params (passed as filter object):
 *   status  — filter by ACTIVE / SUSPENDED / DISABLED
 *   owner   — filter by owner user ID
 *   page    — pagination (default 1)
 *   limit   — results per page (default 20, max 100)
 *
 * @param {object} filters
 * @returns {Promise<{ agents: Agent[], total: number, page: number, pages: number }>}
 */
const listAgents = async ({ status, owner, page = 1, limit = 20 } = {}) => {
  const query = {};
  if (status) query.status = status;
  if (owner) query.owner = owner;

  const safeLimit = Math.min(parseInt(limit, 10) || 20, 100);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const [agents, total] = await Promise.all([
    Agent.find(query)
      .populate("owner", "name email role") // Populate owner with safe fields only
      .populate("toolIds", "name type riskLevel isActive") // Populate tools with summary
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit),
    Agent.countDocuments(query),
  ]);

  return {
    agents,
    total,
    page: safePage,
    pages: Math.ceil(total / safeLimit),
  };
};

// ─── Get by ID ────────────────────────────────────────────────────────────────

/**
 * Get a single agent by ID.
 * @param {string} agentId
 * @returns {Promise<Agent>}
 */
const getAgentById = async (agentId) => {
  const agent = await Agent.findById(agentId)
    .populate("owner", "name email role")
    .populate("toolIds", "name type riskLevel allowedActions isActive");

  if (!agent) {
    throw new AppError(`Agent not found`, 404, "NOT_FOUND");
  }

  return agent;
};

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Update an agent's configuration.
 *
 * @param {string} agentId
 * @param {object} updates  — Validated update fields
 * @returns {Promise<Agent>}
 */
const updateAgent = async (agentId, updates) => {
  const agent = await Agent.findById(agentId);
  if (!agent) {
    throw new AppError("Agent not found", 404, "NOT_FOUND");
  }

  // Validate new toolIds if provided
  if (updates.toolIds && updates.toolIds.length > 0) {
    await validateToolIds(updates.toolIds);
  }

  // Status transition validation:
  // You cannot directly go from DISABLED back to ACTIVE.
  // DISABLED is permanent — create a new agent instead.
  if (updates.status === AGENT_STATUS.ACTIVE && agent.status === AGENT_STATUS.DISABLED) {
    throw new AppError(
      "A disabled agent cannot be reactivated. Please create a new agent.",
      409,
      "INVALID_STATUS_TRANSITION"
    );
  }

  // Apply updates
  Object.assign(agent, updates);
  await agent.save();

  logger.info("[agents] Agent updated", {
    agentId: agent._id,
    updatedFields: Object.keys(updates),
  });

  return agent.populate([
    { path: "owner", select: "name email role" },
    { path: "toolIds", select: "name type riskLevel isActive" },
  ]);
};

// ─── Suspend ──────────────────────────────────────────────────────────────────

/**
 * Suspend an agent — immediate effect, blocks all further actions.
 * @param {string} agentId
 * @param {string} reason   — Why the agent was suspended (for audit)
 * @returns {Promise<Agent>}
 */
const suspendAgent = async (agentId, reason) => {
  const agent = await Agent.findById(agentId);
  if (!agent) throw new AppError("Agent not found", 404, "NOT_FOUND");

  if (agent.status === AGENT_STATUS.DISABLED) {
    throw new AppError("Agent is already disabled", 409, "CONFLICT");
  }

  agent.status = AGENT_STATUS.SUSPENDED;
  await agent.save();

  logger.warn("[agents] Agent suspended", { agentId: agent._id, reason });

  return agent;
};

// ─── Delete (soft) ────────────────────────────────────────────────────────────

/**
 * Soft-delete an agent by setting status to DISABLED.
 * We never hard-delete agents — historical action records need the reference.
 *
 * @param {string} agentId
 * @returns {Promise<void>}
 */
const deleteAgent = async (agentId) => {
  const agent = await Agent.findById(agentId);
  if (!agent) throw new AppError("Agent not found", 404, "NOT_FOUND");

  agent.status = AGENT_STATUS.DISABLED;
  await agent.save();

  logger.warn("[agents] Agent disabled (soft delete)", { agentId: agent._id });
};

// ─── Update lastSeenAt (called by action gateway) ─────────────────────────────

/**
 * Update lastSeenAt timestamp. Fire-and-forget — called by the action gateway.
 * @param {string} agentId
 */
const updateLastSeen = async (agentId) => {
  await Agent.findByIdAndUpdate(agentId, { lastSeenAt: new Date() }).catch((err) => {
    logger.warn("[agents] Failed to update lastSeenAt", { agentId, error: err.message });
  });
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Validate that all toolIds reference real, active Tool documents.
 * @param {string[]} toolIds
 * @throws {AppError} if any tool is not found or inactive
 */
const validateToolIds = async (toolIds) => {
  const tools = await Tool.find({ _id: { $in: toolIds } });

  if (tools.length !== toolIds.length) {
    const foundIds = new Set(tools.map((t) => t._id.toString()));
    const missing = toolIds.filter((id) => !foundIds.has(id));
    throw new AppError(
      `The following tool IDs do not exist: ${missing.join(", ")}`,
      400,
      "INVALID_TOOL_IDS"
    );
  }

  const inactiveTools = tools.filter((t) => !t.isActive);
  if (inactiveTools.length > 0) {
    throw new AppError(
      `The following tools are inactive: ${inactiveTools.map((t) => t.name).join(", ")}`,
      400,
      "INACTIVE_TOOLS"
    );
  }
};

module.exports = {
  createAgent,
  listAgents,
  getAgentById,
  updateAgent,
  suspendAgent,
  deleteAgent,
  updateLastSeen,
  validateToolIds, // exported for use in action service (Phase 5)
};
