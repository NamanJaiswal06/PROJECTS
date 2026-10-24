"use strict";
const { failure } = require("../utils/apiResponse");

/**
 * 404 handler — catches any request that didn't match a route.
 */
const notFound = (req, res) => {
  return failure(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
};

module.exports = notFound;
