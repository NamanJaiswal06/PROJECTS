/**
 * policyEngine.service.js — The Policy Evaluation Engine.
 *
 * This is the core of Phase 4 and a critical component of the overall
 * security architecture. It evaluates configurable policies against a
 * SecurityContext and returns a structured result.
 *
 * ─── Architecture ─────────────────────────────────────────────────────────────
 *
 *   Input: SecurityContext
 *     {
 *       agent:    Agent document (with permissions, status, riskProfile)
 *       user:     User document (the human who invoked the agent)
 *       action:   { type, tool, parameters, reason }
 *       tool:     Tool document (with riskLevel, allowedActions)
 *       resource: { sensitivity, recordCount, reversible, destination, ... }
 *     }
 *
 *   Output: PolicyResult
 *     {
 *       matched: true,
 *       violations: [
 *         {
 *           policyId:   "...",
 *           policyName: "Bulk Delete Protection",
 *           effect:     "REQUIRE_APPROVAL",
 *           reason:     "condition: action.parameters.count gte 100 (value: 12000)"
 *         }
 *       ],
 *       highestEffect: "REQUIRE_APPROVAL"
 *     }
 *
 * ─── Policy Evaluation Steps ──────────────────────────────────────────────────
 *
 *   1. Load all ENABLED policies, sorted by priority (highest first).
 *   2. For each policy:
 *      a. Check scope — does this policy apply to this agent/tool/action?
 *         - If appliesToAgents is non-empty and agent is NOT in list → skip
 *         - If appliesToTools is non-empty and tool is NOT in list → skip
 *         - If appliesToActionTypes is non-empty and action.type is NOT in list → skip
 *      b. Evaluate conditions — does every condition match?
 *         - Extract field value from SecurityContext using dot notation
 *         - Apply operator comparison
 *         - ALL conditions must match (logical AND)
 *      c. If the policy matches → add to violations list
 *   3. Determine highestEffect: BLOCK > REQUIRE_APPROVAL > ALLOW
 *
 * ─── Why "ALL conditions = AND"? ─────────────────────────────────────────────
 *
 *   For OR logic, create separate policies. This keeps the data model simple
 *   and each policy easy to reason about individually. A policy with 5 AND
 *   conditions is already complex enough.
 *
 * ─── Condition Evaluation ─────────────────────────────────────────────────────
 *
 *   Fields use dot notation to reference values in the flattened context:
 *
 *   "action.type"                → context.action.type
 *   "action.parameters.count"    → context.action.parameters.count
 *   "tool.riskLevel"             → context.tool.riskLevel
 *   "resource.recordCount"       → context.resource.recordCount
 *   "resource.reversible"        → context.resource.reversible
 *   "agent.permissions"          → context.agent.permissions (array)
 *   "resource.destination"       → context.resource.destination ("internal"/"external")
 *
 * ─── Security Note ────────────────────────────────────────────────────────────
 *
 *   The policy engine is NOT the sole security enforcement mechanism.
 *   It works alongside:
 *   - Hard security rules (Phase 7: deterministic blocks regardless of policy)
 *   - ML analysis (Phase 10: anomaly and injection detection)
 *   - Permission checks (Phase 5: agent must have permission before policies run)
 *
 *   The decision engine (Phase 7) combines all signals.
 *   Policies provide AUTHORITY. Rules provide DETERMINISM. ML provides EVIDENCE.
 */
const Policy = require("../../models/Policy");
const { POLICY_EFFECTS } = require("../../utils/constants");
const logger = require("../../utils/logger");

// ─── Effect precedence ────────────────────────────────────────────────────────
// Higher index = higher precedence (strictest wins)
const EFFECT_PRECEDENCE = {
  [POLICY_EFFECTS.ALLOW]: 0,
  [POLICY_EFFECTS.REQUIRE_APPROVAL]: 1,
  [POLICY_EFFECTS.BLOCK]: 2,
};

// ─── Field value extractor ────────────────────────────────────────────────────

