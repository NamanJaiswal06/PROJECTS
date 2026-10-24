/**
 * action.routes.js — Action evaluation and audit log routes.
 *
 * POST /api/v1/actions/evaluate — Submit an action for evaluation (any auth)
 * GET  /api/v1/actions           — List action records (ADMIN + ANALYST)
 * GET  /api/v1/actions/:id       — Get single action (ADMIN + ANALYST)
 *
 * Why evaluate is open to any authenticated role:
 *   Agent SDKs call this endpoint. An SDK-authenticated request may come
 *   from any role. The security decision is made BY the engine, not by
 *   the role of the caller.
 */
const { Router } = require("express");
const { authenticate, authorize } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validation.middleware");
const { USER_ROLES } = require("../utils/constants");
const { evaluateActionSchema, actionIdSchema } = require("../validators/action.validator");
const { evaluateAction, listActions, getAction } = require("../controllers/action.controller");

const router = Router();

router.use(authenticate);

// ── Primary endpoint ───────────────────────────────────────────────────────────
router.post("/evaluate", validate(evaluateActionSchema), evaluateAction);

// ── Audit log (restricted to ADMIN + ANALYST) ──────────────────────────────────
router.get("/", authorize(USER_ROLES.ADMIN, USER_ROLES.ANALYST), listActions);
router.get("/:id", authorize(USER_ROLES.ADMIN, USER_ROLES.ANALYST), validate(actionIdSchema, "params"), getAction);

module.exports = router;
