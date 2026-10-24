/**
 * agents.test.js — Integration tests for /api/v1/agents
 */
process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://localhost:27017/agentshield_test";
process.env.JWT_SECRET = "test_secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

const request = require("supertest");
const createApp = require("../../src/app");
const { connect, clearDatabase, disconnect } = require("../helpers/testDb");
const { createUserWithRole } = require("../helpers/authHelpers");
const Tool = require("../../src/models/Tool");
const Agent = require("../../src/models/Agent");
const { USER_ROLES, AGENT_STATUS, TOOL_TYPES, RISK_LEVELS } = require("../../src/utils/constants");

describe("Agent Endpoints", () => {
  let app;
  let adminToken, adminUser;
  let viewerToken, viewerUser;
  let testTool;

  beforeAll(async () => {
    await connect();
    app = createApp();
  });

  afterEach(clearDatabase);
  afterAll(disconnect);

  // Create fresh users and a test tool before each test
  beforeEach(async () => {
    ({ token: adminToken, user: adminUser } = await createUserWithRole(USER_ROLES.ADMIN));
    ({ token: viewerToken, user: viewerUser } = await createUserWithRole(USER_ROLES.VIEWER, {
      email: "viewer@example.com",
    }));

    testTool = await Tool.create({
      name: "Test Database",
      type: TOOL_TYPES.DATABASE,
      riskLevel: RISK_LEVELS.MEDIUM,
      allowedActions: ["SELECT", "INSERT"],
    });
  });

  const basePayload = () => ({
    name: "CustomerBot",
    description: "Handles customer queries",
    permissions: ["READ_DATABASE", "WRITE_DATABASE"],
  });

  // ── POST /api/v1/agents ────────────────────────────────────────────────────
  describe("POST /api/v1/agents", () => {
    it("ADMIN: should create an agent and return 201", async () => {
      const res = await request(app)
        .post("/api/v1/agents")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(basePayload());

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.agent.name).toBe("CustomerBot");
      expect(res.body.data.agent.status).toBe(AGENT_STATUS.ACTIVE);
    });

    it("ADMIN: should set owner to the authenticated user, not from body", async () => {
      const res = await request(app)
        .post("/api/v1/agents")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...basePayload(), owner: viewerUser._id }); // Client tries to set owner

      expect(res.body.data.agent.owner._id || res.body.data.agent.owner)
        .toBe(adminUser._id.toString()); // Must be the admin, not the viewer
    });

    it("ADMIN: should create agent with valid toolIds", async () => {
      const res = await request(app)
        .post("/api/v1/agents")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...basePayload(), toolIds: [testTool._id.toString()] });

      expect(res.status).toBe(201);
      expect(res.body.data.agent.toolIds).toHaveLength(1);
    });

    it("ADMIN: should reject invalid toolIds (non-existent)", async () => {
      const fakeId = "000000000000000000000001";
      const res = await request(app)
        .post("/api/v1/agents")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...basePayload(), toolIds: [fakeId] });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_TOOL_IDS");
    });

    it("ADMIN: should reject invalid permissions", async () => {
      const res = await request(app)
        .post("/api/v1/agents")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...basePayload(), permissions: ["INVALID_PERMISSION"] });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should default to empty permissions if none provided", async () => {
      const res = await request(app)
        .post("/api/v1/agents")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "EmptyBot" });

      expect(res.status).toBe(201);
      expect(res.body.data.agent.permissions).toEqual([]);
    });

    it("VIEWER: should be FORBIDDEN (403)", async () => {
      const res = await request(app)
        .post("/api/v1/agents")
        .set("Authorization", `Bearer ${viewerToken}`)
        .send(basePayload());

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("should return 401 with no token", async () => {
      const res = await request(app).post("/api/v1/agents").send(basePayload());
      expect(res.status).toBe(401);
    });

    it("should return 409 for duplicate agent name", async () => {
      await request(app)
        .post("/api/v1/agents")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(basePayload());

      const res = await request(app)
        .post("/api/v1/agents")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(basePayload());

      expect(res.status).toBe(409);
    });
  });

  // ── GET /api/v1/agents ─────────────────────────────────────────────────────
  describe("GET /api/v1/agents", () => {
    beforeEach(async () => {
      await request(app)
        .post("/api/v1/agents")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(basePayload());
    });

    it("ADMIN: should list agents with pagination", async () => {
      const res = await request(app)
        .get("/api/v1/agents")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.agents).toHaveLength(1);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.page).toBe(1);
    });

    it("VIEWER: should also be able to list agents (read access)", async () => {
      const res = await request(app)
        .get("/api/v1/agents")
        .set("Authorization", `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
    });

    it("should filter by status", async () => {
      const res = await request(app)
        .get("/api/v1/agents?status=ACTIVE")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.agents.every((a) => a.status === "ACTIVE")).toBe(true);
    });
  });

  // ── GET /api/v1/agents/:id ─────────────────────────────────────────────────
  describe("GET /api/v1/agents/:id", () => {
    it("should return agent by ID", async () => {
      const created = await request(app)
        .post("/api/v1/agents")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(basePayload());

      const agentId = created.body.data.agent._id;

      const res = await request(app)
        .get(`/api/v1/agents/${agentId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.agent._id).toBe(agentId);
    });

    it("should return 404 for non-existent agent", async () => {
      const res = await request(app)
        .get("/api/v1/agents/000000000000000000000001")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it("should return 400 for invalid ID format", async () => {
      const res = await request(app)
        .get("/api/v1/agents/not-an-id")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  // ── PATCH /api/v1/agents/:id ───────────────────────────────────────────────
  describe("PATCH /api/v1/agents/:id", () => {
    let agentId;

    beforeEach(async () => {
      const created = await request(app)
        .post("/api/v1/agents")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(basePayload());
      agentId = created.body.data.agent._id;
    });

    it("ADMIN: should update an agent", async () => {
      const res = await request(app)
        .patch(`/api/v1/agents/${agentId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ description: "Updated description" });

      expect(res.status).toBe(200);
      expect(res.body.data.agent.description).toBe("Updated description");
    });

    it("ADMIN: should be able to suspend agent via status update", async () => {
      const res = await request(app)
        .patch(`/api/v1/agents/${agentId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: AGENT_STATUS.SUSPENDED });

      expect(res.status).toBe(200);
      expect(res.body.data.agent.status).toBe(AGENT_STATUS.SUSPENDED);
    });

    it("VIEWER: should be FORBIDDEN", async () => {
      const res = await request(app)
        .patch(`/api/v1/agents/${agentId}`)
        .set("Authorization", `Bearer ${viewerToken}`)
        .send({ description: "Hack" });

      expect(res.status).toBe(403);
    });

    it("should return 400 for empty update body", async () => {
      const res = await request(app)
        .patch(`/api/v1/agents/${agentId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // ── PATCH /api/v1/agents/:id/suspend ──────────────────────────────────────
  describe("PATCH /api/v1/agents/:id/suspend", () => {
    it("ADMIN: should suspend an agent", async () => {
      const created = await request(app)
        .post("/api/v1/agents")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(basePayload());
      const agentId = created.body.data.agent._id;

      const res = await request(app)
        .patch(`/api/v1/agents/${agentId}/suspend`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ reason: "Suspicious behavior detected" });

      expect(res.status).toBe(200);
      expect(res.body.data.agent.status).toBe(AGENT_STATUS.SUSPENDED);
    });
  });

  // ── DELETE /api/v1/agents/:id ─────────────────────────────────────────────
  describe("DELETE /api/v1/agents/:id", () => {
    it("ADMIN: should soft-disable an agent", async () => {
      const created = await request(app)
        .post("/api/v1/agents")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(basePayload());
      const agentId = created.body.data.agent._id;

      const res = await request(app)
        .delete(`/api/v1/agents/${agentId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);

      // Verify the agent still exists (soft delete) but is DISABLED
      const agent = await Agent.findById(agentId);
      expect(agent).not.toBeNull();
      expect(agent.status).toBe(AGENT_STATUS.DISABLED);
    });

    it("should not allow re-activating a DISABLED agent", async () => {
      const created = await request(app)
        .post("/api/v1/agents")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(basePayload());
      const agentId = created.body.data.agent._id;

      await request(app)
        .delete(`/api/v1/agents/${agentId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      const res = await request(app)
        .patch(`/api/v1/agents/${agentId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: AGENT_STATUS.ACTIVE });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("INVALID_STATUS_TRANSITION");
    });
  });

  // ── hasPermission + hasTool instance methods ──────────────────────────────
  describe("Agent model instance methods", () => {
    it("hasPermission should return true for granted permissions", async () => {
      const agent = await Agent.create({
        name: "TestBot",
        owner: adminUser._id,
        permissions: ["READ_DATABASE", "SEND_EMAIL"],
      });

      expect(agent.hasPermission("READ_DATABASE")).toBe(true);
      expect(agent.hasPermission("DELETE_DATABASE")).toBe(false);
    });

    it("hasTool should correctly check tool assignment", async () => {
      const agent = await Agent.create({
        name: "TestBot2",
        owner: adminUser._id,
        toolIds: [testTool._id],
      });

      expect(agent.hasTool(testTool._id)).toBe(true);
    });

    it("isOperational should return false for suspended agents", async () => {
      const agent = await Agent.create({
        name: "SuspendedBot",
        owner: adminUser._id,
        status: AGENT_STATUS.SUSPENDED,
      });

      expect(agent.isOperational()).toBe(false);
    });
  });
});
