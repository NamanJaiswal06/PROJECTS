"use strict";

/**
 * Shared response helper.
 * Exact signatures per the master contract:
 *   success(res, statusCode, message, data)
 *   failure(res, statusCode, message)
 *
 * Export: module.exports = { success, failure }
 */

const success = (res, statusCode, message, data = null) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const failure = (res, statusCode, message) => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = { success, failure };
