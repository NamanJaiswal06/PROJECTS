const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { generateToken } = require('../utils/generateToken');

// ─── POST /api/auth/register ──────────────────────────────────────────────────
const register = asyncHandler(async (req, res) => {
  const { username, email, password, role } = req.body;

  // Basic field validation
  if (!username || !email || !password) {
    res.status(400);
    throw new Error('Username, email, and password are required');
  }

  // Check for existing user
  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    res.status(409);
    throw new Error(
      existing.email === email ? 'Email already registered' : 'Username already taken'
    );
  }

  const user = await User.create({ username, email, password, role });
  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    token,
    user: user.toPublicJSON(),
  });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  // Include password field for comparison (it's select: false in schema)
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error('Account is deactivated. Contact your supervisor.');
  }

  // Update lastLogin timestamp
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const token = generateToken(user._id);

  res.json({
    success: true,
    token,
    user: user.toPublicJSON(),
  });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
const getMe = asyncHandler(async (req, res) => {
  // req.user is already attached by authMiddleware
  res.json({ success: true, user: req.user.toPublicJSON() });
});

module.exports = { register, login, getMe };
