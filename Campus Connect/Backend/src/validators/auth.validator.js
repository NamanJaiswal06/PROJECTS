"use strict";
const { z } = require("zod");

const loginSchema = z.object({
  email: z.string().email("Invalid email format").toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").trim(),
  email: z.string().email("Invalid email format").toLowerCase().trim(),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters"),
  role: z.enum(["student", "teacher"], {
    errorMap: () => ({ message: "Role must be 'student' or 'teacher'" }),
  }),
});

module.exports = { loginSchema, registerSchema };
