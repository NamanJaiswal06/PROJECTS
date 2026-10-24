/**
 * policyEngine.test.js — Unit + integration tests for the policy evaluation engine.
 *
 * These tests verify the core security logic of AgentShield.
 * We test:
 *   1. Individual operator evaluation (eq, ne, gt, gte, lt, lte, in, nin, contains, exists)
 *   2. Scope matching (global, per-agent, per-tool, per-action-type)
 *   3. Full policy evaluation (matching, non-matching, disabled, multiple)
 *   4. The 5 key action scenarios from the master spec
 *   5. highestEffect resolution (BLOCK > REQUIRE_APPROVAL > ALLOW)
 */
process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://localhost:27017/agentshield_test";
process.env.JWT_SECRET = "test_secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

const { connect, clearDatabase, disconnect } = require("../helpers/testDb");
const {
  evaluatePolicies,
  evaluateCondition,
  getFieldValue,
  isPolicyInScope,
  testPolicy,
} = require("../../src/services/policies/policyEngine.service");
const Policy = require("../../src/models/Policy");
const { createUserWithRole } = require("../helpers/authHelpers");
const { USER_ROLES, POLICY_EFFECTS } = require("../../src/utils/constants");
const mongoose = require("mongoose");

// ─── Test fixtures ─────────────────────────────────────────────────────────────

// A realistic SecurityContext for most tests
const makeSafeContext = () => ({
  agent: {
    _id: new mongoose.Types.ObjectId(),
    permissions: ["READ_DOCUMENT", "WRITE_CALENDAR"],
    status: "ACTIVE",
  },
  user: { _id: new mongoose.Types.ObjectId(), role: "VIEWER" },
  action: {
    type: "CREATE_CALENDAR_EVENT",
    tool: "calendar",
    parameters: { title: "Team Standup", date: "2024-01-20" },
  },
  tool: {
    _id: new mongoose.Types.ObjectId(),
    type: "CALENDAR",
    riskLevel: "LOW",
    allowedActions: ["CREATE", "READ"],
  },
  resource: {
    sensitivity: "LOW",
    reversible: true,
    recordCount: 1,
    destination: "internal",
  },
});

const makeDangerousContext = () => ({
  agent: {
    _id: new mongoose.Types.ObjectId(),
    permissions: ["DELETE_DATABASE"],
    status: "ACTIVE",
  },
  user: { _id: new mongoose.Types.ObjectId(), role: "ADMIN" },
  action: {
    type: "DELETE_USERS",
    tool: "database",
    parameters: { count: 12000, filter: "inactive=true" },
  },
  tool: {
    _id: new mongoose.Types.ObjectId(),
    type: "DATABASE",
    riskLevel: "HIGH",
  },
  resource: {
    sensitivity: "HIGH",
    reversible: false,
    recordCount: 12000,
    destination: "internal",
  },
});

