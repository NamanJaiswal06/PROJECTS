"use strict";
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { loginSchema, registerSchema } = require("../validators/auth.validator");
const { success, failure } = require("../utils/apiResponse");

const SALT_ROUNDS = 12;

/**
 * POST /api/auth/register
 * Public — registers a new teacher or student account.
 *
 * Note: For a one-classroom demo, teacher accounts can be seeded via `npm run seed`.
 * This endpoint allows self-registration for both roles, but can be restricted
 * to students-only by uncommenting the role check below.
 */
const register = async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      const messages = parsed.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return failure(res, 400, messages);
    }

    const { name, email, password, role } = parsed.data;

    // Check if email is already taken
    const existing = await User.findOne({ email });
    if (existing) {
      return failure(res, 409, "An account with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({ name, email, passwordHash, role });

    // Issue JWT immediately so the user is logged in after registration
    const token = jwt.sign(
      { userId: user._id.toString(), role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );

    return success(res, 201, "Registration successful", {
      user: user.toSafeObject(),
      token,
    });
  } catch (err) {
    // Mongoose duplicate key (race condition fallback)
    if (err.code === 11000) {
      return failure(res, 409, "An account with this email already exists.");
    }
    next(err);
  }
};

/**
 * POST /api/auth/login
 * Public — returns JWT and safe user object
 */
const login = async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const messages = parsed.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return failure(res, 400, messages);
    }

    const { email, password } = parsed.data;

    const user = await User.findOne({ email });
    if (!user) {
      return failure(res, 401, "Invalid email or password.");
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return failure(res, 401, "Invalid email or password.");
    }

    const token = jwt.sign(
      { userId: user._id.toString(), role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );

    return success(res, 200, "Login successful", {
      user: user.toSafeObject(),
      token,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 * Authenticated — returns the current user's safe profile
 */
const getMe = async (req, res, next) => {
  try {
    // req.user is set by authenticateToken middleware (already excludes passwordHash)
    return success(res, 200, "User profile retrieved", req.user.toSafeObject());
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe };
