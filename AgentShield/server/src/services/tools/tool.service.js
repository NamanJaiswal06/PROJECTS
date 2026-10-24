/**
 * tool.service.js — Business logic for tool management.
 */
const Tool = require("../../models/Tool");
const AppError = require("../../utils/AppError");
const logger = require("../../utils/logger");

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Register a new tool in AgentShield.
 * @param {object} data — Validated tool fields (from Zod)
 * @returns {Promise<Tool>}
 */
const createTool = async (data) => {
  const tool = await Tool.create(data);

  logger.info("[tools] Tool registered", {
    toolId: tool._id,
    name: tool.name,
    type: tool.type,
    riskLevel: tool.riskLevel,
  });

  return tool;
};

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * List tools with optional filters.
 * @param {object} filters — { type, riskLevel, isActive, page, limit }
 * @returns {Promise<{ tools, total, page, pages }>}
 */
const listTools = async ({ type, riskLevel, isActive, page = 1, limit = 20 } = {}) => {
  const query = {};
  if (type) query.type = type;
  if (riskLevel) query.riskLevel = riskLevel;
  if (typeof isActive === "boolean") query.isActive = isActive;
  // Default to showing only active tools to avoid noise in dropdowns
  else query.isActive = true;

  const safeLimit = Math.min(parseInt(limit, 10) || 20, 100);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const [tools, total] = await Promise.all([
    Tool.find(query).sort({ riskLevel: 1, name: 1 }).skip(skip).limit(safeLimit),
    Tool.countDocuments(query),
  ]);

  return { tools, total, page: safePage, pages: Math.ceil(total / safeLimit) };
};

// ─── Get by ID ────────────────────────────────────────────────────────────────

/**
 * Get a single tool by ID.
 * @param {string} toolId
 * @returns {Promise<Tool>}
 */
const getToolById = async (toolId) => {
  const tool = await Tool.findById(toolId);
  if (!tool) throw new AppError("Tool not found", 404, "NOT_FOUND");
  return tool;
};

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Update a tool's configuration.
 * @param {string} toolId
 * @param {object} updates
 * @returns {Promise<Tool>}
 */
const updateTool = async (toolId, updates) => {
  const tool = await Tool.findById(toolId);
  if (!tool) throw new AppError("Tool not found", 404, "NOT_FOUND");

  Object.assign(tool, updates);
  await tool.save();

  logger.info("[tools] Tool updated", {
    toolId: tool._id,
    updatedFields: Object.keys(updates),
  });

  return tool;
};

// ─── Deactivate (soft delete) ─────────────────────────────────────────────────

/**
 * Deactivate a tool — it becomes unusable but is not deleted.
 * Existing agents with this toolId will get their actions blocked at evaluation.
 * @param {string} toolId
 * @returns {Promise<void>}
 */
const deleteTool = async (toolId) => {
  const tool = await Tool.findById(toolId);
  if (!tool) throw new AppError("Tool not found", 404, "NOT_FOUND");

  tool.isActive = false;
  await tool.save();

  logger.warn("[tools] Tool deactivated", { toolId: tool._id, name: tool.name });
};

module.exports = { createTool, listTools, getToolById, updateTool, deleteTool };
