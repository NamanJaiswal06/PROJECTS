"use strict";
const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const { listOpportunities, createOpportunity } = require("../controllers/opportunity.controller");

// GET /api/opportunities — authenticated teacher or student
router.get("/", authenticateToken, listOpportunities);

// POST /api/opportunities — teacher only
router.post("/", authenticateToken, requireRole("teacher"), createOpportunity);

module.exports = router;
