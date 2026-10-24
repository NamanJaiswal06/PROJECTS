const jwt = require('jsonwebtoken');

/**
 * Signs a JWT for the given user ID.
 * @param {string} id - MongoDB ObjectId string
 * @returns {string} signed JWT
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '24h',
  });
};

module.exports = { generateToken };
