/**
 * server.js — Entry point. Creates HTTP server, connects to MongoDB,
 *             initializes Socket.IO, and starts listening.
 *
 * Why this is separate from app.js:
 *   Tests import app.js to get the Express app without binding to a port.
 *   server.js is the file you actually run: `node src/server.js`.
 *
 * Startup order:
 *   1. Load env config (this also validates required variables)
 *   2. Connect to MongoDB — fail fast if it can't connect
 *   3. Create the Express app
 *   4. Create the HTTP server from the app
 *   5. Initialize Socket.IO on the HTTP server
 *   6. Start listening
 *   7. Register graceful shutdown handlers
 */

// Must be first so env vars are loaded before anything else imports them
const env = require("./config/env");

const http = require("http");
const createApp = require("./app");
const { connectDB } = require("./config/db");
const { initSocket } = require("./config/socket");
const logger = require("./utils/logger");

// ─── Uncaught exception / rejection guards ────────────────────────────────────
// These are the "last resort" handlers. Ideally these never fire because
// all async errors are caught by asyncHandler. But if a bug causes an
// unhandled rejection, we log it and exit (rather than continue in an
// unknown state). A process manager (PM2, systemd) will restart the process.

process.on("uncaughtException", (err) => {
  logger.error("[server] Uncaught Exception — shutting down", {
    message: err.message,
    stack: err.stack,
  });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("[server] Unhandled Promise Rejection — shutting down", {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  process.exit(1);
});

// ─── Main startup function ────────────────────────────────────────────────────
const start = async () => {
  try {
    // 1. Connect to MongoDB
    // We connect BEFORE starting the HTTP server because if the DB connection
    // fails, there is no point accepting requests that will all fail.
    await connectDB();

    // 2. Create Express app
    const app = createApp();

    // 3. Create HTTP server
    // We use Node's http module explicitly so Socket.IO can attach to it.
    // app.listen() would create one internally, but we wouldn't have a reference.
    const httpServer = http.createServer(app);

    // 4. Initialize Socket.IO
    initSocket(httpServer);

    // 5. Start listening
    const PORT = env.PORT;
    httpServer.listen(PORT, () => {
      logger.info(`[server] AgentShield API running`, {
        port: PORT,
        environment: env.NODE_ENV,
        health: `http://localhost:${PORT}/api/v1/health`,
      });
    });

    // 6. Graceful shutdown
    // When the process receives SIGTERM (e.g., from a container orchestrator)
    // or SIGINT (Ctrl+C), we stop accepting new connections and wait for
    // in-flight requests to finish before exiting.
    const gracefulShutdown = (signal) => {
      logger.info(`[server] ${signal} received — starting graceful shutdown`);

      httpServer.close(async () => {
        logger.info("[server] HTTP server closed — no new connections accepted");

        const { disconnectDB } = require("./config/db");
        await disconnectDB();

        logger.info("[server] Shutdown complete");
        process.exit(0);
      });

      // Force exit after 30 seconds if graceful shutdown hangs
      setTimeout(() => {
        logger.error("[server] Graceful shutdown timed out — forcing exit");
        process.exit(1);
      }, 30000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (err) {
    logger.error("[server] Failed to start — exiting", {
      message: err.message,
      stack: err.stack,
    });
    process.exit(1);
  }
};

start();
