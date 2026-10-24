/**
 * authHelpers.js — Utilities for creating test users and obtaining tokens.
 *
 * Avoids duplicating register+login boilerplate across every test file.
 */
const request = require("supertest");
const jwt = require("jsonwebtoken");
const User = require("../../src/models/User");
const { USER_ROLES } = require("../../src/utils/constants");

/**
 * Register a user via the API and return their token.
 * @param {object} app        — Express app
 * @param {object} [override] — Fields to override
 */
const registerAndLogin = async (app, override = {}) => {
  const defaults = {
    name: "Test User",
    email: "testuser@example.com",
    password: "Secure123",
  };
  const payload = { ...defaults, ...override };

  const res = await request(app)
    .post("/api/v1/auth/register")
    .send(payload);

  if (!res.body.data?.token) {
    throw new Error(`registerAndLogin failed: ${JSON.stringify(res.body)}`);
  }

  return { token: res.body.data.token, user: res.body.data.user };
};

/**
 * Create a user directly in the DB with a given role, then generate a token.
 * Used to test ADMIN/ANALYST behaviour without having to go through the
 * register endpoint (which always creates VIEWER).
 *
 * @param {string} role — One of USER_ROLES
 * @param {object} [extra] — Additional User fields
 */
const createUserWithRole = async (role, extra = {}) => {
  const bcrypt = require("bcryptjs");
  const hash = await bcrypt.hash("Secure123", 12);

  const user = await User.create({
    name: `${role} User`,
    email: `${role.toLowerCase()}@example.com`,
    passwordHash: hash,
    role,
    ...extra,
  });

  const token = jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  return { user, token };
};

module.exports = { registerAndLogin, createUserWithRole };
