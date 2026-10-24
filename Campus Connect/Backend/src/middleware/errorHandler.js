"use strict";
const { failure } = require("../utils/apiResponse");

/**
 * Centralized error handler.
 * Must be registered LAST in app.js (after all routes).
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  console.error("[ErrorHandler]", err);

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return failure(res, 400, messages.join(", "));
  }

  // Mongoose CastError (bad ObjectId)
  if (err.name === "CastError" && err.kind === "ObjectId") {
    return failure(res, 400, "Invalid ID format.");
  }

  // MongoDB duplicate key
  if (err.code === 11000) {
    return failure(res, 409, "Duplicate entry. Resource already exists.");
  }

  // Zod validation errors bubble up here if thrown
  if (err.name === "ZodError") {
    const messages = err.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
    return failure(res, 400, messages.join(", "));
  }

  // Default 500
  return failure(res, 500, "An unexpected server error occurred.");
};

module.exports = errorHandler;
