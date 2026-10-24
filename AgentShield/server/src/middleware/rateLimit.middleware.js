/**
 * rateLimit.middleware.js — Pre-configured rate limiters.
 *
 * Why this exists:
 *   Rate limiting protects against:
 *   - Brute-force password attacks (auth endpoints)
 *   - Abuse of the action evaluation endpoint (expensive per-request)
 *   - General API flooding
 *
 * Implementation:
 *   Using express-rate-limit with in-memory store for Phase 1.
 *   This is perfectly adequate for a single-process server.
 *   When you scale to multiple processes or servers, replace
 *   MemoryStore with RedisStore (the library supports it natively).
 *   Do NOT introduce Redis just for this — wait until you need it.
 *
 * Each limiter is configured independently so we can tune them separately.
 */
const rateLimit = require("express-rate-limit");
const env = require("../config/env");

// ─── Standard handler for rate limit exceeded ─────────────────────────────────
const rateLimitHandler = (req, res) => {
  res.status(429).json({
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests — please wait before trying again.",
    },
  });
};

// ─── General API rate limiter ─────────────────────────────────────────────────
// Applied globally in app.js to all /api/v1 routes
const generalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,  // Return rate limit info in headers (RateLimit-*)
  legacyHeaders: false,   // Disable the deprecated X-RateLimit-* headers
  handler: rateLimitHandler,
  // Skip rate limiting in test environment to avoid flaky tests
  skip: () => env.NODE_ENV === "test",
});

// ─── Auth rate limiter ────────────────────────────────────────────────────────
// Stricter — protects login against brute force
const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: () => env.NODE_ENV === "test",
  message: "Too many login attempts from this IP — please try again later.",
});

// ─── Action evaluation rate limiter ──────────────────────────────────────────
// The evaluate endpoint runs the entire security pipeline — limit per IP
const actionLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.ACTION_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: () => env.NODE_ENV === "test",
});

module.exports = { generalLimiter, authLimiter, actionLimiter };
