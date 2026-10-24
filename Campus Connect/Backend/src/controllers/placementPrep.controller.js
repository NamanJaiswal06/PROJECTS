"use strict";
const mongoose = require("mongoose");
const Opportunity = require("../models/Opportunity");
const QuizSession = require("../models/QuizSession");
const { generateQuiz } = require("../services/placementPrep.service");
const {
  generateQuizSchema,
  submitQuizSchema,
} = require("../validators/placementPrep.validator");
const { success, failure } = require("../utils/apiResponse");

/**
 * POST /api/placement-prep/generate-quiz
 * Authenticated student — generates a practice quiz for a placement opportunity.
 *
 * The client receives questions WITHOUT correctAnswerIndex.
 * The full session (with answers) is stored server-side.
 */
const generateQuizHandler = async (req, res, next) => {
  try {
    const parsed = generateQuizSchema.safeParse(req.body);
    if (!parsed.success) {
      const messages = parsed.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return failure(res, 400, messages);
    }

    const { opportunityId, numberOfQuestions } = parsed.data;

    if (!mongoose.Types.ObjectId.isValid(opportunityId)) {
      return failure(res, 400, "Invalid opportunityId format.");
    }

    const opportunity = await Opportunity.findById(opportunityId);
    if (!opportunity) {
      return failure(res, 404, "Opportunity not found.");
    }

    // Generate via AI service
    let questions;
    try {
      questions = await generateQuiz(opportunity, numberOfQuestions);
    } catch (err) {
      if (err.statusCode) return failure(res, err.statusCode, err.message);
      throw err;
    }

    // Persist full session (with correct answers) server-side
    const session = await QuizSession.create({
      studentId: req.user._id,
      opportunityId,
      questions,
      totalQuestions: questions.length,
    });

    // Strip correctAnswerIndex before sending to client
    const clientQuestions = questions.map(({ correctAnswerIndex, ...safe }) => safe);

    return success(res, 201, "Practice quiz generated", {
      sessionId: session._id,
      opportunityRole: opportunity.role,
      expiresAt: session.expiresAt,
      disclaimer:
        "These are AI-generated practice questions for preparation purposes only. They are not official interview questions.",
      questions: clientQuestions,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/placement-prep/submit-quiz
 * Student only — scores the submitted answers server-side.
 *
 * Never trusts client-supplied answer keys or scores.
 */
const submitQuizHandler = async (req, res, next) => {
  try {
    const parsed = submitQuizSchema.safeParse(req.body);
    if (!parsed.success) {
      const messages = parsed.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return failure(res, 400, messages);
    }

    const { sessionId, answers } = parsed.data;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return failure(res, 400, "Invalid sessionId format.");
    }

    const session = await QuizSession.findById(sessionId);
    if (!session) {
      return failure(
        res,
        404,
        "Quiz session not found or has expired (sessions expire after 1 hour)."
      );
    }

    // Ownership check — only the student who generated it can submit
    if (session.studentId.toString() !== req.user._id.toString()) {
      return failure(res, 403, "You can only submit your own quiz.");
    }

    if (session.submittedAt) {
      return failure(
        res,
        409,
        "This quiz has already been submitted. Start a new quiz."
      );
    }

    // Server-side scoring — build answer map from stored session
    const questionMap = {};
    session.questions.forEach((q) => {
      questionMap[q.questionId] = q;
    });

    let correct = 0;
    let incorrect = 0;
    const topicResults = {};
    const detailedResults = [];

    for (const answer of answers) {
      const q = questionMap[answer.questionId];
      if (!q) continue; // skip unknown question IDs

      const isCorrect = answer.selectedOptionIndex === q.correctAnswerIndex;
      if (isCorrect) {
        correct++;
      } else {
        incorrect++;
      }

      // Track per-topic performance
      const topic = q.topic || "General";
      if (!topicResults[topic]) topicResults[topic] = { correct: 0, total: 0 };
      topicResults[topic].total++;
      if (isCorrect) topicResults[topic].correct++;

      detailedResults.push({
        questionId: q.questionId,
        questionText: q.questionText,
        yourAnswer: q.options[answer.selectedOptionIndex] ?? "No answer",
        correctAnswer: q.options[q.correctAnswerIndex],
        isCorrect,
        explanation: q.explanation,
        topic,
      });
    }

    const score =
      session.totalQuestions > 0
        ? Math.round((correct / session.totalQuestions) * 100)
        : 0;

    // Identify skill gaps — topics where < 50% were correct
    const skillGaps = Object.entries(topicResults)
      .filter(([, r]) => r.correct / r.total < 0.5)
      .map(([topic]) => topic);

    const recommendedTopics = skillGaps.length
      ? skillGaps
      : ["Continue practising to maintain your performance."];

    // Persist results
    session.score = score;
    session.correctCount = correct;
    session.incorrectCount = incorrect;
    session.skillGaps = skillGaps;
    session.recommendedTopics = recommendedTopics;
    session.submittedAt = new Date();
    await session.save();

    return success(res, 200, "Quiz submitted and scored", {
      score,
      totalQuestions: session.totalQuestions,
      correctCount: correct,
      incorrectCount: incorrect,
      skillGaps,
      recommendedTopics,
      detailedResults,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { generateQuizHandler, submitQuizHandler };