describe("Policy Engine", () => {
  beforeAll(connect);
  afterEach(clearDatabase);
  afterAll(disconnect);

  // ── getFieldValue ────────────────────────────────────────────────────────────
  describe("getFieldValue()", () => {
    it("should extract a top-level field", () => {
      expect(getFieldValue({ action: { type: "DELETE" } }, "action.type")).toBe("DELETE");
    });

    it("should extract a deeply nested field", () => {
      const ctx = { action: { parameters: { count: 12000 } } };
      expect(getFieldValue(ctx, "action.parameters.count")).toBe(12000);
    });

    it("should return undefined for missing paths", () => {
      expect(getFieldValue({}, "action.parameters.count")).toBeUndefined();
    });

    it("should return undefined safely without throwing", () => {
      expect(() => getFieldValue({ a: null }, "a.b.c")).not.toThrow();
    });
  });

  // ── evaluateCondition — all operators ───────────────────────────────────────
  describe("evaluateCondition() — operator coverage", () => {
    const ctx = {
      action: { type: "DELETE_USERS", parameters: { count: 12000 } },
      agent: { permissions: ["DELETE_DATABASE", "READ_DATABASE"] },
      resource: { reversible: false, destination: "external" },
      tool: { riskLevel: "HIGH" },
    };

    const cases = [
      // [description, condition, expectedPassed]
      ["eq — match",         { field: "action.type", operator: "eq", value: "DELETE_USERS" }, true],
      ["eq — no match",      { field: "action.type", operator: "eq", value: "READ" }, false],
      ["ne — match",         { field: "action.type", operator: "ne", value: "READ" }, true],
      ["ne — no match",      { field: "action.type", operator: "ne", value: "DELETE_USERS" }, false],
      ["gt — match",         { field: "action.parameters.count", operator: "gt", value: 100 }, true],
      ["gt — no match",      { field: "action.parameters.count", operator: "gt", value: 50000 }, false],
      ["gte — match exact",  { field: "action.parameters.count", operator: "gte", value: 12000 }, true],
      ["lt — match",         { field: "action.parameters.count", operator: "lt", value: 100000 }, true],
      ["lt — no match",      { field: "action.parameters.count", operator: "lt", value: 100 }, false],
      ["lte — match exact",  { field: "action.parameters.count", operator: "lte", value: 12000 }, true],
      ["in — match",         { field: "tool.riskLevel", operator: "in", value: ["HIGH", "CRITICAL"] }, true],
      ["in — no match",      { field: "tool.riskLevel", operator: "in", value: ["LOW", "MEDIUM"] }, false],
      ["nin — match",        { field: "tool.riskLevel", operator: "nin", value: ["LOW", "MEDIUM"] }, true],
      ["nin — no match",     { field: "tool.riskLevel", operator: "nin", value: ["HIGH", "CRITICAL"] }, false],
      ["contains — match",   { field: "agent.permissions", operator: "contains", value: "DELETE_DATABASE" }, true],
      ["contains — no match",{ field: "agent.permissions", operator: "contains", value: "TRANSFER_FUNDS" }, false],
      ["notContains — match",{ field: "agent.permissions", operator: "notContains", value: "TRANSFER_FUNDS" }, true],
      ["startsWith — match", { field: "action.type", operator: "startsWith", value: "DELETE" }, true],
      ["startsWith — no",    { field: "action.type", operator: "startsWith", value: "READ" }, false],
      ["exists — true",      { field: "resource.reversible", operator: "exists", value: true }, true],
      ["exists — false",     { field: "resource.nonexistent", operator: "exists", value: false }, true],
    ];

    test.each(cases)("%s", (description, condition, expectedPassed) => {
      const { passed } = evaluateCondition(condition, ctx);
      expect(passed).toBe(expectedPassed);
    });
  });

  // ── isPolicyInScope ──────────────────────────────────────────────────────────
  describe("isPolicyInScope()", () => {
    const agentId = new mongoose.Types.ObjectId();
    const toolId = new mongoose.Types.ObjectId();
    const ctx = {
      agent: { _id: agentId },
      tool: { _id: toolId },
      action: { type: "DELETE_USERS" },
    };

    it("global policy (all empty arrays) matches anything", () => {
      expect(isPolicyInScope(
        { appliesToAgents: [], appliesToTools: [], appliesToActionTypes: [] },
        ctx
      )).toBe(true);
    });

    it("agent-scoped policy matches correct agent", () => {
      expect(isPolicyInScope(
        { appliesToAgents: [agentId], appliesToTools: [], appliesToActionTypes: [] },
        ctx
      )).toBe(true);
    });

    it("agent-scoped policy does NOT match wrong agent", () => {
      expect(isPolicyInScope(
        { appliesToAgents: [new mongoose.Types.ObjectId()], appliesToTools: [], appliesToActionTypes: [] },
        ctx
      )).toBe(false);
    });

    it("action-type-scoped policy matches correct action type", () => {
      expect(isPolicyInScope(
        { appliesToAgents: [], appliesToTools: [], appliesToActionTypes: ["DELETE_USERS"] },
        ctx
      )).toBe(true);
    });

    it("action-type-scoped policy does NOT match wrong type", () => {
      expect(isPolicyInScope(
        { appliesToAgents: [], appliesToTools: [], appliesToActionTypes: ["READ_DOCUMENT"] },
        ctx
      )).toBe(false);
    });
  });

  // ── evaluatePolicies — full integration ─────────────────────────────────────
  describe("evaluatePolicies() — full database integration", () => {
    let adminUser;

    beforeEach(async () => {
      ({ user: adminUser } = await createUserWithRole(USER_ROLES.ADMIN));
    });

    // ── Test 1: Safe action, no matching policies ──────────────────────────
    it("TEST 1 (SAFE): CREATE_CALENDAR_EVENT — no matching policies → ALLOW", async () => {
      // Create a DELETE-focused policy
      await Policy.create({
        name: "Delete Requires Approval",
        conditions: [{ field: "action.type", operator: "contains", value: "DELETE" }],
        effect: POLICY_EFFECTS.REQUIRE_APPROVAL,
        createdBy: adminUser._id,
      });

      const ctx = makeSafeContext();
      const result = await evaluatePolicies(ctx);

      expect(result.matched).toBe(false);
      expect(result.violations).toHaveLength(0);
      expect(result.highestEffect).toBe(POLICY_EFFECTS.ALLOW);
    });

    // ── Test 2: Bulk delete → REQUIRE_APPROVAL ────────────────────────────
    it("TEST 2 (DANGEROUS): DELETE_USERS with 12000 records → REQUIRE_APPROVAL", async () => {
      await Policy.create({
        name: "Bulk Delete Protection",
        priority: 100,
        conditions: [
          { field: "action.type", operator: "contains", value: "DELETE" },
          { field: "action.parameters.count", operator: "gte", value: 100 },
        ],
        effect: POLICY_EFFECTS.REQUIRE_APPROVAL,
        createdBy: adminUser._id,
      });

      const ctx = makeDangerousContext();
      const result = await evaluatePolicies(ctx);

      expect(result.matched).toBe(true);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].policyName).toBe("Bulk Delete Protection");
      expect(result.highestEffect).toBe(POLICY_EFFECTS.REQUIRE_APPROVAL);
    });

    // ── Test 3: Sensitive data exfiltration → BLOCK ───────────────────────
    it("TEST 3 (EXFILTRATION): External destination + HIGH sensitivity → BLOCK", async () => {
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

      const ctx = {
        ...makeDangerousContext(),
        action: { type: "EXPORT_CUSTOMERS", parameters: {} },
        resource: { sensitivity: "HIGH", reversible: false, destination: "external" },
      };

      const result = await evaluatePolicies(ctx);

      expect(result.matched).toBe(true);
      expect(result.highestEffect).toBe(POLICY_EFFECTS.BLOCK);
    });

    // ── Test 4: Financial transaction → REQUIRE_APPROVAL ──────────────────
    it("TEST 4 (FINANCIAL): TRANSFER_FUNDS with amount > 10000 → REQUIRE_APPROVAL", async () => {
      await Policy.create({
        name: "Financial Transaction Approval",
        priority: 150,
        conditions: [
          { field: "action.type", operator: "eq", value: "TRANSFER_FUNDS" },
          { field: "action.parameters.amount", operator: "gte", value: 10000 },
        ],
        effect: POLICY_EFFECTS.REQUIRE_APPROVAL,
        createdBy: adminUser._id,
      });

      const ctx = {
        ...makeSafeContext(),
        action: { type: "TRANSFER_FUNDS", parameters: { amount: 50000, recipient: "supplier_xyz" } },
      };

      const result = await evaluatePolicies(ctx);

      expect(result.matched).toBe(true);
      expect(result.highestEffect).toBe(POLICY_EFFECTS.REQUIRE_APPROVAL);
    });

    // ── highestEffect resolution: BLOCK wins over REQUIRE_APPROVAL ─────────
    it("BLOCK beats REQUIRE_APPROVAL when multiple policies match", async () => {
      await Policy.create([
        {
          name: "Lower Priority Approval",
          priority: 50,
          conditions: [{ field: "action.type", operator: "contains", value: "DELETE" }],
          effect: POLICY_EFFECTS.REQUIRE_APPROVAL,
          createdBy: adminUser._id,
        },
        {
          name: "Higher Priority Block",
          priority: 100,
          conditions: [
            { field: "action.type", operator: "contains", value: "DELETE" },
            { field: "resource.reversible", operator: "eq", value: false },
          ],
          effect: POLICY_EFFECTS.BLOCK,
          createdBy: adminUser._id,
        },
      ]);

      const ctx = makeDangerousContext();
      const result = await evaluatePolicies(ctx);

      expect(result.matched).toBe(true);
      expect(result.violations).toHaveLength(2);
      expect(result.highestEffect).toBe(POLICY_EFFECTS.BLOCK); // BLOCK wins
    });

    // ── Disabled policies are ignored ──────────────────────────────────────
    it("disabled policy is NOT evaluated", async () => {
      await Policy.create({
        name: "Disabled Policy",
        enabled: false, // DISABLED
        conditions: [{ field: "action.type", operator: "contains", value: "DELETE" }],
        effect: POLICY_EFFECTS.BLOCK,
        createdBy: adminUser._id,
      });

      const ctx = makeDangerousContext();
      const result = await evaluatePolicies(ctx);

      expect(result.matched).toBe(false);
      expect(result.highestEffect).toBe(POLICY_EFFECTS.ALLOW);
      expect(result.evaluatedCount).toBe(0); // disabled = not even evaluated
    });

    // ── Non-matching condition — one fails = policy doesn't match ──────────
    it("policy with multiple conditions requires ALL to match", async () => {
      await Policy.create({
        name: "Both Must Match",
        conditions: [
          { field: "action.type", operator: "contains", value: "DELETE" }, // ✓ matches
          { field: "action.parameters.count", operator: "gte", value: 999999 }, // ✗ doesn't match
        ],
        effect: POLICY_EFFECTS.BLOCK,
        createdBy: adminUser._id,
      });

      const ctx = makeDangerousContext(); // count = 12000, not >= 999999
      const result = await evaluatePolicies(ctx);

      expect(result.matched).toBe(false);
    });

    // ── Agent-scoped policy ───────────────────────────────────────────────
    it("agent-scoped policy only affects the targeted agent", async () => {
      const targetAgentId = new mongoose.Types.ObjectId();

      await Policy.create({
        name: "Agent-Specific Block",
        conditions: [{ field: "action.type", operator: "exists", value: true }],
        effect: POLICY_EFFECTS.BLOCK,
        appliesToAgents: [targetAgentId], // only this agent
        createdBy: adminUser._id,
      });

      // Different agent → not in scope
      const ctx = makeSafeContext();
      const result = await evaluatePolicies(ctx);
      expect(result.matched).toBe(false);
    });
  });

  // ── testPolicy() — synchronous single-policy test ──────────────────────────
  describe("testPolicy() — synchronous evaluation", () => {
    it("should return matches:true when conditions pass", () => {
      const policy = {
        appliesToAgents: [], appliesToTools: [], appliesToActionTypes: [],
        conditions: [{ field: "action.type", operator: "eq", value: "DELETE_USERS" }],
        effect: POLICY_EFFECTS.BLOCK,
      };
      const ctx = makeDangerousContext();
      const result = testPolicy(policy, ctx);
      expect(result.matches).toBe(true);
    });

    it("should return matches:false when a condition fails", () => {
      const policy = {
        appliesToAgents: [], appliesToTools: [], appliesToActionTypes: [],
        conditions: [{ field: "action.type", operator: "eq", value: "READ_DOCUMENT" }],
        effect: POLICY_EFFECTS.ALLOW,
      };
      const ctx = makeDangerousContext();
      const result = testPolicy(policy, ctx);
      expect(result.matches).toBe(false);
    });

    it("should return matches:false when out of scope", () => {
      const policy = {
        appliesToAgents: [new mongoose.Types.ObjectId()], // different agent
        appliesToTools: [], appliesToActionTypes: [],
        conditions: [{ field: "action.type", operator: "exists", value: true }],
        effect: POLICY_EFFECTS.BLOCK,
      };
      const ctx = makeDangerousContext();
      const result = testPolicy(policy, ctx);
      expect(result.matches).toBe(false);
    });
  });
});
