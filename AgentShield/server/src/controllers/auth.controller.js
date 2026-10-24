/**
 * auth.controller.js — Authentication HTTP handlers.
 *
 * Controllers are thin by design:
 *   1. Validate input (done by validate middleware before this runs)
 *   2. Call the service
 *   3. Format and send the HTTP response
 *
 * No business logic lives here.
 * No try/catch needed — asyncHandler catches all rejections.
 */
const asyncHandler = require("../utils/asyncHandler");
const authService = require("../services/auth/auth.service");
const { authLimiter } = require("../middleware/rateLimit.middleware");

/**
 * POST /api/v1/auth/register
 * Body: { name, email, password }
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const { user, token } = await authService.register({ name, email, password });

  res.status(201).json({
    success: true,
    message: "Account created successfully",
    data: {
      user,
      token,
    },
  });
});

/**
 * POST /api/v1/auth/login
 * Body: { email, password }
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { user, token } = await authService.login({ email, password });

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      user,
      token,
    },
  });
});

/**
 * GET /api/v1/auth/me
 * Requires: authenticate middleware (sets req.user)
 */
const getMe = asyncHandler(async (req, res) => {
  // req.user is already populated by the authenticate middleware.
  // We could return req.user directly, but re-fetching from DB ensures
  // we always return the latest data (in case the user was just updated).
  // For /me it's a low-traffic endpoint so the extra DB read is acceptable.
  const user = await authService.getUserById(req.user._id);

  res.status(200).json({
    success: true,
    data: { user },
  });
});

module.exports = { register, login, getMe };
