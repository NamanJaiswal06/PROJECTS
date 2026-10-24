"use strict";
const Notice = require("../models/Notice");
const Event = require("../models/Event");
const Opportunity = require("../models/Opportunity");
const Application = require("../models/Application");
const Complaint = require("../models/Complaint");
const { success, failure } = require("../utils/apiResponse");

/**
 * GET /api/dashboard/student
 * Student only — returns a combined summary of all relevant data
 */
const getStudentDashboard = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const now = new Date();

    // Run all queries in parallel for performance
    const [notices, events, opportunities, applications, complaints] =
      await Promise.all([
        // Published notices, newest first
        Notice.find({ status: "published" })
          .populate("createdBy", "name")
          .sort({ publishedAt: -1 })
          .limit(10),

        // Upcoming events, sorted by date ascending
        Event.find({ eventDate: { $gte: now } })
          .populate("createdBy", "name")
          .sort({ eventDate: 1 }),

        // All opportunities sorted by deadline ascending
        Opportunity.find()
          .sort({ deadline: 1 }),

        // This student's applications, with opportunity info
        Application.find({ studentId })
          .populate("opportunityId", "company role deadline packageOrStipend")
          .sort({ updatedAt: -1 }),

        // This student's complaints, newest first
        Complaint.find({ studentId }).sort({ createdAt: -1 }),
      ]);

    // Summary calculations
    const upcomingEvents = events.length;
    const availableOpportunities = opportunities.filter(
      (o) => new Date(o.deadline) >= now
    ).length;
    const activeApplications = applications.filter(
      (a) => !["rejected", "selected"].includes(a.status)
    ).length;
    const openComplaints = complaints.filter(
      (c) => c.status !== "resolved"
    ).length;

    // Upcoming deadlines — applications with opportunity deadline within 7 days
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingDeadlines = applications
      .filter((a) => {
        const deadline =
          a.opportunityId && a.opportunityId.deadline
            ? new Date(a.opportunityId.deadline)
            : null;
        return (
          deadline &&
          deadline >= now &&
          deadline <= sevenDays &&
          !["rejected", "selected"].includes(a.status)
        );
      })
      .map((a) => ({
        applicationId: a._id,
        company: a.opportunityId.company,
        role: a.opportunityId.role,
        deadline: a.opportunityId.deadline,
        status: a.status,
      }));

    return success(res, 200, "Student dashboard loaded", {
      notices,
      events,
      opportunities,
      applications,
      complaints,
      upcomingDeadlines,
      summary: {
        upcomingEvents,
        availableOpportunities,
        activeApplications,
        openComplaints,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getStudentDashboard };
