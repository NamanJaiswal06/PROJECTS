/**
 * auth.service.js — Authentication business logic.
 *
 * Why a service layer instead of putting this in the controller?
 *   Controllers handle HTTP concerns (request, response, status codes).
 *   Services handle business logic (tokens, hashing, user lookup).
 *   Keeping them separate means:
 *   1. The service can be tested without HTTP
 *   2. The same service could be called from a CLI, a cron job, or a test
 *   3. Controllers stay thin and readable
 *
 * What this service does NOT do:
 *   - It does not access req or res — that is the controller's job
 *   - It does not know about HTTP status codes
 *   - It throws AppErrors that the controller passes to next()
 */
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../../models/User");
const AppError = require("../../utils/AppError");
const env = require("../../config/env");
const logger = require("../../utils/logger");

// ─── Password hashing ─────────────────────────────────────────────────────────

/**
 * Hash a plain-text password with bcrypt.
 *
 * Why cost factor 12?
 *   bcrypt's cost factor controls how slow the hash is to compute.
 *   Cost 10 = ~100ms, Cost 12 = ~400ms, Cost 14 = ~1.5s per hash.
 *   400ms is slow enough to make brute-force impractical, fast enough
 *   not to hurt the login UX. Don't go lower than 10.
 *
 * @param {string} plainPassword
 * @returns {Promise<string>} bcrypt hash
 */
const hashPassword = async (plainPassword) => {
  const SALT_ROUNDS = 12;
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
};

/**
 * Compare a plain-text password against a bcrypt hash.
 * Always use this instead of bcrypt.compare() directly — it's a consistent point
 * where we could add timing-attack protection or logging if needed later.
 *
 * @param {string} plainPassword
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
const verifyPassword = async (plainPassword, hash) => {
  return bcrypt.compare(plainPassword, hash);
};

// ─── JWT ──────────────────────────────────────────────────────────────────────

/**
 * Generate a signed JWT for a given user.
 *
 * Payload is minimal by design:
 *   - sub (subject): user ID — the standard JWT claim for "who this token is for"
 *   - role: included so the authorize() middleware doesn't need a DB round-trip
 *           for every request (just read from the token)
 *
 * What is intentionally NOT in the payload:
 *   - email — tokens can be decoded (not just verified) by anyone with the payload
 *   - name — same reason
 *   - passwordHash — NEVER
 *   - sensitive business data
 *
 * @param {import("../../models/User").UserDocument} user
 * @returns {string} signed JWT
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
};

/**
 * Verify and decode a JWT.
 * Throws JsonWebTokenError or TokenExpiredError if invalid — these are caught
 * by the global error middleware and converted to 401 responses.
 *
 * @param {string} token
 * @returns {{ sub: string, role: string, iat: number, exp: number }}
 */
const verifyToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET);
};

// ─── Registration ─────────────────────────────────────────────────────────────

/**
 * Register a new user.
 *
 * @param {{ name: string, email: string, password: string }} data — Already validated by Zod
 * @returns {{ user: object, token: string }}
 */
const register = async ({ name, email, password }) => {
  // Check for duplicate email before hashing (hashing is expensive)
  const existing = await User.findOne({ email });
  if (existing) {
    // Use a generic message — don't confirm whether the email exists in our system
    // (that's an account enumeration vulnerability)
    // NOTE: For a security product like AgentShield where operators register
    // internally, we allow slightly more specific messages. Adjust if needed.
    throw new AppError("An account with this email already exists", 409, "CONFLICT");
  }

  const passwordHash = await hashPassword(password);

  const user = await User.create({
    name,
    email,
    passwordHash,
    // role defaults to VIEWER in the schema
    // isActive defaults to true
  });

  logger.info("[auth] New user registered", {
    userId: user._id,
    role: user.role,
    // Never log email in production logs — it's PII
  });

  const token = generateToken(user);

  return { user, token };
};

// ─── Login ────────────────────────────────────────────────────────────────────

/**
 * Authenticate a user by email + password.
 *
 * @param {{ email: string, password: string }} credentials
 * @returns {{ user: object, token: string }}
 */
const login = async ({ email, password }) => {
  // Fetch user including the passwordHash field (which is select:false by default)
  const user = await User.findOne({ email }).select("+passwordHash");

  // SECURITY: Use a single generic error message for both "user not found" and
  // "wrong password". This prevents attackers from confirming valid email addresses
  // (account enumeration). The attacker should not know WHICH check failed.
  if (!user) {
    // Still call bcrypt to prevent timing attacks.
    // If we return immediately when user is not found, an attacker can measure
    // the response time difference to enumerate valid emails.
    await bcrypt.hash("dummy_to_prevent_timing_attack", 12);
    throw new AppError("Invalid email or password", 401, "UNAUTHORIZED");
  }

  const passwordMatch = await verifyPassword(password, user.passwordHash);
  if (!passwordMatch) {
    throw new AppError("Invalid email or password", 401, "UNAUTHORIZED");
  }

  if (!user.isActive) {
    throw new AppError(
      "This account has been suspended. Please contact an administrator.",
      403,
      "ACCOUNT_SUSPENDED"
    );
  }

  // Update lastLoginAt — fire-and-forget is fine here,
  // we don't want a DB write failure to block login
  User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() }).catch((err) => {
    logger.warn("[auth] Failed to update lastLoginAt", { userId: user._id, error: err.message });
  });

  logger.info("[auth] User logged in", { userId: user._id, role: user.role });

  const token = generateToken(user);

  return { user, token };
};

// ─── Get current user ─────────────────────────────────────────────────────────

/**
 * Fetch a user by ID (for the /me endpoint).
 * The user is already on req.user from the authenticate middleware,
 * but this function is provided for completeness and testing.
 *
 * @param {string} userId
 * @returns {object} user document (without passwordHash)
 */
const getUserById = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found", 404, "NOT_FOUND");
  }
  return user;
};

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  register,
  login,
  getUserById,
};
