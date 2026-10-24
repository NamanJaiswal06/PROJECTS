/**
 * env.js — Centralized environment variable validation and export.
 *
 * Why this exists:
 *   Reading process.env.SOME_VAR scattered across 20 files creates two problems:
 *   1. Typos silently return undefined — hard to debug
 *   2. You can't see at a glance what config the app needs
 *
 *   This module validates all required env vars at startup. If any required
 *   variable is missing, the process exits immediately with a clear message
 *   rather than failing silently later.
 *
 *   Every other file should import from here, never from process.env directly.
 */
require("dotenv").config();

const logger = require("../utils/logger");

// ─── Validate required variables ──────────────────────────────────────────────
const REQUIRED = [
  "MONGODB_URI",
  "JWT_SECRET",
];

const missing = REQUIRED.filter((key) => !process.env[key]);

if (missing.length > 0) {
  // Use console.error here — logger may not be ready yet at import time
  console.error(
    `[env] FATAL: Missing required environment variables: ${missing.join(", ")}\n` +
    `       Copy .env.example to .env and fill in the values.`
  );
  process.exit(1);
}

// ─── Warn about insecure defaults ─────────────────────────────────────────────
if (
  process.env.NODE_ENV === "production" &&
  process.env.JWT_SECRET === "replace_this_with_a_long_random_secret_at_least_64_chars"
) {
  console.error("[env] FATAL: You are using the example JWT_SECRET in production. This is a critical security vulnerability.");
  process.exit(1);
}

// ─── Parsed and exported config ───────────────────────────────────────────────
const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT, 10) || 5000,

  // Database
  MONGODB_URI: process.env.MONGODB_URI,

  // JWT
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",

  // CORS — parse comma-separated string into array
  CORS_ORIGINS: (process.env.CORS_ORIGINS || "http://localhost:3000")
    .split(",")
    .map((o) => o.trim()),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 min
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  AUTH_RATE_LIMIT_MAX: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 10,
  ACTION_RATE_LIMIT_MAX: parseInt(process.env.ACTION_RATE_LIMIT_MAX, 10) || 50,

  // ML service
  ML_SERVICE_MODE: process.env.ML_SERVICE_MODE || "MOCK",
  ML_SERVICE_URL: process.env.ML_SERVICE_URL || "http://localhost:8000",

  // Risk thresholds
  RISK_APPROVAL_THRESHOLD: parseInt(process.env.RISK_APPROVAL_THRESHOLD, 10) || 60,
  RISK_BLOCK_THRESHOLD: parseInt(process.env.RISK_BLOCK_THRESHOLD, 10) || 80,

  // Approval expiry
  APPROVAL_EXPIRY_HOURS: parseInt(process.env.APPROVAL_EXPIRY_HOURS, 10) || 24,

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || "debug",

  // Convenience flags
  isProduction: process.env.NODE_ENV === "production",
  isDevelopment: process.env.NODE_ENV !== "production",
};

module.exports = env;
