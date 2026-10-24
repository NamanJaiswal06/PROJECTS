/**
 * health.controller.js — Health check endpoint.
 *
 * Why a dedicated health endpoint?
 *   - Load balancers use it to determine if the server is ready to receive traffic
 *   - Monitoring systems (e.g., UptimeRobot) ping it periodically
 *   - Kubernetes liveness/readiness probes call it
 *   - Developers use it to quickly verify the server is running
 *
 * Two checks:
 *   /health       — Basic liveness: is the process running?
 *   /health/ready — Readiness: is MongoDB connected?
 *
 * We keep these separate because a server might be "live" (not crashed)
 * but "not ready" (still connecting to the database). Load balancers
 * should route traffic only to ready instances.
 */
const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const env = require("../config/env");

/**
 * GET /api/v1/health
 * Basic liveness check — always succeeds if the process is running.
 */
const healthCheck = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: "AgentShield API is healthy",
    data: {
      status: "UP",
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
    },
  });
});

/**
 * GET /api/v1/health/ready
 * Readiness check — verifies MongoDB is connected before reporting ready.
 * Returns 503 if not ready so load balancers stop routing to this instance.
 */
const readinessCheck = asyncHandler(async (req, res) => {
  const dbState = mongoose.connection.readyState;

  // Mongoose readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const dbReady = dbState === 1;

  const dbStateLabel = { 0: "DISCONNECTED", 1: "CONNECTED", 2: "CONNECTING", 3: "DISCONNECTING" };

  const status = dbReady ? "READY" : "NOT_READY";
  const httpStatus = dbReady ? 200 : 503;

  res.status(httpStatus).json({
    success: dbReady,
    message: dbReady ? "AgentShield is ready" : "AgentShield is not ready",
    data: {
      status,
      services: {
        database: {
          status: dbStateLabel[dbState] || "UNKNOWN",
          ready: dbReady,
        },
      },
      timestamp: new Date().toISOString(),
    },
  });
});

module.exports = { healthCheck, readinessCheck };
