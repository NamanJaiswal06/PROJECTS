/**
 * app.js — Express application factory.
 *
 * Why separate from server.js?
 *   server.js creates the HTTP server and starts listening.
 *   app.js creates the Express application and configures all middleware.
 *
 *   Keeping them separate lets tests import the Express app (app.js) and
 *   run supertest against it WITHOUT actually binding to a port. This makes
 *   tests faster and avoids port-conflict errors.
 *
 * Middleware order matters in Express:
 *   1. Security headers (helmet) — first so every response gets them
 *   2. CORS — before any route handling so preflight OPTIONS requests work
 *   3. Body parsers — before routes need req.body
 *   4. Request logger (morgan) — after parsers so body size is known
 *   5. Rate limiter — before routes but after basic setup
 *   6. API routes
 *   7. 404 handler — after all real routes
 *   8. Global error handler — must be last (4-arg signature)
 */
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const env = require("./config/env");
const logger = require("./utils/logger");
const { generalLimiter } = require("./middleware/rateLimit.middleware");
const notFoundMiddleware = require("./middleware/notFound.middleware");
const errorMiddleware = require("./middleware/error.middleware");

// ─── Route imports ─────────────────────────────────────────────────────────────
const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");
const agentRoutes = require("./routes/agent.routes");
const toolRoutes = require("./routes/tool.routes");
const policyRoutes = require("./routes/policy.routes");
const actionRoutes = require("./routes/action.routes");
const approvalRoutes = require("./routes/approval.routes");
const eventRoutes = require("./routes/event.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const simulatorRoutes = require("./simulator/simulator.routes");

// ─── App factory ──────────────────────────────────────────────────────────────
const createApp = () => {
  const app = express();

  // ── 1. Security headers ────────────────────────────────────────────────────
  // Helmet sets a collection of HTTP security headers:
  // - Content-Security-Policy
  // - X-Content-Type-Options: nosniff
  // - X-Frame-Options: DENY
  // - Strict-Transport-Security (HTTPS only)
  // - X-XSS-Protection: 0 (modern browsers use CSP instead)
  // We keep defaults for Phase 1 — tune per policy in later phases.
  app.use(helmet());

  // ── 2. CORS ────────────────────────────────────────────────────────────────
  // Allow only the origins listed in CORS_ORIGINS env var.
  // Credentials (cookies, auth headers) are allowed because the frontend
  // needs to send JWT in the Authorization header.
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g., server-to-server, curl, Postman)
        if (!origin) return callback(null, true);

        if (env.CORS_ORIGINS.includes(origin) || env.isDevelopment) {
          return callback(null, true);
        }

        callback(new Error(`CORS: Origin '${origin}' is not allowed`));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  // ── 3. Body parsers ────────────────────────────────────────────────────────
  // json() — parse application/json
  // Limit: 10kb prevents request body bombs (large JSON payloads that
  // consume memory during parsing). Adjust if you need larger payloads.
  app.use(express.json({ limit: "10kb" }));

  // urlencoded() — for HTML form submissions (not primary use case, but good to have)
  app.use(express.urlencoded({ extended: true, limit: "10kb" }));

  // ── 4. Request logging ─────────────────────────────────────────────────────
  // Morgan formats HTTP request logs.
  // 'dev' format: colored method + path + status + time (for development)
  // 'combined' format: Apache-style full log (for production log aggregators)
  // We route morgan through our Winston logger so all logs go to one place.
  const morganStream = {
    write: (message) => logger.http(message.trim()),
  };
  app.use(morgan(env.isProduction ? "combined" : "dev", { stream: morganStream }));

  // ── 5. General rate limiter ────────────────────────────────────────────────
  // Applied to all /api/v1 routes. Individual routes apply stricter limiters.
  app.use("/api/v1", generalLimiter);

  // ── 6. API Routes ──────────────────────────────────────────────────────────
  app.use("/api/v1/health", healthRoutes);
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/agents", agentRoutes);
  app.use("/api/v1/tools", toolRoutes);
  app.use("/api/v1/policies", policyRoutes);
  app.use("/api/v1/actions", actionRoutes);
  app.use("/api/v1/approvals", approvalRoutes);
  app.use("/api/v1/events", eventRoutes);
  app.use("/api/v1/dashboard", dashboardRoutes);
  app.use("/api/v1/simulator", simulatorRoutes);

  // ── 7. Root route — friendly message ──────────────────────────────────────
  app.get("/", (req, res) => {
    res.json({
      success: true,
      message: "AgentShield API — Runtime Security Layer for AI Agents",
      version: "1.0.0",
      docs: "/api/v1/health",
    });
  });

  // ── 8. 404 handler ─────────────────────────────────────────────────────────
  // Must come after all real routes.
  app.use(notFoundMiddleware);

  // ── 9. Global error handler ────────────────────────────────────────────────
  // Must be last — Express identifies it by the (err, req, res, next) signature.
  app.use(errorMiddleware);

  return app;
};

module.exports = createApp;
