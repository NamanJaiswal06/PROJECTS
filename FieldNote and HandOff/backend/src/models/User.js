const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // never returned in queries by default
    },
    role: {
      type: String,
      enum: ['technician', 'supervisor'],
      default: 'technician',
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // adds createdAt + updatedAt
  }
);

// ─── Hash password before saving ─────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  // Only re-hash if the password field was actually modified
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── Instance method: compare passwords ──────────────────────────────────────
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// ─── Instance method: safe public profile (no password) ──────────────────────
userSchema.methods.toPublicJSON = function () {
  return {
    _id: this._id,
    email: this.email,
    username: this.username,
    role: this.role,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
