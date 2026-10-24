"use strict";
const mongoose = require("mongoose");

/**
 * QuizSession stores the generated quiz + server-side answer key.
 * The client never receives correctAnswerIndex — only questionId + options.
 * Scoring happens entirely server-side using this document.
 */
const quizSessionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    opportunityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Opportunity",
      required: true,
    },
    // Full questions with answers stored server-side
    questions: [
      {
        questionId: { type: String, required: true },
        questionText: { type: String, required: true },
        options: [{ type: String }],           // 4 options
        correctAnswerIndex: { type: Number },   // 0-3, NEVER sent to client
        explanation: { type: String },
        topic: { type: String },
      },
    ],
    // Populated after submit-quiz
    score: { type: Number, default: null },
    totalQuestions: { type: Number },
    correctCount: { type: Number, default: null },
    incorrectCount: { type: Number, default: null },
    skillGaps: [{ type: String }],
    recommendedTopics: [{ type: String }],
    submittedAt: { type: Date, default: null },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 60 * 60 * 1000), // 1 hour TTL
    },
  },
  { timestamps: true }
);

// TTL index — auto-delete expired sessions after 1 hour
quizSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("QuizSession", quizSessionSchema);
