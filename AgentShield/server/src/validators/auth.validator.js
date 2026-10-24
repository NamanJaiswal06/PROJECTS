/**
 * auth.validator.js — Zod schemas for authentication endpoints.
 *
 * Why Zod for validation?
 *   Mongoose validation only runs at the database layer — which means a bad
 *   request reaches the DB before being rejected. Zod validates at the route
 *   layer, before any business logic runs. This is faster, and gives us
 *   better error messages that we control completely.
 *
 *   Zod also strips unknown fields (stripUnknown behavior via .strict() or
 *   the middleware's use of result.data). This prevents clients from
 *   injecting extra fields like { role: "ADMIN" } into a register request.
 */
const { z } = require("zod");

// ─── Register ─────────────────────────────────────────────────────────────────
const registerSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),

  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address"),

  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password cannot exceed 72 characters")
    // bcrypt silently truncates passwords at 72 bytes — we enforce this limit
    // explicitly so the user knows rather than getting a silent mismatch later.
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),

  // Note: role is intentionally NOT accepted from the client.
  // New users always start as VIEWER. Admins can elevate roles separately.
  // If a client sends role: "ADMIN", Zod will strip it (unknown fields ignored).
});

// ─── Login ────────────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address"),

  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password is required"),
  // We keep login password validation minimal on purpose.
  // We don't want to tell an attacker that "your password is too short to
  // match our policy" — just let the compare fail generically.
});

// ─── Change password (Phase 2 extension) ─────────────────────────────────────
const changePasswordSchema = z.object({
  currentPassword: z
    .string({ required_error: "Current password is required" })
    .min(1, "Current password is required"),

  newPassword: z
    .string({ required_error: "New password is required" })
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password cannot exceed 72 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
});

module.exports = { registerSchema, loginSchema, changePasswordSchema };
