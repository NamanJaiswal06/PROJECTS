/**
 * policies.test.js — Integration tests for /api/v1/policies (CRUD)
 */
process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://localhost:27017/agentshield_test";
process.env.JWT_SECRET = "test_secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

const request = require("supertest");
const createApp = require("../../src/app");
const { connect, clearDatabase, disconnect } = require("../helpers/testDb");
const { createUserWithRole } = require("../helpers/authHelpers");
const { USER_ROLES, POLICY_EFFECTS } = require("../../src/utils/constants");

describe("Policy CRUD Endpoints", () => {
  let app;
  let adminToken, analystToken, viewerToken;

  beforeAll(async () => {
    await connect();
    app = createApp();
  });

  afterEach(clearDatabase);
  afterAll(disconnect);

  beforeEach(async () => {
    ({ token: adminToken } = await createUserWithRole(USER_ROLES.ADMIN));
    ({ token: analystToken } = await createUserWithRole(USER_ROLES.ANALYST, { email: "analyst@example.com" }));
    ({ token: viewerToken } = await createUserWithRole(USER_ROLES.VIEWER, { email: "viewer@example.com" }));
  });

  const bulkDeletePolicy = () => ({
    name: "Bulk Delete Protection",
    description: "Any deletion affecting 100+ records requires approval",
    priority: 100,
    conditions: [
      { field: "action.type", operator: "contains", value: "DELETE" },
      { field: "action.parameters.count", operator: "gte", value: 100 },
    ],
    effect: POLICY_EFFECTS.REQUIRE_APPROVAL,
  });

  // ── POST /api/v1/policies ──────────────────────────────────────────────────
  describe("POST /api/v1/policies", () => {
    it("ADMIN: should create a policy and return 201", async () => {
      const res = await request(app)
        .post("/api/v1/policies")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(bulkDeletePolicy());

      expect(res.status).toBe(201);
      expect(res.body.data.policy.name).toBe("Bulk Delete Protection");
      expect(res.body.data.policy.effect).toBe(POLICY_EFFECTS.REQUIRE_APPROVAL);
      expect(res.body.data.policy.enabled).toBe(true);
      expect(res.body.data.policy.priority).toBe(100);
    });

    it("ADMIN: createdBy should be set to the authenticated user", async () => {
      const res = await request(app)
        .post("/api/v1/policies")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(bulkDeletePolicy());

      expect(res.body.data.policy.createdBy).toBeDefined();
    });

    it("ANALYST: should be FORBIDDEN to create policies", async () => {
      const res = await request(app)
        .post("/api/v1/policies")
        .set("Authorization", `Bearer ${analystToken}`)
        .send(bulkDeletePolicy());

      expect(res.status).toBe(403);
    });

    it("VIEWER: should be FORBIDDEN", async () => {
      const res = await request(app)
        .post("/api/v1/policies")
        .set("Authorization", `Bearer ${viewerToken}`)
        .send(bulkDeletePolicy());

      expect(res.status).toBe(403);
    });

    it("should return 400 when conditions is empty", async () => {
      const res = await request(app)
        .post("/api/v1/policies")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...bulkDeletePolicy(), conditions: [] });

      expect(res.status).toBe(400);
    });

    it("should return 400 for invalid condition operator", async () => {
      const res = await request(app)
        .post("/api/v1/policies")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          ...bulkDeletePolicy(),
          conditions: [{ field: "action.type", operator: "INVALID_OP", value: "DELETE" }],
        });

      expect(res.status).toBe(400);
    });

    it("should return 400 for invalid effect", async () => {
      const res = await request(app)
        .post("/api/v1/policies")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...bulkDeletePolicy(), effect: "MAYBE" });

      expect(res.status).toBe(400);
    });

    it("should return 409 for duplicate policy name", async () => {
      await request(app)
        .post("/api/v1/policies")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(bulkDeletePolicy());

      const res = await request(app)
        .post("/api/v1/policies")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(bulkDeletePolicy());

      expect(res.status).toBe(409);
    });
  });

  // ── GET /api/v1/policies ───────────────────────────────────────────────────
  describe("GET /api/v1/policies", () => {
    beforeEach(async () => {
      await request(app)
        .post("/api/v1/policies")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(bulkDeletePolicy());
    });

    it("ADMIN: should list policies", async () => {
      const res = await request(app)
        .get("/api/v1/policies")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.policies).toHaveLength(1);
    });

    it("ANALYST: should be able to list policies", async () => {
      const res = await request(app)
        .get("/api/v1/policies")
        .set("Authorization", `Bearer ${analystToken}`);

      expect(res.status).toBe(200);
    });

    it("VIEWER: should be FORBIDDEN from reading policies", async () => {
      const res = await request(app)
        .get("/api/v1/policies")
        .set("Authorization", `Bearer ${viewerToken}`);

      expect(res.status).toBe(403);
    });

    it("should filter by effect", async () => {
      const res = await request(app)
        .get(`/api/v1/policies?effect=${POLICY_EFFECTS.REQUIRE_APPROVAL}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.body.data.policies.every((p) => p.effect === POLICY_EFFECTS.REQUIRE_APPROVAL)).toBe(true);
    });
  });

  // ── PATCH /api/v1/policies/:id ─────────────────────────────────────────────
  describe("PATCH /api/v1/policies/:id", () => {
    let policyId;

    beforeEach(async () => {
      const created = await request(app)
        .post("/api/v1/policies")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(bulkDeletePolicy());
      policyId = created.body.data.policy._id;
    });

    it("ADMIN: should update a policy", async () => {
      const res = await request(app)
        .patch(`/api/v1/policies/${policyId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ priority: 200, description: "Updated" });

      expect(res.status).toBe(200);
      expect(res.body.data.policy.priority).toBe(200);
    });

    it("ADMIN: should be able to disable a policy", async () => {
      const res = await request(app)
        .patch(`/api/v1/policies/${policyId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ enabled: false });

      expect(res.body.data.policy.enabled).toBe(false);
    });
  });

  // ── PATCH /api/v1/policies/:id/toggle ─────────────────────────────────────
  describe("PATCH /api/v1/policies/:id/toggle", () => {
    it("ADMIN: should toggle policy enabled state", async () => {
      const created = await request(app)
        .post("/api/v1/policies")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(bulkDeletePolicy());
      const policyId = created.body.data.policy._id;

      // Disable it
      const res = await request(app)
        .patch(`/api/v1/policies/${policyId}/toggle`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ enabled: false });

      expect(res.status).toBe(200);
      expect(res.body.data.policy.enabled).toBe(false);

      // Re-enable it
      const res2 = await request(app)
        .patch(`/api/v1/policies/${policyId}/toggle`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ enabled: true });

      expect(res2.body.data.policy.enabled).toBe(true);
    });
  });

  // ── DELETE /api/v1/policies/:id ───────────────────────────────────────────
  describe("DELETE /api/v1/policies/:id", () => {
    it("ADMIN: should hard-delete a policy", async () => {
      const created = await request(app)
        .post("/api/v1/policies")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(bulkDeletePolicy());
      const policyId = created.body.data.policy._id;

      const res = await request(app)
        .delete(`/api/v1/policies/${policyId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);

      // Verify actually deleted (hard delete)
      const getRes = await request(app)
        .get(`/api/v1/policies/${policyId}`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(getRes.status).toBe(404);
    });
  });
});
