/**
 * riskScorer.js — Deterministic risk scoring for action evaluations.
 *
 * Why deterministic, not ML?
 *   Phase 5 needs a working risk score. ML-based anomaly detection comes
 *   in Phase 10. This module provides a rules-based baseline that:
 *   - Runs synchronously (no async, no network calls)
 *   - Is fully testable (same input always → same output)
 *   - Covers the main risk factors clearly and auditably
 *
 *   Phase 10 will replace this with an ML model but the interface stays
 *   the same — a function that takes SecurityContext and returns { score, factors }.
 *
 * Scoring model:
 *   score = baseScore + Σ(penalties)   (capped at 100)
 *
 *   Base score (from tool risk level):
 *     LOW      → 10
 *     MEDIUM   → 25
 *     HIGH     → 55
 *     CRITICAL → 85
 *
 *   Penalties:
 *     Bulk operation (recordCount > 1000)    → +15
 *     Bulk operation (recordCount > 10000)   → +10 more (total +25)
 *     External destination                   → +10
 *     Irreversible action                    → +15
 *     HIGH sensitivity data                  → +10
 *     CRITICAL sensitivity data              → +20 (replaces HIGH)
 *     Sensitive action type (pre-set list)   → +10
 *
 * Output: { score: number, factors: string[] }
 *   factors is a human-readable list of what drove the score up.
 *   Used in the Action record and decision explanation.
 */
const { RISK_LEVELS, SENSITIVE_ACTIONS } = require("../../utils/constants");

const BASE_SCORES = {
  [RISK_LEVELS.LOW]: 10,
  [RISK_LEVELS.MEDIUM]: 25,
  [RISK_LEVELS.HIGH]: 55,
  [RISK_LEVELS.CRITICAL]: 85,
};

/**
 * Compute a risk score for the given SecurityContext.
 *
 * @param {object} context — SecurityContext { agent, action, tool, resource }
 * @returns {{ score: number, factors: string[] }}
 */
const computeRiskScore = (context) => {
  const { action, tool, resource = {} } = context;
  const factors = [];

  // ── Base score from tool risk level ──────────────────────────────────────
  const baseScore = BASE_SCORES[tool?.riskLevel] ?? BASE_SCORES[RISK_LEVELS.LOW];
  if (tool?.riskLevel) {
    factors.push(`Tool risk level: ${tool.riskLevel} (base: ${baseScore})`);
  }

  let score = baseScore;

  // ── Penalty: bulk operation ───────────────────────────────────────────────
  const recordCount = resource.recordCount;
  if (typeof recordCount === "number") {
    if (recordCount > 10000) {
      score += 25;
      factors.push(`Bulk operation: ${recordCount.toLocaleString()} records (+25)`);
    } else if (recordCount > 1000) {
      score += 15;
      factors.push(`Bulk operation: ${recordCount.toLocaleString()} records (+15)`);
    }
  }

  // ── Penalty: external destination ────────────────────────────────────────
  if (resource.destination === "external") {
    score += 10;
    factors.push("External destination (+10)");
  }

  // ── Penalty: irreversible action ──────────────────────────────────────────
  if (resource.reversible === false) {
    score += 15;
    factors.push("Irreversible action (+15)");
  }

  // ── Penalty: data sensitivity ─────────────────────────────────────────────
  if (resource.sensitivity === RISK_LEVELS.CRITICAL) {
    score += 20;
    factors.push("CRITICAL data sensitivity (+20)");
  } else if (resource.sensitivity === RISK_LEVELS.HIGH) {
    score += 10;
    factors.push("HIGH data sensitivity (+10)");
  }

  // ── Penalty: known sensitive action type ─────────────────────────────────
  if (action?.type && SENSITIVE_ACTIONS.has(action.type)) {
    score += 10;
    factors.push(`Sensitive action type: ${action.type} (+10)`);
  }

  // ── Cap at 100 ────────────────────────────────────────────────────────────
  score = Math.min(Math.round(score), 100);

  return { score, factors };
};

module.exports = { computeRiskScore };