/**
 * Extract a value from a nested object using dot-notation path.
 *
 * @param {object} context
 * @param {string} path — e.g., "action.parameters.count"
 * @returns {*} The value at that path, or undefined if not found
 *
 * Examples:
 *   get({ action: { parameters: { count: 12000 } } }, "action.parameters.count") → 12000
 *   get({ tool: { riskLevel: "HIGH" } }, "tool.riskLevel") → "HIGH"
 */
const getFieldValue = (context, path) => {
  return path.split(".").reduce((obj, key) => {
    if (obj === null || obj === undefined) return undefined;
    // Handle Mongoose documents — use plain object if needed
    if (typeof obj.toObject === "function") {
      obj = obj.toObject();
    }
    return obj[key];
  }, context);
};

// ─── Condition evaluator ──────────────────────────────────────────────────────

/**
 * Evaluate a single condition against the SecurityContext.
 *
 * @param {object} condition — { field, operator, value }
 * @param {object} context   — SecurityContext
 * @returns {{ passed: boolean, fieldValue: * }}
 */
const evaluateCondition = (condition, context) => {
  const { field, operator, value: conditionValue } = condition;
  const fieldValue = getFieldValue(context, field);

  let passed = false;

  switch (operator) {
    case "eq":
      passed = fieldValue === conditionValue;
      break;

    case "ne":
      passed = fieldValue !== conditionValue;
      break;

    case "gt":
      passed = typeof fieldValue === "number" && fieldValue > conditionValue;
      break;

    case "gte":
      passed = typeof fieldValue === "number" && fieldValue >= conditionValue;
      break;

    case "lt":
      passed = typeof fieldValue === "number" && fieldValue < conditionValue;
      break;

    case "lte":
      passed = typeof fieldValue === "number" && fieldValue <= conditionValue;
      break;

    case "in":
      // field is a scalar, conditionValue is an array
      passed = Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
      break;

    case "nin":
      // field is a scalar, NOT in conditionValue array
      passed = Array.isArray(conditionValue) && !conditionValue.includes(fieldValue);
      break;

    case "contains":
      // field is an array or string, conditionValue is a scalar
      if (Array.isArray(fieldValue)) {
        // Convert ObjectIds to strings for comparison
        passed = fieldValue.some(
          (item) => item?.toString() === conditionValue?.toString() || item === conditionValue
        );
      } else if (typeof fieldValue === "string") {
        passed = fieldValue.includes(conditionValue);
      }
      break;

    case "notContains":
      if (Array.isArray(fieldValue)) {
        passed = !fieldValue.some(
          (item) => item?.toString() === conditionValue?.toString() || item === conditionValue
        );
      } else if (typeof fieldValue === "string") {
        passed = !fieldValue.includes(conditionValue);
      } else {
        passed = true; // If field doesn't exist as array/string, "not contains" is true
      }
      break;

    case "startsWith":
      passed =
        typeof fieldValue === "string" &&
        typeof conditionValue === "string" &&
        fieldValue.startsWith(conditionValue);
      break;

    case "exists":
      // conditionValue = true: field must exist and not be null
      // conditionValue = false: field must be null or undefined
      if (conditionValue) {
        passed = fieldValue !== undefined && fieldValue !== null;
      } else {
        passed = fieldValue === undefined || fieldValue === null;
      }
      break;

    default:
      logger.warn("[policyEngine] Unknown operator in condition", { operator });
      passed = false;
  }

  return { passed, fieldValue };
};

// ─── Scope checker ────────────────────────────────────────────────────────────

/**
 * Check if a policy applies to the current action context.
 * A policy is global (applies to everything) if all scope arrays are empty.
 *
 * @param {Policy} policy
 * @param {object} context — SecurityContext
 * @returns {boolean}
 */
const isPolicyInScope = (policy, context) => {
  const { agent, tool, action } = context;

  // Agent scope: if specified, the agent must be in the list
  if (policy.appliesToAgents.length > 0) {
    const agentId = agent?._id?.toString();
    const agentInScope = policy.appliesToAgents.some(
      (id) => id.toString() === agentId
    );
    if (!agentInScope) return false;
  }

  // Tool scope: if specified, the tool must be in the list
  if (policy.appliesToTools.length > 0) {
    const toolId = tool?._id?.toString();
    const toolInScope = policy.appliesToTools.some(
      (id) => id.toString() === toolId
    );
    if (!toolInScope) return false;
  }

  // Action type scope: if specified, the action type must be in the list
  if (policy.appliesToActionTypes.length > 0) {
    const actionType = action?.type;
    if (!policy.appliesToActionTypes.includes(actionType)) return false;
  }

  return true;
};

