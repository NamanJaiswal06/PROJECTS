"use strict";
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDB = require("../src/config/db");
const User = require("../src/models/User");

/**
 * Seed script — safe upsert (idempotent).
 * Run: npm run seed
 *
 * Required env vars:
 *   MONGODB_URI
 *   DEMO_TEACHER_PASSWORD
 *   DEMO_STUDENT_PASSWORD
 */
const seed = async () => {
  await connectDB();

  const teacherPassword = process.env.DEMO_TEACHER_PASSWORD;
  const studentPassword = process.env.DEMO_STUDENT_PASSWORD;

  if (!teacherPassword || !studentPassword) {
    console.error(
      "ERROR: DEMO_TEACHER_PASSWORD and DEMO_STUDENT_PASSWORD must be set in .env"
    );
    process.exit(1);
  }

  const SALT_ROUNDS = 12;

  const users = [
    {
      name: "Dr. Anita Sharma",
      email: "teacher@campusconnect.dev",
      password: teacherPassword,
      role: "teacher",
    },
    {
      name: "Rahul Verma",
      email: "student1@campusconnect.dev",
      password: studentPassword,
      role: "student",
    },
    {
      name: "Priya Singh",
      email: "student2@campusconnect.dev",
      password: studentPassword,
      role: "student",
    },
  ];

  for (const userData of users) {
    const passwordHash = await bcrypt.hash(userData.password, SALT_ROUNDS);

    // Safe upsert: update if email exists, insert if not
    const result = await User.findOneAndUpdate(
      { email: userData.email },
      {
        $set: {
          name: userData.name,
          passwordHash,
          role: userData.role,
        },
      },
      { upsert: true, new: true, runValidators: true }
    );

    console.log(
      `✓ Seeded ${result.role}: ${result.name} <${result.email}>`
    );
  }

  console.log("\nSeed complete. Demo accounts:");
  console.log("  Teacher : teacher@campusconnect.dev");
  console.log("  Student1: student1@campusconnect.dev");
  console.log("  Student2: student2@campusconnect.dev");

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
