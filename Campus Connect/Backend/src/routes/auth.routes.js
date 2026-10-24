"use strict";
const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const { register, login, getMe } = require("../controllers/auth.controller");

// POST /api/auth/register — public (creates teacher or student account)
router.post("/register", register);

// POST /api/auth/login — public
router.post("/login", login);

// GET /api/auth/me — authenticated
router.get("/me", authenticateToken, getMe);

module.exports = router;
