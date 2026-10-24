"use strict";
const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const {
  generateQuizHandler,
  submitQuizHandler,
} = require("../controllers/placementPrep.controller");

// POST /api/placement-prep/generate-quiz — authenticated student
router.post(
  "/generate-quiz",
  authenticateToken,
  requireRole("student"),
  generateQuizHandler
);

// POST /api/placement-prep/submit-quiz — student only (server-side scoring)
router.post(
  "/submit-quiz",
  authenticateToken,
  requireRole("student"),
  submitQuizHandler
);

module.exports = router;
