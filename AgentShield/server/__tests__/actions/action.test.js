/**
 * action.test.js — Integration tests for the Action Evaluation Gateway.
 *
 * These tests verify the full pipeline from HTTP request → decision.
 * Every test creates a real Agent, Tool, and optionally Policies in the DB.
 *
 * Test groups:
 *   1. Hard checks (agent not active, tool inactive, action not allowed, etc.)
 *   2. Policy integration (ALLOW / REQUIRE_APPROVAL / BLOCK from policies)
 *   3. Risk scoring (verify score reflects context inputs)
 *   4. Audit trail (action record written with correct fields)
 *   5. Audit log endpoints (GET /actions, GET /actions/:id)
 */
process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://localhost:27017/agentshield_test";
process.env.JWT_SECRET = "test_secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

const request = require("supertest");
const createApp = require("../../src/app");
const { connect, clearDatabase, disconnect } = require("../helpers/testDb");
const { createUserWithRole } = require("../helpers/authHelpers");
const Agent = require("../../src/models/Agent");
const Tool = require("../../src/models/Tool");
const Action = require("../../src/models/Action");
const Policy = require("../../src/models/Policy");
const {
  USER_ROLES, AGENT_STATUS, TOOL_TYPES, RISK_LEVELS,
  DECISIONS, APPROVAL_STATUS, POLICY_EFFECTS,
} = require("../../src/utils/constants");

// Wait helper — for fire-and-forget audit writes to settle
const waitMs = (ms) => new Promise((r) => setTimeout(r, ms));

