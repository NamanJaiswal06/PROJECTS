/**
 * socket.js (config) — Socket.IO initialization and attachment.
 *
 * Why this exists:
 *   Socket.IO needs to share the same HTTP server as Express.
 *   This module initializes the Socket.IO instance and attaches it to the
 *   server created in server.js. We export the `io` instance so other parts
 *   of the application (services, controllers) can emit events without
 *   creating new instances.
 *
 * Phase 1 note:
 *   This creates the io instance and wires it up, but we don't define event
 *   handlers yet. That happens in Phase 12. For now it's a clean placeholder.
 */
const { Server } = require("socket.io");
const env = require("./env");
const logger = require("../utils/logger");

let io = null;

/**
 * Initialize Socket.IO and attach it to the HTTP server.
 * @param {import("http").Server} httpServer
 * @returns {import("socket.io").Server}
 */
const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGINS,
      methods: ["GET", "POST"],
      credentials: true,
    },
    // Prevent a single slow client from blocking others
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on("connection", (socket) => {
    logger.debug("[socket] Client connected", { socketId: socket.id });

    socket.on("disconnect", (reason) => {
      logger.debug("[socket] Client disconnected", {
        socketId: socket.id,
        reason,
      });
    });
  });

  logger.info("[socket] Socket.IO initialized");
  return io;
};

/**
 * Get the initialized Socket.IO instance.
 * Throws if called before initSocket().
 * @returns {import("socket.io").Server}
 */
const getIO = () => {
  if (!io) {
    throw new Error(
      "[socket] Socket.IO has not been initialized. Call initSocket(httpServer) first."
    );
  }
  return io;
};

module.exports = { initSocket, getIO };
