"use strict";
const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const { rewriteNoticeHandler } = require("../controllers/ai.controller");

// POST /api/ai/rewrite-notice — teacher only
router.post(
  "/rewrite-notice",
  authenticateToken,
  requireRole("teacher"),
  rewriteNoticeHandler
);

module.exports = router;