describe("Action Evaluation Gateway", () => {
  let app;
  let adminToken, adminUser;
  let analystToken;
  let testAgent, testTool;

  beforeAll(async () => {
    await connect();
    app = createApp();
  });

  afterEach(clearDatabase);
  afterAll(disconnect);

  // ── Before each test: fresh agent + tool ────────────────────────────────────
  beforeEach(async () => {
    ({ token: adminToken, user: adminUser } = await createUserWithRole(USER_ROLES.ADMIN));
    ({ token: analystToken } = await createUserWithRole(USER_ROLES.ANALYST, {
      email: "analyst@example.com",
    }));

    // Create a test tool
    testTool = await Tool.create({
      name: "Production DB",
      type: TOOL_TYPES.DATABASE,
      riskLevel: RISK_LEVELS.HIGH,
      allowedActions: ["SELECT", "INSERT", "UPDATE", "DELETE"],
    });

    // Create a test agent linked to the tool
    testAgent = await Agent.create({
      name: "DataBot",
      owner: adminUser._id,
      status: AGENT_STATUS.ACTIVE,
      permissions: ["READ_DATABASE", "WRITE_DATABASE", "DELETE_DATABASE"],
      toolIds: [testTool._id],
    });
  });

  // Base evaluate request body (safe defaults)
  const baseEvaluateBody = () => ({
    agentId: testAgent._id.toString(),
    toolId: testTool._id.toString(),
    actionType: "SELECT",
    parameters: { query: "SELECT * FROM users WHERE active = true" },
    reason: "Fetch active users for report",
    resource: {
      sensitivity: "LOW",
      recordCount: 100,
      reversible: true,
      destination: "internal",
    },
  });

  // ── POST /api/v1/actions/evaluate ──────────────────────────────────────────
  describe("POST /api/v1/actions/evaluate — Hard Checks", () => {

    it("should return ALLOW for a valid, unrestricted action", async () => {
      const res = await request(app)
        .post("/api/v1/actions/evaluate")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(baseEvaluateBody());

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.decision).toBe(DECISIONS.ALLOW);
      expect(res.body.data.hardCheckResult.passed).toBe(true);
      expect(res.body.data.riskScore).toBeGreaterThan(0);
    });

    it("should normalise actionType to uppercase", async () => {
      const res = await request(app)
        .post("/api/v1/actions/evaluate")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...baseEvaluateBody(), actionType: "select" });

      expect(res.status).toBe(200);
      expect(res.body.data.actionType).toBe("SELECT");
    });

    it("HARD BLOCK: should return BLOCK when agent does not exist", async () => {
      const res = await request(app)
        .post("/api/v1/actions/evaluate")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...baseEvaluateBody(), agentId: "000000000000000000000001" });

      expect(res.status).toBe(200);
      expect(res.body.data.decision).toBe(DECISIONS.BLOCK);
      expect(res.body.data.hardCheckResult.passed).toBe(false);
      expect(res.body.data.hardCheckResult.failedCheck).toBe("AGENT_NOT_FOUND");
    });

    it("HARD BLOCK: should return BLOCK when agent is SUSPENDED", async () => {
      await Agent.findByIdAndUpdate(testAgent._id, { status: AGENT_STATUS.SUSPENDED });

      const res = await request(app)
        .post("/api/v1/actions/evaluate")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(baseEvaluateBody());

      expect(res.status).toBe(200);
      expect(res.body.data.decision).toBe(DECISIONS.BLOCK);
      expect(res.body.data.hardCheckResult.failedCheck).toBe("AGENT_NOT_ACTIVE");
    });

    it("HARD BLOCK: should return BLOCK when agent does not have the tool", async () => {
      // Create a different tool not linked to the agent
      const otherTool = await Tool.create({
        name: "Email Service",
        type: TOOL_TYPES.EMAIL,
        riskLevel: RISK_LEVELS.LOW,
        allowedActions: ["SEND"],
      });

      const res = await request(app)
        .post("/api/v1/actions/evaluate")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...baseEvaluateBody(), toolId: otherTool._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.data.decision).toBe(DECISIONS.BLOCK);
      expect(res.body.data.hardCheckResult.failedCheck).toBe("AGENT_MISSING_TOOL");
    });

    it("HARD BLOCK: should return BLOCK when tool is deactivated", async () => {
      await Tool.findByIdAndUpdate(testTool._id, { isActive: false });

      const res = await request(app)
        .post("/api/v1/actions/evaluate")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(baseEvaluateBody());

      expect(res.status).toBe(200);
      expect(res.body.data.decision).toBe(DECISIONS.BLOCK);
      expect(res.body.data.hardCheckResult.failedCheck).toBe("TOOL_INACTIVE");
    });

    it("HARD BLOCK: should return BLOCK when action not in tool.allowedActions", async () => {
      const res = await request(app)
        .post("/api/v1/actions/evaluate")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...baseEvaluateBody(), actionType: "DROP" }); // not in allowedActions

      expect(res.status).toBe(200);
      expect(res.body.data.decision).toBe(DECISIONS.BLOCK);
      expect(res.body.data.hardCheckResult.failedCheck).toBe("ACTION_NOT_ALLOWED");
    });

    it("should return 401 when not authenticated", async () => {
      const res = await request(app)
        .post("/api/v1/actions/evaluate")
        .send(baseEvaluateBody());

      expect(res.status).toBe(401);
    });

    it("should return 400 when agentId is missing", async () => {
      const { agentId, ...body } = baseEvaluateBody();
      const res = await request(app)
        .post("/api/v1/actions/evaluate")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(body);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  // ── Policy integration ─────────────────────────────────────────────────────
  describe("POST /api/v1/actions/evaluate — Policy Integration", () => {

    it("REQUIRE_APPROVAL: bulk delete policy triggers approval requirement", async () => {
      await Policy.create({
        name: "Bulk Delete Approval",
        priority: 100,
        conditions: [
          { field: "action.type", operator: "contains", value: "DELETE" },
          { field: "resource.recordCount", operator: "gte", value: 100 },
        ],
        effect: POLICY_EFFECTS.REQUIRE_APPROVAL,
        createdBy: adminUser._id,
      });

      const res = await request(app)
        .post("/api/v1/actions/evaluate")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          ...baseEvaluateBody(),
          actionType: "DELETE",
          resource: { recordCount: 12000, reversible: false, sensitivity: "HIGH", destination: "internal" },
        });

      expect(res.status).toBe(200);
      expect(res.body.data.decision).toBe(DECISIONS.REQUIRE_APPROVAL);
      expect(res.body.data.approvalStatus).toBe(APPROVAL_STATUS.PENDING);
      expect(res.body.data.policyResult.violations).toHaveLength(1);
    });

    it("BLOCK: data exfiltration policy blocks external + HIGH sensitivity", async () => {
      await Policy.create({
        name: "Data Exfiltration Prevention",
        priority: 200,
        conditions: [
          { field: "resource.destination", operator: "eq", value: "external" },
          { field: "resource.sensitivity", operator: "in", value: ["HIGH", "CRITICAL"] },
        ],
        effect: POLICY_EFFECTS.BLOCK,
        createdBy: adminUser._id,
      });

      const res = await request(app)
        .post("/api/v1/actions/evaluate")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          ...baseEvaluateBody(),
          resource: { sensitivity: "HIGH", destination: "external", reversible: false },
        });

      expect(res.status).toBe(200);
      expect(res.body.data.decision).toBe(DECISIONS.BLOCK);
      expect(res.body.data.decisionReason).toMatch(/Data Exfiltration Prevention/);
    });

    it("BLOCK wins over REQUIRE_APPROVAL when multiple policies match", async () => {
      await Policy.create([
        {
          name: "Approval Needed",
          priority: 50,
          conditions: [{ field: "action.type", operator: "eq", value: "DELETE" }],
          effect: POLICY_EFFECTS.REQUIRE_APPROVAL,
          createdBy: adminUser._id,
        },
        {
          name: "Absolute Block",
          priority: 100,
          conditions: [
            { field: "action.type", operator: "eq", value: "DELETE" },
            { field: "resource.reversible", operator: "eq", value: false },
          ],
          effect: POLICY_EFFECTS.BLOCK,
          createdBy: adminUser._id,
        },
      ]);

      const res = await request(app)
        .post("/api/v1/actions/evaluate")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          ...baseEvaluateBody(),
          actionType: "DELETE",
          resource: { reversible: false },
        });

      expect(res.body.data.decision).toBe(DECISIONS.BLOCK);
      expect(res.body.data.policyResult.violations).toHaveLength(2);
    });

    it("disabled policy is ignored — action gets ALLOW", async () => {
      await Policy.create({
        name: "Disabled Block",
        enabled: false,
        conditions: [{ field: "action.type", operator: "eq", value: "SELECT" }],
        effect: POLICY_EFFECTS.BLOCK,
        createdBy: adminUser._id,
      });

      const res = await request(app)
        .post("/api/v1/actions/evaluate")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(baseEvaluateBody());

      expect(res.body.data.decision).toBe(DECISIONS.ALLOW);
    });
  });

  // ── Risk scoring ───────────────────────────────────────────────────────────
  describe("Risk Scoring", () => {

    it("HIGH risk tool should produce a higher base score than LOW risk", async () => {
      // LOW risk tool
      const lowTool = await Tool.create({
        name: "Calendar API",
        type: TOOL_TYPES.CALENDAR,
        riskLevel: RISK_LEVELS.LOW,
        allowedActions: ["CREATE"],
      });
      const lowAgent = await Agent.create({
        name: "CalBot",
        owner: adminUser._id,
        toolIds: [lowTool._id],
      });

      const lowRes = await request(app)
        .post("/api/v1/actions/evaluate")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          agentId: lowAgent._id.toString(),
          toolId: lowTool._id.toString(),
          actionType: "CREATE",
          resource: { sensitivity: "LOW", reversible: true, destination: "internal" },
        });

      const highRes = await request(app)
        .post("/api/v1/actions/evaluate")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(baseEvaluateBody()); // HIGH risk tool

      expect(highRes.body.data.riskScore).toBeGreaterThan(lowRes.body.data.riskScore);
    });

    it("irreversible + external + HIGH sensitivity should push risk score up", async () => {
      const safeRes = await request(app)
        .post("/api/v1/actions/evaluate")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          ...baseEvaluateBody(),
          resource: { sensitivity: "LOW", reversible: true, destination: "internal" },
        });

      const dangerousRes = await request(app)
        .post("/api/v1/actions/evaluate")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          ...baseEvaluateBody(),
          resource: {
            sensitivity: "HIGH",
            reversible: false,
            destination: "external",
            recordCount: 15000,
          },
        });

      expect(dangerousRes.body.data.riskScore).toBeGreaterThan(safeRes.body.data.riskScore);
    });

    it("riskScore should never exceed 100", async () => {
      const res = await request(app)
        .post("/api/v1/actions/evaluate")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          ...baseEvaluateBody(),
          resource: {
            sensitivity: "CRITICAL",
            reversible: false,
            destination: "external",
            recordCount: 100000,
          },
        });

      expect(res.body.data.riskScore).toBeLessThanOrEqual(100);
    });

    it("hard-blocked actions should have riskScore of 100", async () => {
      const res = await request(app)
        .post("/api/v1/actions/evaluate")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...baseEvaluateBody(), agentId: "000000000000000000000001" });

      expect(res.body.data.riskScore).toBe(100);
    });
  });

  // ── Audit trail ────────────────────────────────────────────────────────────
  describe("Audit Trail — Action record written to DB", () => {

    it("should write an audit record after ALLOW decision", async () => {
      await request(app)
        .post("/api/v1/actions/evaluate")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(baseEvaluateBody());

      // Wait for fire-and-forget write
      await waitMs(200);

      const records = await Action.find({ agentId: testAgent._id });
      expect(records).toHaveLength(1);
      expect(records[0].decision).toBe(DECISIONS.ALLOW);
      expect(records[0].actionType).toBe("SELECT");
      expect(records[0].riskScore).toBeGreaterThan(0);
    });

    it("should write an audit record even for HARD BLOCK", async () => {
      await request(app)
        .post("/api/v1/actions/evaluate")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...baseEvaluateBody(), actionType: "DROP" }); // not allowed

      await waitMs(200);

      const records = await Action.find({});
      expect(records).toHaveLength(1);
      expect(records[0].decision).toBe(DECISIONS.BLOCK);
      expect(records[0].riskScore).toBe(100);
    });

    it("REQUIRE_APPROVAL decision should set approvalStatus to PENDING", async () => {
      await Policy.create({
        name: "Always Approve",
        conditions: [{ field: "action.type", operator: "exists", value: true }],
        effect: POLICY_EFFECTS.REQUIRE_APPROVAL,
        createdBy: adminUser._id,
      });

      await request(app)
        .post("/api/v1/actions/evaluate")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(baseEvaluateBody());

      await waitMs(200);

      const record = await Action.findOne({ agentId: testAgent._id });
      expect(record.approvalStatus).toBe(APPROVAL_STATUS.PENDING);
    });
  });

  // ── Audit log GET endpoints ────────────────────────────────────────────────
  describe("GET /api/v1/actions — Audit Log", () => {

    beforeEach(async () => {
      // Create one action record directly
      await Action.create({
        agentId: testAgent._id,
        toolId: testTool._id,
        requestedBy: adminUser._id,
        actionType: "SELECT",
        decision: DECISIONS.ALLOW,
        riskScore: 55,
        evaluatedAt: new Date(),
      });
    });

    it("ADMIN: should list action records", async () => {
      const res = await request(app)
        .get("/api/v1/actions")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.actions).toHaveLength(1);
      expect(res.body.data.total).toBe(1);
    });

    it("ANALYST: should be able to list actions", async () => {
      const res = await request(app)
        .get("/api/v1/actions")
        .set("Authorization", `Bearer ${analystToken}`);

      expect(res.status).toBe(200);
    });

    it("should filter by decision", async () => {
      const res = await request(app)
        .get("/api/v1/actions?decision=ALLOW")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.body.data.actions.every((a) => a.decision === "ALLOW")).toBe(true);
    });

    it("should filter by agentId", async () => {
      const res = await request(app)
        .get(`/api/v1/actions?agentId=${testAgent._id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.body.data.actions.every(
        (a) => a.agentId._id === testAgent._id.toString() ||
               a.agentId === testAgent._id.toString()
      )).toBe(true);
    });

    it("should return 404 for non-existent action", async () => {
      const res = await request(app)
        .get("/api/v1/actions/000000000000000000000001")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });
});
