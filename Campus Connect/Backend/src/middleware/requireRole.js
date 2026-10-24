"use strict";
const { failure } = require("../utils/apiResponse");

/**
 * Role-guard middleware factory.
 * Export: module.exports = requireRole
 * Usage: requireRole("teacher") or requireRole("student")
 * Returns 403 if the authenticated user's role does not match.
 */
const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return failure(res, 401, "Not authenticated.");
    }
    if (req.user.role !== role) {
      return failure(
        res,
        403,
        `Access denied. This endpoint requires the '${role}' role.`
      );
    }
    next();
  };
};

module.exports = requireRole;
