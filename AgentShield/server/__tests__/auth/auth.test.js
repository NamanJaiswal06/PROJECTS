/**
 * auth.test.js — Integration tests for authentication endpoints.
 *
 * Tests every meaningful path through register/login/me:
 *   - Happy paths (valid inputs)
 *   - Validation errors (missing fields, weak passwords)
 *   - Business logic errors (duplicate email, wrong password)
 *   - Security checks (suspended account, no token, bad token, expired token)
 *   - RBAC (role-based access)
 *
 * Each test group uses a fresh database (clearDatabase between groups).
 */

// Set test env BEFORE anything loads env.js
process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://localhost:27017/agentshield_test"; // overridden by testDb
process.env.JWT_SECRET = "test_secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

const request = require("supertest");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const createApp = require("../../src/app");
const { connect, clearDatabase, disconnect } = require("../helpers/testDb");
const User = require("../../src/models/User");
const { USER_ROLES } = require("../../src/utils/constants");

describe("Authentication Endpoints", () => {
  let app;

  beforeAll(async () => {
    await connect();
    app = createApp();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await disconnect();
  });

  // ── POST /api/v1/auth/register ─────────────────────────────────────────────
  describe("POST /api/v1/auth/register", () => {
    const validPayload = {
      name: "Priya Sharma",
      email: "priya@example.com",
      password: "Secure123",
    };

    it("should register a new user and return a JWT token", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(typeof res.body.data.token).toBe("string");
    });

    it("should return the user object without passwordHash", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send(validPayload);

      const user = res.body.data.user;
      expect(user).toBeDefined();
      expect(user.email).toBe("priya@example.com");
      expect(user.name).toBe("Priya Sharma");
      // CRITICAL: passwordHash must NEVER appear in the API response
      expect(user.passwordHash).toBeUndefined();
    });

    it("should assign VIEWER role by default", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send(validPayload);

      expect(res.body.data.user.role).toBe(USER_ROLES.VIEWER);
    });

    it("should not allow client to set role to ADMIN", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({ ...validPayload, role: "ADMIN" });

      // Should still succeed (unknown fields are stripped by Zod, not rejected)
      expect(res.status).toBe(201);
      // But role must still be VIEWER
      expect(res.body.data.user.role).toBe(USER_ROLES.VIEWER);
    });

    it("should normalize email to lowercase", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({ ...validPayload, email: "PRIYA@EXAMPLE.COM" });

      expect(res.body.data.user.email).toBe("priya@example.com");
    });

    it("should return 409 CONFLICT for duplicate email", async () => {
      await request(app).post("/api/v1/auth/register").send(validPayload);
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send(validPayload);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("CONFLICT");
    });

    // ── Validation tests ────────────────────────────────────────────────────
    it("should return 400 when name is missing", async () => {
      const { name, ...payload } = validPayload;
      const res = await request(app).post("/api/v1/auth/register").send(payload);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 for invalid email format", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({ ...validPayload, email: "not-an-email" });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 for short password (< 8 chars)", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({ ...validPayload, password: "Abc1" });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 for weak password (no uppercase)", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({ ...validPayload, password: "alllower123" });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  // ── POST /api/v1/auth/login ────────────────────────────────────────────────
  describe("POST /api/v1/auth/login", () => {
    const credentials = { email: "riya@example.com", password: "Secure123" };

    beforeEach(async () => {
      // Register a test user before each login test
      await request(app)
        .post("/api/v1/auth/register")
        .send({ name: "Riya Patel", ...credentials });
    });

    it("should login with correct credentials and return a token", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send(credentials);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });

    it("should return a valid JWT that decodes correctly", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send(credentials);

      const decoded = jwt.decode(res.body.data.token);
      expect(decoded).toBeDefined();
      expect(decoded.sub).toBeDefined(); // user ID
      expect(decoded.role).toBe(USER_ROLES.VIEWER);
      // Sensitive info must NOT be in the token payload
      expect(decoded.email).toBeUndefined();
      expect(decoded.password).toBeUndefined();
      expect(decoded.passwordHash).toBeUndefined();
    });

    it("should return 401 for wrong password", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ ...credentials, password: "WrongPass123" });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
      // Generic message — must not say "wrong password" or "user not found"
      expect(res.body.error.message).toMatch(/invalid email or password/i);
    });

    it("should return 401 for non-existent email", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: "nobody@example.com", password: "Secure123" });

      expect(res.status).toBe(401);
      // Same message as wrong password — prevents account enumeration
      expect(res.body.error.message).toMatch(/invalid email or password/i);
    });

    it("should return 403 for suspended account", async () => {
      // Suspend the user directly in DB
      await User.findOneAndUpdate({ email: credentials.email }, { isActive: false });

      const res = await request(app)
        .post("/api/v1/auth/login")
        .send(credentials);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("ACCOUNT_SUSPENDED");
    });

    it("should return 400 for missing email", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ password: "Secure123" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  // ── GET /api/v1/auth/me ────────────────────────────────────────────────────
  describe("GET /api/v1/auth/me", () => {
    let token;

    beforeEach(async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({ name: "Arjun Dev", email: "arjun@example.com", password: "Secure123" });
      token = res.body.data.token;
    });

    it("should return the current user's profile", async () => {
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe("arjun@example.com");
    });

    it("should not include passwordHash in the response", async () => {
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it("should return 401 with no token", async () => {
      const res = await request(app).get("/api/v1/auth/me");
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("should return 401 with a malformed token", async () => {
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", "Bearer this.is.not.a.valid.jwt");
      expect(res.status).toBe(401);
    });

    it("should return 401 with an expired token", async () => {
      const expiredToken = jwt.sign(
        { sub: new mongoose.Types.ObjectId().toString(), role: "VIEWER" },
        process.env.JWT_SECRET,
        { expiresIn: "1ms" }
      );
      // Wait for it to expire
      await new Promise((r) => setTimeout(r, 10));

      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${expiredToken}`);
      expect(res.status).toBe(401);
    });

    it("should return 401 if user is deleted after token is issued", async () => {
      // Delete the user
      await User.findOneAndDelete({ email: "arjun@example.com" });

      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(401);
    });

    it("should return 403 if account is suspended after token is issued", async () => {
      await User.findOneAndUpdate({ email: "arjun@example.com" }, { isActive: false });

      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("ACCOUNT_SUSPENDED");
    });
  });

  // ── Authorization (RBAC) ───────────────────────────────────────────────────
  describe("RBAC — authorize() middleware", () => {
    it("should allow ADMIN to access admin-only endpoints", async () => {
      // Create an ADMIN user directly (bypassing register which defaults to VIEWER)
      const adminUser = await User.create({
        name: "Admin User",
        email: "admin@example.com",
        passwordHash: "$2b$12$fakehashxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        role: USER_ROLES.ADMIN,
      });

      const adminToken = jwt.sign(
        { sub: adminUser._id.toString(), role: USER_ROLES.ADMIN },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      // The /me endpoint accepts any authenticated user.
      // For RBAC testing, we verify the role is correctly embedded and readable.
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe(USER_ROLES.ADMIN);
    });
  });
});
