/**
 * auth.routes.js — Authentication routes.
 *
 * POST /api/v1/auth/register — Create a new account
 * POST /api/v1/auth/login    — Login, receive JWT
 * GET  /api/v1/auth/me       — Get current user profile (requires auth)
 *
 * Middleware chain per route:
 *   authLimiter   → rate-limit login/register to prevent brute force
 *   validate()    → Zod schema validation
 *   controller    → business logic via service
 */
const { Router } = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validation.middleware");
const { authLimiter } = require("../middleware/rateLimit.middleware");
const { registerSchema, loginSchema } = require("../validators/auth.validator");
const { register, login, getMe } = require("../controllers/auth.controller");

const router = Router();

// Apply the strict auth rate limiter to all auth routes
router.use(authLimiter);

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.get("/me", authenticate, getMe);

module.exports = router;

