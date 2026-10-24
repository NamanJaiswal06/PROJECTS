/**
 * auth.middleware.js — JWT authentication and RBAC authorization middleware.
 *
 * authenticate:
 *   1. Extract the Bearer token from the Authorization header
 *   2. Verify the JWT signature and expiry
 *   3. Load the user from the database (verifies user still exists and is active)
 *   4. Attach the user to req.user
 *
 * authorize(...roles):
 *   Returns a middleware that checks req.user.role is in the allowed list.
 *   Must always be called AFTER authenticate().
 *
 * Why do we load the user from DB on every request?
 *   JWT tokens are stateless — once issued they are valid until expiry.
 *   If an admin suspends a user (isActive = false), the user's token is still
 *   cryptographically valid. By loading from DB, we catch this case.
 *   The trade-off: one extra DB read per authenticated request.
 *   Acceptable for Phase 1. In Phase 12 we can add Redis caching if needed.
 */
const User = require("../models/User");
const { verifyToken } = require("../services/auth/auth.service");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");

/**
 * authenticate — Verify JWT and load user onto req.user.
 * Throws 401 if token is missing, invalid, expired, or user no longer exists.
 */
const authenticate = asyncHandler(async (req, res, next) => {
  // ── 1. Extract token ──────────────────────────────────────────────────────
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError(
      "Authentication required. Please provide a Bearer token.",
      401,
      "UNAUTHORIZED"
    );
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  // ── 2. Verify JWT ─────────────────────────────────────────────────────────
  // verifyToken() throws JsonWebTokenError or TokenExpiredError on failure.
  // The global error middleware maps those to 401 UNAUTHORIZED responses.
  const decoded = verifyToken(token);

  // ── 3. Load user from DB ──────────────────────────────────────────────────
  // decoded.sub = user._id (set in generateToken)
  const user = await User.findById(decoded.sub);

  if (!user) {
    // User was deleted after the token was issued
    throw new AppError(
      "The account associated with this token no longer exists.",
      401,
      "UNAUTHORIZED"
    );
  }

  if (!user.isActive) {
    throw new AppError(
      "This account has been suspended. Please contact an administrator.",
      403,
      "ACCOUNT_SUSPENDED"
    );
  }

  // ── 4. Attach to request ──────────────────────────────────────────────────
  req.user = user;

  next();
});

/**
 * authorize — Check that req.user.role is in the allowed list.
 *
 * Usage:
 *   router.delete('/agents/:id', authenticate, authorize('ADMIN'), handler)
 *
 * @param {...string} roles — One or more allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    // authenticate() must run first — if it didn't, req.user won't exist
    if (!req.user) {
      return next(
        new AppError("Authentication required.", 401, "UNAUTHORIZED")
      );
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. Required role(s): ${roles.join(", ")}. Your role: ${req.user.role}.`,
          403,
          "FORBIDDEN"
        )
      );
    }

    next();
  };
};

module.exports = { authenticate, authorize };
