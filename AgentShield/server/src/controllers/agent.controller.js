/**
 * agent.controller.js — Thin HTTP handlers for agent management.
 * All business logic is in agent.service.js.
 */
const asyncHandler = require("../utils/asyncHandler");
const agentService = require("../services/agents/agent.service");

/**
 * POST /api/v1/agents
 * ADMIN only — Register a new agent
 */
const createAgent = asyncHandler(async (req, res) => {
  const agent = await agentService.createAgent(req.body, req.user._id);

  res.status(201).json({
    success: true,
    message: "Agent registered successfully",
    data: { agent },
  });
});

/**
 * GET /api/v1/agents
 * Any authenticated user — List agents (with filters from query params)
 */
const listAgents = asyncHandler(async (req, res) => {
  const { status, owner, page, limit } = req.query;

  const result = await agentService.listAgents({ status, owner, page, limit });

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * GET /api/v1/agents/:id
 * Any authenticated user — Get agent details
 */
const getAgent = asyncHandler(async (req, res) => {
  const agent = await agentService.getAgentById(req.params.id);

  res.status(200).json({
    success: true,
    data: { agent },
  });
});

/**
 * PATCH /api/v1/agents/:id
 * ADMIN only — Update agent configuration
 */
const updateAgent = asyncHandler(async (req, res) => {
  const agent = await agentService.updateAgent(req.params.id, req.body);

  res.status(200).json({
    success: true,
    message: "Agent updated successfully",
    data: { agent },
  });
});

/**
 * PATCH /api/v1/agents/:id/suspend
 * ADMIN only — Suspend an agent immediately
 */
const suspendAgent = asyncHandler(async (req, res) => {
  const reason = req.body?.reason || "No reason provided";
  const agent = await agentService.suspendAgent(req.params.id, reason);

  res.status(200).json({
    success: true,
    message: "Agent suspended",
    data: { agent },
  });
});

/**
 * DELETE /api/v1/agents/:id
 * ADMIN only — Soft-disable an agent
 */
const deleteAgent = asyncHandler(async (req, res) => {
  await agentService.deleteAgent(req.params.id);

  res.status(200).json({
    success: true,
    message: "Agent has been disabled",
    data: null,
  });
});

module.exports = { createAgent, listAgents, getAgent, updateAgent, suspendAgent, deleteAgent };
