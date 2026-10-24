/**
 * action.controller.js — HTTP handlers for action evaluation.
 */
const asyncHandler = require("../utils/asyncHandler");
const actionService = require("../services/actions/action.service");

/**
 * POST /api/v1/actions/evaluate
 *
 * The primary endpoint — an AI agent submits an action request,
 * and gets back a security decision.
 *
 * Request body: { agentId, toolId, actionType, parameters?, reason?, resource? }
 * Response: { decision, riskScore, violations, decisionReason, ... }
 */
const evaluateAction = asyncHandler(async (req, res) => {
  const result = await actionService.evaluate(req.body, req.user._id);

  // HTTP status reflects the decision:
  //   200 — ALLOW or REQUIRE_APPROVAL (the request was processed correctly)
  //   200 — BLOCK (also processed correctly — it's not a server error)
  // The decision is in the body, not the HTTP status.
  // Clients should read result.decision, not the HTTP status.
  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * GET /api/v1/actions
 * List action records with optional filters (audit log view).
 */
const listActions = asyncHandler(async (req, res) => {
  const { agentId, toolId, decision, approvalStatus, page, limit } = req.query;

  const result = await actionService.listActions({
    agentId, toolId, decision, approvalStatus, page, limit,
  });

  res.status(200).json({ success: true, data: result });
});

/**
 * GET /api/v1/actions/:id
 * Get a single action record with full detail.
 */
const getAction = asyncHandler(async (req, res) => {
  const action = await actionService.getActionById(req.params.id);
  res.status(200).json({ success: true, data: { action } });
});

module.exports = { evaluateAction, listActions, getAction };
