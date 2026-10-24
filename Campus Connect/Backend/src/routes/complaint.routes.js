"use strict";
const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const {
  createComplaint,
  getMyComplaints,
  getAllComplaints,
  updateComplaintStatus,
} = require("../controllers/complaint.controller");

// POST /api/complaints — student only
router.post("/", authenticateToken, requireRole("student"), createComplaint);

// GET /api/complaints/mine — student only
// IMPORTANT: /mine before /:id to avoid param shadowing
router.get("/mine", authenticateToken, requireRole("student"), getMyComplaints);

// GET /api/complaints — teacher only
router.get("/", authenticateToken, requireRole("teacher"), getAllComplaints);

// PATCH /api/complaints/:id/status — teacher only
router.patch(
  "/:id/status",
  authenticateToken,
  requireRole("teacher"),
  updateComplaintStatus
);

module.exports = router;
