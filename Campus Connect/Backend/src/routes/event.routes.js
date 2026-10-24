"use strict";
const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const { listEvents, createEvent } = require("../controllers/event.controller");

// GET /api/events — authenticated teacher or student
router.get("/", authenticateToken, listEvents);

// POST /api/events — teacher only
router.post("/", authenticateToken, requireRole("teacher"), createEvent);

module.exports = router;
