"use strict";
const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const { listNotices, createNotice, publishNotice } = require("../controllers/notice.controller");

// GET /api/notices — authenticated teacher or student
router.get("/", authenticateToken, listNotices);

// POST /api/notices — teacher only
router.post("/", authenticateToken, requireRole("teacher"), createNotice);

// PATCH /api/notices/:id/publish — teacher only
router.patch("/:id/publish", authenticateToken, requireRole("teacher"), publishNotice);

module.exports = router;
