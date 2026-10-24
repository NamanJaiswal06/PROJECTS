/**
 * User.js — The User model.
 *
 * Why it exists:
 *   Represents a human operator who manages AgentShield — an admin,
 *   security analyst, or read-only viewer. Users are NOT AI agents.
 *   Users log in to review threats, manage policies, and approve/reject
 *   actions flagged by the risk engine.
 *
 * Fields:
 *   name         — Display name. Required. Not used for auth.
 *   email        — Login identifier. Required. Unique. Normalized to lowercase.
 *   passwordHash — bcrypt hash of the user's password. NEVER the plaintext.
 *   role         — Controls what the user can do (see USER_ROLES constant).
 *   isActive     — Soft-disable: false = account suspended, cannot log in.
 *   lastLoginAt  — When the user last authenticated. Useful for detecting
 *                  stale/unused accounts.
 *
 * Security considerations:
 *   - passwordHash is excluded from all queries by default via `select: false`.
 *     This means User.findById() will NOT return the hash unless you
 *     explicitly call .select('+passwordHash'). This prevents accidental
 *     password hash leaks in API responses.
 *   - Email is lowercased before save to prevent "Admin@example.com" vs
 *     "admin@example.com" creating two accounts.
 *   - No plaintext password field exists in the schema.
 *
 * Indexes:
 *   email (unique) — The primary lookup key for login. Also enforces uniqueness.
 *
 * Relationships:
 *   - Agent.owner → User._id (an agent belongs to a user/team)
 *   - AuditLog.actorId → User._id (who performed the action)
 *   - ApprovalRequest.reviewedBy → User._id (who approved/rejected)
 *
 * Example document:
 *   {
 *     _id: ObjectId("..."),
 *     name: "Priya Sharma",
 *     email: "priya@company.com",
 *     passwordHash: "$2b$12$...",
 *     role: "ANALYST",
 *     isActive: true,
 *     lastLoginAt: ISODate("2024-01-15T10:30:00Z"),
 *     createdAt: ISODate("2024-01-01T00:00:00Z"),
 *     updatedAt: ISODate("2024-01-15T10:30:00Z")
 *   }
 */
const mongoose = require("mongoose");
const { USER_ROLES } = require("../utils/constants");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true, // Normalize to lowercase before save
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },

    passwordHash: {
      type: String,
      required: [true, "Password hash is required"],
      // select: false means this field is EXCLUDED from query results by default.
      // To include it you must explicitly call .select('+passwordHash').
      // This is a critical safety measure — it prevents password hashes from
      // accidentally appearing in API responses.
      select: false,
    },

    role: {
      type: String,
      enum: {
        values: Object.values(USER_ROLES),
        message: `Role must be one of: ${Object.values(USER_ROLES).join(", ")}`,
      },
      default: USER_ROLES.VIEWER,
    },

    isActive: {
      type: Boolean,
      default: true,
      // When false, the user cannot log in even with correct credentials.
      // This is a soft-disable — the account exists but is blocked.
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    // Automatically add createdAt and updatedAt fields
    timestamps: true,

    // Customize JSON serialization — when this document is included in an
    // API response, remove the passwordHash and __v fields even if
    // they were somehow loaded.
    toJSON: {
      transform(doc, ret) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// email is already indexed by unique:true above.
// Adding an explicit compound index for common admin queries:
// "Show me all active analysts" → queries by role + isActive
userSchema.index({ role: 1, isActive: 1 });

const User = mongoose.model("User", userSchema);

module.exports = User;
