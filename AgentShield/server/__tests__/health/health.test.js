/**
 * health.test.js — Integration tests for the health check endpoints.
 *
 * These are the first tests we write to verify Phase 1 is working.
 * We use supertest to send real HTTP requests to the Express app
 * WITHOUT starting a live server (no port binding needed).
 *
 * Note on MongoDB in tests:
 *   These health tests don't require a real MongoDB connection.
 *   The readiness check will report NOT_READY (503) unless
 *   a real connection is established. That's correct behavior.
 *
 *   Future test phases will use an in-memory MongoDB (mongodb-memory-server)
 *   for full integration tests.
 */

// Set test environment before anything loads env.js
process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://localhost:27017/agentshield_test";
process.env.JWT_SECRET = "test_secret_at_least_64_chars_long_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

const request = require("supertest");
const createApp = require("../../src/app");

describe("Health Endpoints", () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  // ── GET /api/v1/health ─────────────────────────────────────────────────────
  describe("GET /api/v1/health", () => {
    it("should return 200 with success = true", async () => {
      const res = await request(app).get("/api/v1/health");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("AgentShield API is healthy");
    });

    it("should return a timestamp in ISO format", async () => {
      const res = await request(app).get("/api/v1/health");

      expect(res.body.data).toBeDefined();
      expect(res.body.data.timestamp).toBeDefined();
      // Should be a valid ISO date string
      expect(() => new Date(res.body.data.timestamp)).not.toThrow();
    });

    it("should return the environment field", async () => {
      const res = await request(app).get("/api/v1/health");
      expect(res.body.data.environment).toBe("test");
    });
  });

  // ── GET /api/v1/health/ready ───────────────────────────────────────────────
  describe("GET /api/v1/health/ready", () => {
    it("should return 503 when MongoDB is not connected", async () => {
      const res = await request(app).get("/api/v1/health/ready");

      // Not connected in tests = 503 Not Ready
      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.data.status).toBe("NOT_READY");
    });
  });

  // ── 404 for unknown routes ─────────────────────────────────────────────────
  describe("Unknown routes", () => {
    it("should return 404 JSON for unknown GET routes", async () => {
      const res = await request(app).get("/api/v1/does-not-exist");

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("should return 404 JSON for unknown POST routes", async () => {
      const res = await request(app).post("/api/v1/does-not-exist");

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ── Response format consistency ────────────────────────────────────────────
  describe("Response format", () => {
    it("should always return JSON content-type", async () => {
      const res = await request(app).get("/api/v1/health");
      expect(res.headers["content-type"]).toMatch(/application\/json/);
    });

    it("should include security headers from Helmet", async () => {
      const res = await request(app).get("/api/v1/health");
      // Helmet sets this to prevent MIME sniffing
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
    });
  });

  // ── Root route ─────────────────────────────────────────────────────────────
  describe("GET /", () => {
    it("should return a welcome message", async () => {
      const res = await request(app).get("/");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("AgentShield");
    });
  });
});
