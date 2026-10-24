/**
 * notFound.middleware.js — 404 handler for unmatched routes.
 *
 * Why this exists:
 *   Express returns an HTML "Cannot GET /..." response for unmatched routes.
 *   This middleware intercepts those and returns our standard JSON format,
 *   which is important because clients (including AI agents) expect JSON.
 *
 * Placement: mount AFTER all real routes, BEFORE errorMiddleware in app.js.
 */
const AppError = require("../utils/AppError");

const notFoundMiddleware = (req, res, next) => {
  next(
    new AppError(
      `Route not found: ${req.method} ${req.originalUrl}`,
      404,
      "NOT_FOUND"
    )
  );
};

module.exports = notFoundMiddleware;
