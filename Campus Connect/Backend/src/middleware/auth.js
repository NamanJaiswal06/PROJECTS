"use strict";
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { failure } = require("../utils/apiResponse");

/**
 * Authentication middleware.
 * Export: module.exports = authenticateToken
 * Usage: router.get("/", authenticateToken, handler)
 *
 * Reads Authorization: Bearer <token>
 * Verifies JWT, loads Mongoose user document into req.user.
 * Returns 401 if token is absent, invalid, or expired.
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return failure(res, 401, "Access denied. No token provided.");
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select("-passwordHash");
    if (!user) {
      return failure(res, 401, "User not found. Token invalid.");
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return failure(res, 401, "Token has expired. Please log in again.");
    }
    if (err.name === "JsonWebTokenError") {
      return failure(res, 401, "Invalid token.");
    }
    // Mongoose buffering timeout — database not connected
    if (err.name === "MongooseError" && err.message.includes("buffering timed out")) {
      return failure(res, 503, "Database unavailable. Please try again later.");
    }
    next(err);
  }
};

module.exports = authenticateToken;
