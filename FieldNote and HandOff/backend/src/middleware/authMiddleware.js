const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protects routes — verifies the Bearer JWT in the Authorization header.
 * On success: attaches `req.user` (without password) and calls next().
 * On failure: returns 401.
 */
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized — no token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh user data (catches deactivated accounts)
    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Not authorized — user not found or deactivated' });
    }

    req.user = user;
    next();
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError'
        ? 'Not authorized — token expired'
        : 'Not authorized — invalid token';
    return res.status(401).json({ success: false, message });
  }
};

/**
 * Role-based access control — use after `protect`.
 * Example: router.delete('/admin', protect, authorize('supervisor'), handler)
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role "${req.user.role}" is not authorized to access this route`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
