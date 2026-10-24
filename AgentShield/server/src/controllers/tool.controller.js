/**
 * tool.controller.js — Thin HTTP handlers for tool management.
 * All business logic is in tool.service.js.
 */
const asyncHandler = require("../utils/asyncHandler");
const toolService = require("../services/tools/tool.service");

/**
 * POST /api/v1/tools
 * ADMIN only — Register a new tool
 */
const createTool = asyncHandler(async (req, res) => {
  const tool = await toolService.createTool(req.body);

  res.status(201).json({
    success: true,
    message: "Tool registered successfully",
    data: { tool },
  });
});

/**
 * GET /api/v1/tools
 * Any authenticated user
 */
const listTools = asyncHandler(async (req, res) => {
  const { type, riskLevel, isActive, page, limit } = req.query;

  // isActive comes as a query string; parse to boolean
  const parsedIsActive =
    isActive === "true" ? true : isActive === "false" ? false : undefined;

  const result = await toolService.listTools({
    type,
    riskLevel,
    isActive: parsedIsActive,
    page,
    limit,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * GET /api/v1/tools/:id
 * Any authenticated user
 */
const getTool = asyncHandler(async (req, res) => {
  const tool = await toolService.getToolById(req.params.id);

  res.status(200).json({
    success: true,
    data: { tool },
  });
});

/**
 * PATCH /api/v1/tools/:id
 * ADMIN only
 */
const updateTool = asyncHandler(async (req, res) => {
  const tool = await toolService.updateTool(req.params.id, req.body);

  res.status(200).json({
    success: true,
    message: "Tool updated successfully",
    data: { tool },
  });
});

/**
 * DELETE /api/v1/tools/:id
 * ADMIN only — Soft deactivation
 */
const deleteTool = asyncHandler(async (req, res) => {
  await toolService.deleteTool(req.params.id);

  res.status(200).json({
    success: true,
    message: "Tool has been deactivated",
    data: null,
  });
});

module.exports = { createTool, listTools, getTool, updateTool, deleteTool };
