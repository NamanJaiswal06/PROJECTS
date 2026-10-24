/**
 * db.js — MongoDB connection manager.
 *
 * Why this exists as a separate module:
 *   The database connection lifecycle (connect, reconnect, graceful shutdown)
 *   should not live inside server.js or app.js. By isolating it here, we can:
 *   - Connect once and reuse the connection across the entire app
 *   - Handle reconnection logic cleanly
 *   - Disconnect gracefully in tests without extra coupling
 *
 * Mongoose behavior:
 *   Mongoose maintains an internal connection pool. You call connectDB() once
 *   at startup; every model.save() / Model.find() etc. reuses that pool.
 *   You do NOT need to pass the connection around.
 */
const mongoose = require("mongoose");
const env = require("./env");
const logger = require("../utils/logger");

let isConnected = false;

/**
 * Connect to MongoDB.
 * Resolves when the connection is established.
 * Throws if it cannot connect (calling code should handle this).
 */
const connectDB = async () => {
  if (isConnected) {
    logger.debug("[db] Already connected to MongoDB — skipping");
    return;
  }

  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      // These prevent Mongoose from using the deprecated connection string parser
      // and ensure the driver maintains a server-selector state for replica sets.
      // As of Mongoose 7+, these are the defaults, but we're explicit for clarity.
    });

    isConnected = true;
    logger.info(`[db] MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    logger.error("[db] MongoDB connection failed", { error: err.message });
    throw err; // Let the caller (server.js) decide whether to exit
  }
};

/**
 * Disconnect from MongoDB.
 * Used in tests and graceful shutdown.
 */
const disconnectDB = async () => {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  logger.info("[db] MongoDB disconnected");
};

// ─── Mongoose connection event listeners ──────────────────────────────────────
// Log state changes so operations teams can see connection issues in logs.

mongoose.connection.on("disconnected", () => {
  isConnected = false;
  logger.warn("[db] MongoDB disconnected — will auto-retry if configured");
});

mongoose.connection.on("reconnected", () => {
  isConnected = true;
  logger.info("[db] MongoDB reconnected");
});

mongoose.connection.on("error", (err) => {
  logger.error("[db] MongoDB error", { error: err.message });
});

module.exports = { connectDB, disconnectDB };
