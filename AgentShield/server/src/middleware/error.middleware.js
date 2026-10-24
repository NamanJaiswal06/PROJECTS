/**
 * error.middleware.js — Global Express error handler.
 *
 * Why this exists:
 *   Express recognizes a 4-argument middleware (err, req, res, next) as an
 *   error handler. By placing this at the end of the middleware chain in
 *   app.js, it catches all errors forwarded by next(err) from any route
 *   or middleware above it.
 *
 * Behavior:
 *   - AppError (isOperational = true)  → format and send clean JSON
 *   - Mongoose ValidationError         → map to 400 VALIDATION_ERROR
 *   - Mongoose CastError               → map to 400 INVALID_ID
 *   - Mongoose duplicate key (11000)   → map to 409 CONFLICT
 *   - JWT errors                       → map to 401 UNAUTHORIZED
 *   - Unexpected errors (bugs)         → log fully, send generic 500
 *
 * Security:
 *   Stack traces are NEVER sent to clients in production.
 *   In development, the stack is included so you can debug quickly.
 */
const AppError = require("../utils/AppError");
const logger = require("../utils/logger");
const env = require("../config/env");

// ─── Helpers to convert known library errors into AppErrors ───────────────────

function handleMongooseValidation(err) {
  const details = Object.values(err.errors).map((e) => ({
    field: e.path,
    message: e.message,
  }));
  return new AppError("Validation failed", 400, "VALIDATION_ERROR", details);
}

function handleMongooseCastError(err) {
  return new AppError(
    `Invalid value for field '${err.path}': '${err.value}'`,
    400,
    "INVALID_ID"
  );
}

function handleMongoDuplicateKey(err) {
  // Extract the duplicated field from the error message
  const match = err.message.match(/index: (?:.*\.)?\$?(\S+)_\d/);
  const field = match ? match[1] : "field";
  return new AppError(
    `A record with this ${field} already exists`,
    409,
    "CONFLICT"
  );
}

function handleJWTError() {
  return new AppError("Invalid token — please log in again", 401, "UNAUTHORIZED");
}

function handleJWTExpiredError() {
  return new AppError("Your session has expired — please log in again", 401, "TOKEN_EXPIRED");
}

// ─── The actual middleware ─────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
const errorMiddleware = (err, req, res, next) => {
  // Convert known library errors to AppErrors
  let error = err;

  if (err.name === "ValidationError") error = handleMongooseValidation(err);
  else if (err.name === "CastError") error = handleMongooseCastError(err);
  else if (err.code === 11000) error = handleMongoDuplicateKey(err);
  else if (err.name === "JsonWebTokenError") error = handleJWTError();
  else if (err.name === "TokenExpiredError") error = handleJWTExpiredError();

  // Normalize missing fields
  error.statusCode = error.statusCode || 500;
  error.code = error.code || "INTERNAL_ERROR";

  // ── Logging ───────────────────────────────────────────────────────────────
  if (error.isOperational) {
    // Expected error — log at warn level with minimal details
    logger.warn("[error] Operational error", {
      code: error.code,
      statusCode: error.statusCode,
      message: error.message,
      path: req.path,
      method: req.method,
    });
  } else {
    // Unexpected error (programmer bug) — log full details for investigation
    logger.error("[error] Unexpected error", {
      message: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
    });
  }

  // ── Response ──────────────────────────────────────────────────────────────
  const response = {
    success: false,
    error: {
      code: error.code,
      message: error.isOperational
        ? error.message
        : "An unexpected error occurred. Please try again later.",
      ...(error.details && error.details.length > 0 && { details: error.details }),
    },
  };

  // Include stack in development only
  if (env.isDevelopment && !error.isOperational) {
    response.error.stack = error.stack;
  }

  res.status(error.statusCode).json(response);
};

module.exports = errorMiddleware;
