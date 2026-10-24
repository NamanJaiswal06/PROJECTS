"use strict";
require("dotenv").config();
const express = require("express");
const cors = require("cors");

// Middleware
const errorHandler = require("./middleware/errorHandler");
const notFound = require("./middleware/notFound");

// Routes — Developer 1
const authRoutes = require("./routes/auth.routes");
const noticeRoutes = require("./routes/notice.routes");
const eventRoutes = require("./routes/event.routes");
const aiRoutes = require("./routes/ai.routes");

// Routes — Developer 2 (integrated here per contract)
const opportunityRoutes = require("./routes/opportunity.routes");
const applicationRoutes = require("./routes/application.routes");
const complaintRoutes = require("./routes/complaint.routes");

// Routes — P1/P2 features
const dashboardRoutes = require("./routes/dashboard.routes");
const placementPrepRoutes = require("./routes/placementPrep.routes");
const teachingPlanRoutes = require("./routes/teachingPlan.routes");

const app = express();

// ── Core middleware ──────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Campus Connect API is healthy",
    data: { timestamp: new Date().toISOString() },
  });
});

// ── API Routes (exact paths from contract) ───────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/ai", aiRoutes);

app.use("/api/opportunities", opportunityRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/complaints", complaintRoutes);

app.use("/api/dashboard", dashboardRoutes);
app.use("/api/placement-prep", placementPrepRoutes);
app.use("/api/teaching-plans", teachingPlanRoutes);

// ── 404 handler (must come after all routes) ─────────────────────────────────
app.use(notFound);

// ── Centralized error handler (must be last) ─────────────────────────────────
app.use(errorHandler);

module.exports = app;

