"use strict";
const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const { getStudentDashboard } = require("../controllers/dashboard.controller");

// GET /api/dashboard/student — student only
router.get(
  "/student",
  authenticateToken,
  requireRole("student"),
  getStudentDashboard
);

module.exports = router;
