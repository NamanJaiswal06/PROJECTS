/**
 * AppError — Custom error class for all operational errors.
 *
 * Why this exists:
 *   Express's default error handling can't distinguish between a
 *   programmer bug (e.g., null dereference) and a business error
 *   (e.g., "agent not found"). This class marks intentional,
 *   expected errors so the global error middleware can format them
 *   cleanly without exposing stack traces to clients.
 *
 * Usage:
 *   throw new AppError("Agent not found", 404, "NOT_FOUND");
 */
class AppError extends Error {
  /**
   * @param {string} message      — Human-readable error message (safe to expose)
   * @param {number} statusCode   — HTTP status code (400, 401, 403, 404, 409, 500…)
   * @param {string} code         — Machine-readable error code for clients (e.g. "VALIDATION_ERROR")
   * @param {Array}  [details=[]] — Optional array of additional error details (e.g. Zod field errors)
   */
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR", details = []) {
    super(message);

    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    // Mark as an operational (expected) error.
    // The global error handler checks this flag:
    //   - isOperational = true  → log as warning, send clean JSON
    //   - isOperational = false → log as error (bug), hide internals
    this.isOperational = true;

    // Capture stack trace but exclude the AppError constructor frame
    // so the stack points to where the error was actually thrown.
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
