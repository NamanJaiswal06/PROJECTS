/**
 * policy.controller.js — Thin HTTP handlers for policy management.
 */
const asyncHandler = require("../utils/asyncHandler");
const policyService = require("../services/policies/policy.service");

const createPolicy = asyncHandler(async (req, res) => {
  const policy = await policyService.createPolicy(req.body, req.user._id);
  res.status(201).json({ success: true, message: "Policy created", data: { policy } });
});

const listPolicies = asyncHandler(async (req, res) => {
  const { enabled, effect, page, limit } = req.query;
  const parsedEnabled =
    enabled === "true" ? true : enabled === "false" ? false : undefined;
  const result = await policyService.listPolicies({ enabled: parsedEnabled, effect, page, limit });
  res.status(200).json({ success: true, data: result });
});

const getPolicy = asyncHandler(async (req, res) => {
  const policy = await policyService.getPolicyById(req.params.id);
  res.status(200).json({ success: true, data: { policy } });
});

const updatePolicy = asyncHandler(async (req, res) => {
  const policy = await policyService.updatePolicy(req.params.id, req.body, req.user._id);
  res.status(200).json({ success: true, message: "Policy updated", data: { policy } });
});

const deletePolicy = asyncHandler(async (req, res) => {
  await policyService.deletePolicy(req.params.id);
  res.status(200).json({ success: true, message: "Policy deleted", data: null });
});

/**
 * PATCH /api/v1/policies/:id/toggle
 * Enable or disable a policy without a full update.
 * Body: { enabled: boolean }
 */
const togglePolicy = asyncHandler(async (req, res) => {
  const { enabled } = req.body;
  if (typeof enabled !== "boolean") {
    return res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "enabled must be a boolean" },
    });
  }
  const policy = await policyService.togglePolicy(req.params.id, enabled, req.user._id);
  res.status(200).json({
    success: true,
    message: `Policy ${enabled ? "enabled" : "disabled"}`,
    data: { policy },
  });
});

module.exports = { createPolicy, listPolicies, getPolicy, updatePolicy, deletePolicy, togglePolicy };
