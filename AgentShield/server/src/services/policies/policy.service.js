/**
 * policy.service.js — CRUD operations for Policy documents.
 * Thin service — no evaluation logic here. That belongs to policyEngine.service.js.
 */
const Policy = require("../../models/Policy");
const AppError = require("../../utils/AppError");
const logger = require("../../utils/logger");

// ─── Create ───────────────────────────────────────────────────────────────────

const createPolicy = async (data, createdById) => {
  const policy = await Policy.create({ ...data, createdBy: createdById });

  logger.info("[policies] Policy created", {
    policyId: policy._id,
    name: policy.name,
    effect: policy.effect,
    priority: policy.priority,
    createdBy: createdById,
  });

  return policy;
};

// ─── List ─────────────────────────────────────────────────────────────────────

const listPolicies = async ({ enabled, effect, page = 1, limit = 20 } = {}) => {
  const query = {};
  if (typeof enabled === "boolean") query.enabled = enabled;
  if (effect) query.effect = effect;

  const safeLimit = Math.min(parseInt(limit, 10) || 20, 100);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const [policies, total] = await Promise.all([
    Policy.find(query)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .sort({ priority: -1, createdAt: 1 })
      .skip(skip)
      .limit(safeLimit),
    Policy.countDocuments(query),
  ]);

  return { policies, total, page: safePage, pages: Math.ceil(total / safeLimit) };
};

// ─── Get by ID ────────────────────────────────────────────────────────────────

const getPolicyById = async (policyId) => {
  const policy = await Policy.findById(policyId)
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  if (!policy) throw new AppError("Policy not found", 404, "NOT_FOUND");

  return policy;
};

// ─── Update ───────────────────────────────────────────────────────────────────

const updatePolicy = async (policyId, updates, updatedById) => {
  const policy = await Policy.findById(policyId);
  if (!policy) throw new AppError("Policy not found", 404, "NOT_FOUND");

  Object.assign(policy, { ...updates, updatedBy: updatedById });
  await policy.save();

  logger.info("[policies] Policy updated", {
    policyId: policy._id,
    updatedFields: Object.keys(updates),
    updatedBy: updatedById,
  });

  return policy.populate([
    { path: "createdBy", select: "name email" },
    { path: "updatedBy", select: "name email" },
  ]);
};

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Hard delete a policy.
 * Unlike agents/tools, policies have no historical FK references —
 * they are evaluated at runtime. Safe to hard-delete.
 * Consider disabling (enabled: false) instead for auditability.
 */
const deletePolicy = async (policyId) => {
  const policy = await Policy.findByIdAndDelete(policyId);
  if (!policy) throw new AppError("Policy not found", 404, "NOT_FOUND");

  logger.warn("[policies] Policy deleted", {
    policyId: policy._id,
    name: policy.name,
  });
};

// ─── Toggle enabled ───────────────────────────────────────────────────────────

const togglePolicy = async (policyId, enabled, updatedById) => {
  const policy = await Policy.findById(policyId);
  if (!policy) throw new AppError("Policy not found", 404, "NOT_FOUND");

  policy.enabled = enabled;
  policy.updatedBy = updatedById;
  await policy.save();

  logger.info("[policies] Policy toggled", {
    policyId: policy._id,
    name: policy.name,
    enabled,
  });

  return policy;
};

module.exports = {
  createPolicy,
  listPolicies,
  getPolicyById,
  updatePolicy,
  deletePolicy,
  togglePolicy,
};