// ─── Main evaluation function ─────────────────────────────────────────────────

/**
 * Evaluate all enabled policies against the SecurityContext.
 *
 * @param {object} context — SecurityContext { agent, user, action, tool, resource }
 * @returns {Promise<PolicyResult>}
 *
 * PolicyResult:
 *   {
 *     matched: boolean,          — true if any policy matched
 *     violations: Violation[],   — list of matched policies with their effects
 *     highestEffect: string,     — ALLOW | REQUIRE_APPROVAL | BLOCK
 *     evaluatedCount: number,    — how many policies were evaluated (for debugging)
 *   }
 */
const evaluatePolicies = async (context) => {
  // Load all enabled policies, highest priority first.
  // We load ALL policies upfront (one DB query) rather than querying
  // per-agent/per-tool. For typical deployments with < 1000 policies this
  // is faster than multiple targeted queries.
  const policies = await Policy.find({ enabled: true }).sort({ priority: -1, createdAt: 1 });

  const violations = [];
  let evaluatedCount = 0;

  for (const policy of policies) {
    // Step 1: Scope check
    if (!isPolicyInScope(policy, context)) {
      continue;
    }

    evaluatedCount++;

    // Step 2: Evaluate ALL conditions (logical AND)
    const conditionResults = policy.conditions.map((condition) =>
      evaluateCondition(condition, context)
    );

    const allMatch = conditionResults.every((r) => r.passed);

    if (!allMatch) continue;

    // Step 3: Policy matched — build violation record
    const reasonParts = policy.conditions.map((condition, i) => {
      const result = conditionResults[i];
      return `${condition.field} ${condition.operator} ${JSON.stringify(condition.value)} (actual: ${JSON.stringify(result.fieldValue)})`;
    });

    violations.push({
      policyId: policy._id.toString(),
      policyName: policy.name,
      effect: policy.effect,
      priority: policy.priority,
      reason: reasonParts.join(" AND "),
    });

    logger.debug("[policyEngine] Policy matched", {
      policyId: policy._id,
      policyName: policy.name,
      effect: policy.effect,
    });
  }

  // Step 4: Determine highest (strictest) effect
  let highestEffect = POLICY_EFFECTS.ALLOW; // Default: allow if no matching policies

  for (const violation of violations) {
    if (EFFECT_PRECEDENCE[violation.effect] > EFFECT_PRECEDENCE[highestEffect]) {
      highestEffect = violation.effect;
    }
  }

  const result = {
    matched: violations.length > 0,
    violations,
    highestEffect,
    evaluatedCount,
  };

  logger.info("[policyEngine] Evaluation complete", {
    evaluatedCount,
    matchedCount: violations.length,
    highestEffect,
  });

  return result;
};

// ─── Utility: evaluate a single specific policy (for testing/simulation) ──────

/**
 * Test a single policy against a context without loading from the database.
 * Used by the simulator and unit tests.
 *
 * @param {object} policy  — { conditions, effect, appliesToAgents, ... }
 * @param {object} context — SecurityContext
 * @returns {{ matches: boolean, conditionResults: array }}
 */
const testPolicy = (policy, context) => {
  if (!isPolicyInScope(policy, context)) {
    return { matches: false, conditionResults: [], reason: "Out of scope" };
  }

  const conditionResults = policy.conditions.map((condition) => ({
    ...condition,
    ...evaluateCondition(condition, context),
  }));

  const matches = conditionResults.every((r) => r.passed);

  return { matches, conditionResults };
};

module.exports = {
  evaluatePolicies,
  testPolicy,
  evaluateCondition, // exported for unit tests
  getFieldValue,     // exported for unit tests
  isPolicyInScope,   // exported for unit tests
};
