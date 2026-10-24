"use strict";
const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const {
  generatePlanHandler,
  listPlansHandler,
  getPlanHandler,
  markSessionCompleteHandler,
} = require("../controllers/teachingPlan.controller");

// POST /api/teaching-plans/generate — teacher only
router.post(
  "/generate",
  authenticateToken,
  requireRole("teacher"),
  generatePlanHandler
);

// GET /api/teaching-plans — teacher only, list own plans
router.get("/", authenticateToken, requireRole("teacher"), listPlansHandler);

// GET /api/teaching-plans/:id — teacher only, single plan
router.get("/:id", authenticateToken, requireRole("teacher"), getPlanHandler);

// PATCH /api/teaching-plans/:planId/sessions/:sessionIndex/complete
router.patch(
  "/:planId/sessions/:sessionIndex/complete",
  authenticateToken,
  requireRole("teacher"),
  markSessionCompleteHandler
);

module.exports = router;
