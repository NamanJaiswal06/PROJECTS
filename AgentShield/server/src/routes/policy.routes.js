/**
 * policy.routes.js — Policy management routes.
 *
 * RBAC:
 *   POST, PATCH, DELETE → ADMIN only
 *   GET                 → ADMIN + ANALYST (viewers shouldn't see raw policy configs)
 */
const { Router } = require("express");
const { authenticate, authorize } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validation.middleware");
const { USER_ROLES } = require("../utils/constants");
const { createPolicySchema, updatePolicySchema, policyIdSchema } = require("../validators/policy.validator");
const {
  createPolicy, listPolicies, getPolicy, updatePolicy, deletePolicy, togglePolicy,
} = require("../controllers/policy.controller");

const router = Router();

// All policy routes require authentication
router.use(authenticate);

// ── Read (ADMIN + ANALYST) ─────────────────────────────────────────────────────
router.get("/", authorize(USER_ROLES.ADMIN, USER_ROLES.ANALYST), listPolicies);
router.get("/:id", authorize(USER_ROLES.ADMIN, USER_ROLES.ANALYST), validate(policyIdSchema, "params"), getPolicy);

// ── Write (ADMIN only) ─────────────────────────────────────────────────────────
router.post("/", authorize(USER_ROLES.ADMIN), validate(createPolicySchema), createPolicy);

router.patch(
  "/:id",
  authorize(USER_ROLES.ADMIN),
  validate(policyIdSchema, "params"),
  validate(updatePolicySchema),
  updatePolicy
);

router.patch(
  "/:id/toggle",
  authorize(USER_ROLES.ADMIN),
  validate(policyIdSchema, "params"),
  togglePolicy
);

router.delete("/:id", authorize(USER_ROLES.ADMIN), validate(policyIdSchema, "params"), deletePolicy);

module.exports = router;

