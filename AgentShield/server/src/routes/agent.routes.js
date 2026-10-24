/**
 * agent.routes.js — Agent management routes.
 *
 * RBAC:
 *   POST, PATCH, DELETE → ADMIN only
 *   GET                 → Any authenticated user (ADMIN, ANALYST, VIEWER)
 *
 * Middleware chain per route:
 *   authenticate    → verify JWT, load user
 *   authorize()     → RBAC check
 *   validate()      → Zod schema validation
 *   controller      → delegate to service
 */
const { Router } = require("express");
const { authenticate, authorize } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validation.middleware");
const { USER_ROLES } = require("../utils/constants");
const { createAgentSchema, updateAgentSchema, agentIdSchema } = require("../validators/agent.validator");
const {
  createAgent,
  listAgents,
  getAgent,
  updateAgent,
  suspendAgent,
  deleteAgent,
} = require("../controllers/agent.controller");

const router = Router();

// All agent routes require authentication
router.use(authenticate);

// ── Read (any authenticated role) ─────────────────────────────────────────────
router.get("/", listAgents);
router.get("/:id", validate(agentIdSchema, "params"), getAgent);

// ── Write (ADMIN only) ─────────────────────────────────────────────────────────
router.post(
  "/",
  authorize(USER_ROLES.ADMIN),
  validate(createAgentSchema),
  createAgent
);

router.patch(
  "/:id",
  authorize(USER_ROLES.ADMIN),
  validate(agentIdSchema, "params"),
  validate(updateAgentSchema),
  updateAgent
);

router.patch(
  "/:id/suspend",
  authorize(USER_ROLES.ADMIN),
  validate(agentIdSchema, "params"),
  suspendAgent
);

router.delete(
  "/:id",
  authorize(USER_ROLES.ADMIN),
  validate(agentIdSchema, "params"),
  deleteAgent
);

module.exports = router;

