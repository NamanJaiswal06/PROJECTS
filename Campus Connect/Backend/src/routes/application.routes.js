"use strict";
const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const {
  createApplication,
  getMyApplications,
  updateApplicationStatus,
} = require("../controllers/application.controller");

// POST /api/applications — student only
router.post("/", authenticateToken, requireRole("student"), createApplication);

// GET /api/applications/mine — student only
// IMPORTANT: /mine must be defined BEFORE /:id routes to avoid param shadowing
router.get("/mine", authenticateToken, requireRole("student"), getMyApplications);

// PATCH /api/applications/:id/status — teacher only
router.patch(
  "/:id/status",
  authenticateToken,
  requireRole("teacher"),
  updateApplicationStatus
);

module.exports = router;
