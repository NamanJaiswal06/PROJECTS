/**
 * health.routes.js — Routes for health and readiness checks.
 *
 * GET /api/v1/health        — Liveness check
 * GET /api/v1/health/ready  — Readiness check (MongoDB connected?)
 *
 * These routes are intentionally unauthenticated — monitoring tools
 * and load balancers should be able to call them without a token.
 */
const { Router } = require("express");
const { healthCheck, readinessCheck } = require("../controllers/health.controller");

const router = Router();

router.get("/", healthCheck);
router.get("/ready", readinessCheck);

module.exports = router;
