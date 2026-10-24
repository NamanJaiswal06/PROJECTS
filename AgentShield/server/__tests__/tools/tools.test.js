/**
 * tools.test.js — Integration tests for /api/v1/tools
 */
process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://localhost:27017/agentshield_test";
process.env.JWT_SECRET = "test_secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

const request = require("supertest");
const createApp = require("../../src/app");
const { connect, clearDatabase, disconnect } = require("../helpers/testDb");
const { createUserWithRole } = require("../helpers/authHelpers");
const Tool = require("../../src/models/Tool");
const { USER_ROLES, TOOL_TYPES, RISK_LEVELS } = require("../../src/utils/constants");

describe("Tool Endpoints", () => {
  let app;
  let adminToken;
  let viewerToken;

  beforeAll(async () => {
    await connect();
    app = createApp();
  });

  afterEach(clearDatabase);
  afterAll(disconnect);

  beforeEach(async () => {
    ({ token: adminToken } = await createUserWithRole(USER_ROLES.ADMIN));
    ({ token: viewerToken } = await createUserWithRole(USER_ROLES.VIEWER, {
      email: "viewer@example.com",
    }));
  });

  const validTool = () => ({
    name: "Production PostgreSQL",
    description: "Main customer database",
    type: TOOL_TYPES.DATABASE,
    riskLevel: RISK_LEVELS.HIGH,
    allowedActions: ["SELECT", "INSERT", "UPDATE"],
  });

  // ── POST /api/v1/tools ─────────────────────────────────────────────────────
  describe("POST /api/v1/tools", () => {
    it("ADMIN: should create a tool and return 201", async () => {
      const res = await request(app)
        .post("/api/v1/tools")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(validTool());

      expect(res.status).toBe(201);
      expect(res.body.data.tool.name).toBe("Production PostgreSQL");
      expect(res.body.data.tool.riskLevel).toBe(RISK_LEVELS.HIGH);
      // allowedActions should be uppercased
      expect(res.body.data.tool.allowedActions).toEqual(["SELECT", "INSERT", "UPDATE"]);
    });

    it("ADMIN: should uppercase allowedActions regardless of input case", async () => {
      const res = await request(app)
        .post("/api/v1/tools")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...validTool(), allowedActions: ["select", "Insert", "UPDATE"] });

      expect(res.status).toBe(201);
      expect(res.body.data.tool.allowedActions).toEqual(["SELECT", "INSERT", "UPDATE"]);
    });

    it("VIEWER: should be FORBIDDEN", async () => {
      const res = await request(app)
        .post("/api/v1/tools")
        .set("Authorization", `Bearer ${viewerToken}`)
        .send(validTool());

      expect(res.status).toBe(403);
    });

    it("should return 400 when type is missing", async () => {
      const { type, ...payload } = validTool();
      const res = await request(app)
        .post("/api/v1/tools")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 for invalid tool type", async () => {
      const res = await request(app)
        .post("/api/v1/tools")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...validTool(), type: "INVALID_TYPE" });

      expect(res.status).toBe(400);
    });

    it("should return 400 when allowedActions is empty", async () => {
      const res = await request(app)
        .post("/api/v1/tools")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...validTool(), allowedActions: [] });

      expect(res.status).toBe(400);
    });

    it("should return 409 for duplicate tool name", async () => {
      await request(app)
        .post("/api/v1/tools")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(validTool());

      const res = await request(app)
        .post("/api/v1/tools")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(validTool());

      expect(res.status).toBe(409);
    });
  });

  // ── GET /api/v1/tools ─────────────────────────────────────────────────────
  describe("GET /api/v1/tools", () => {
    beforeEach(async () => {
      await Tool.create([
        { name: "PG Main", type: TOOL_TYPES.DATABASE, riskLevel: RISK_LEVELS.HIGH, allowedActions: ["SELECT"] },
        { name: "SendGrid", type: TOOL_TYPES.EMAIL, riskLevel: RISK_LEVELS.LOW, allowedActions: ["SEND"] },
        { name: "Stripe", type: TOOL_TYPES.PAYMENT, riskLevel: RISK_LEVELS.CRITICAL, allowedActions: ["CHARGE"] },
      ]);
    });

    it("VIEWER: should be able to list tools", async () => {
      const res = await request(app)
        .get("/api/v1/tools")
        .set("Authorization", `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.tools).toHaveLength(3);
    });

    it("should filter by type", async () => {
      const res = await request(app)
        .get("/api/v1/tools?type=DATABASE")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.tools).toHaveLength(1);
      expect(res.body.data.tools[0].type).toBe(TOOL_TYPES.DATABASE);
    });

    it("should filter by riskLevel", async () => {
      const res = await request(app)
        .get("/api/v1/tools?riskLevel=CRITICAL")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.tools).toHaveLength(1);
      expect(res.body.data.tools[0].riskLevel).toBe(RISK_LEVELS.CRITICAL);
    });
  });

  // ── GET /api/v1/tools/:id ─────────────────────────────────────────────────
  describe("GET /api/v1/tools/:id", () => {
    it("should return a tool by ID", async () => {
      const tool = await Tool.create(validTool());

      const res = await request(app)
        .get(`/api/v1/tools/${tool._id}`)
        .set("Authorization", `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.tool.name).toBe(tool.name);
    });

    it("should return 404 for unknown tool", async () => {
      const res = await request(app)
        .get("/api/v1/tools/000000000000000000000001")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ── PATCH /api/v1/tools/:id ───────────────────────────────────────────────
  describe("PATCH /api/v1/tools/:id", () => {
    it("ADMIN: should update riskLevel", async () => {
      const tool = await Tool.create(validTool());

      const res = await request(app)
        .patch(`/api/v1/tools/${tool._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ riskLevel: RISK_LEVELS.CRITICAL });

      expect(res.status).toBe(200);
      expect(res.body.data.tool.riskLevel).toBe(RISK_LEVELS.CRITICAL);
    });

    it("ADMIN: should be able to deactivate a tool via isActive", async () => {
      const tool = await Tool.create(validTool());

      const res = await request(app)
        .patch(`/api/v1/tools/${tool._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.data.tool.isActive).toBe(false);
    });

    it("VIEWER: should be FORBIDDEN", async () => {
      const tool = await Tool.create(validTool());

      const res = await request(app)
        .patch(`/api/v1/tools/${tool._id}`)
        .set("Authorization", `Bearer ${viewerToken}`)
        .send({ riskLevel: RISK_LEVELS.LOW });

      expect(res.status).toBe(403);
    });
  });

  // ── DELETE /api/v1/tools/:id ──────────────────────────────────────────────
  describe("DELETE /api/v1/tools/:id", () => {
    it("ADMIN: should soft-deactivate a tool", async () => {
      const tool = await Tool.create(validTool());

      const res = await request(app)
        .delete(`/api/v1/tools/${tool._id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);

      const updated = await Tool.findById(tool._id);
      expect(updated.isActive).toBe(false);
    });
  });

  // ── isActionAllowed instance method ───────────────────────────────────────
  describe("Tool model isActionAllowed()", () => {
    it("should return true for allowed actions", async () => {
      const tool = await Tool.create(validTool());
      expect(tool.isActionAllowed("SELECT")).toBe(true);
      expect(tool.isActionAllowed("select")).toBe(true); // case-insensitive
    });

    it("should return false for disallowed actions", async () => {
      const tool = await Tool.create(validTool());
      expect(tool.isActionAllowed("DELETE")).toBe(false);
      expect(tool.isActionAllowed("DROP")).toBe(false);
    });
  });
});
