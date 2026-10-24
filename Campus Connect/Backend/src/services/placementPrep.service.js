"use strict";
const { GoogleGenerativeAI } = require("@google/generative-ai");
const crypto = require("crypto");

/**
 * Shared Gemini helper — returns a configured model instance.
 * Throws a typed error (statusCode) if GEMINI_API_KEY is missing.
 */
const candidateModels = [
  process.env.GEMINI_MODEL,
  "gemini-3.7-flash",
  "gemini-3.5-flash",
  "gemini-flash-lite-latest",
].filter(Boolean);

const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const err = new Error(
      "AI service is not configured. Please set GEMINI_API_KEY."
    );
    err.statusCode = 503;
    throw err;
  }
  return new GoogleGenerativeAI(apiKey);
};

/**
 * Extracts JSON array substring safely even if model includes conversational text.
 */
const extractJsonArray = (text) => {
  const clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const firstBracket = clean.indexOf("[");
  const lastBracket = clean.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    return clean.slice(firstBracket, lastBracket + 1);
  }
  return clean;
};

const generateWithFallback = async (genAI, promptStr) => {
  let lastErr;
  for (const mName of candidateModels) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const model = genAI.getGenerativeModel({ model: mName });
        const result = await model.generateContent(promptStr);
        return result.response.text().trim();
      } catch (err) {
        lastErr = err;
        console.warn(`[PlacementPrep model ${mName} attempt ${attempt} failed: ${err.message}]`);
        if (err.status === 429 || err.status === 404) break;
        if (attempt === 1) {
          await new Promise((r) => setTimeout(r, 1200));
        }
      }
    }
  }
  throw lastErr;
};

/**
 * Generates multiple-choice practice questions for a placement opportunity.
 *
 * Returns an array of question objects (correctAnswerIndex included — caller
 * must strip it before sending to the client).
 *
 * @param {Object} opportunity  - Mongoose opportunity document
 * @param {number} count        - Number of questions requested (1–15)
 */
const generateQuiz = async (opportunity, count) => {
  const genAI = getGenAI();

  const prompt = `You are a placement preparation assistant for college students in India.
Generate ${count} multiple-choice practice questions to help a student prepare for the following job opportunity.

OPPORTUNITY DETAILS:
Role: ${opportunity.role}
Company type / Description: ${opportunity.description}
Eligibility: ${opportunity.eligibility}

STRICT RULES:
1. Questions must be relevant to the role and typical interview/aptitude topics for this position.
2. Do NOT mention the specific company name as if it is a real company or use real company branding.
3. Clearly label these as practice questions, not official company questions.
4. Each question must have EXACTLY 4 options (option indices 0, 1, 2, 3).
5. correctAnswerIndex must be a number (0, 1, 2, or 3) pointing to the correct option.
6. explanation should briefly explain WHY the answer is correct.
7. topic should be a short label (e.g. "Data Structures", "Aptitude", "OOP Concepts").
8. Return ONLY valid JSON — no text outside the JSON array.

Return this exact structure:
[
  {
    "questionText": "...",
    "options": ["...", "...", "...", "..."],
    "correctAnswerIndex": 0,
    "explanation": "...",
    "topic": "..."
  }
]`;

  let rawText;
  try {
    rawText = await generateWithFallback(genAI, prompt);
  } catch (err) {
    console.error("[PlacementPrep AI Error]", err);
    const serviceErr = new Error(
      "AI provider request failed. Please try again later."
    );
    serviceErr.statusCode = 502;
    throw serviceErr;
  }

  // Parse and validate
  let parsed;
  try {
    parsed = JSON.parse(extractJsonArray(rawText));
  } catch {
    const err = new Error("AI returned malformed JSON. Please try again.");
    err.statusCode = 502;
    throw err;
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    const err = new Error("AI returned an empty or invalid question array.");
    err.statusCode = 502;
    throw err;
  }

  // Validate each question structure
  const valid = parsed.every(
    (q) =>
      typeof q.questionText === "string" &&
      Array.isArray(q.options) &&
      q.options.length === 4 &&
      typeof q.correctAnswerIndex === "number" &&
      q.correctAnswerIndex >= 0 &&
      q.correctAnswerIndex <= 3 &&
      typeof q.explanation === "string"
  );
  if (!valid) {
    const err = new Error(
      "AI returned questions with invalid structure. Please try again."
    );
    err.statusCode = 502;
    throw err;
  }

  // Attach a server-generated questionId to each question
  return parsed.slice(0, count).map((q) => ({
    questionId: crypto.randomUUID(),
    questionText: q.questionText,
    options: q.options,
    correctAnswerIndex: q.correctAnswerIndex, // stored server-side, stripped before client response
    explanation: q.explanation,
    topic: q.topic || "General",
  }));
};

/**
 * Generates an AI teaching schedule for the given subject, topics and date range.
 *
 * @param {string}   subject
 * @param {string[]} topics
 * @param {Date}     startDate
 * @param {Date}     endDate
 * @param {number}   classesPerWeek
 */
const generateTeachingPlan = async (
  subject,
  topics,
  startDate,
  endDate,
  classesPerWeek
) => {
  const genAI = getGenAI();

  const start = startDate.toISOString().split("T")[0];
  const end = endDate.toISOString().split("T")[0];

  const prompt = `You are an academic scheduling assistant for a college teacher.
Generate a teaching schedule for the subject below.

SUBJECT: ${subject}
TOPICS TO COVER: ${topics.join(", ")}
START DATE: ${start}
END DATE: ${end}
CLASSES PER WEEK: ${classesPerWeek}

STRICT RULES:
1. Schedule only dates between ${start} and ${end} inclusive.
2. Only schedule up to ${classesPerWeek} classes per week (Monday=1, Sunday=7).
3. Do NOT invent holidays or cancel classes unless the period is too short to fit all topics.
4. If there are more topics than available slots, distribute them as evenly as possible.
5. plannedDate must be a valid ISO date string (YYYY-MM-DD format).
6. sessionObjective must be a single concise sentence describing what students will learn.
7. Return ONLY valid JSON — no text outside the JSON array.
8. This plan is a SUGGESTION only — label it accordingly in the disclaimer field of the response.

Return this exact structure (an array, not wrapped):
[
  {
    "topic": "...",
    "plannedDate": "YYYY-MM-DD",
    "sessionObjective": "..."
  }
]`;

  let rawText;
  try {
    rawText = await generateWithFallback(genAI, prompt);
  } catch (err) {
    console.error("[TeachingPlan AI Error]", err);
    const serviceErr = new Error(
      "AI provider request failed. Please try again later."
    );
    serviceErr.statusCode = 502;
    throw serviceErr;
  }

  let parsed;
  try {
    parsed = JSON.parse(extractJsonArray(rawText));
  } catch {
    const err = new Error(
      "AI returned malformed JSON for teaching plan. Please try again."
    );
    err.statusCode = 502;
    throw err;
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    const err = new Error("AI returned an empty teaching plan.");
    err.statusCode = 502;
    throw err;
  }

  // Validate structure
  const valid = parsed.every(
    (s) =>
      typeof s.topic === "string" &&
      typeof s.plannedDate === "string" &&
      typeof s.sessionObjective === "string"
  );
  if (!valid) {
    const err = new Error("AI returned a teaching plan with invalid structure.");
    err.statusCode = 502;
    throw err;
  }

  // Validate all planned dates fall within range
  const start_ = startDate.getTime();
  const end_ = endDate.getTime();
  const datesInRange = parsed.every((s) => {
    const d = new Date(s.plannedDate).getTime();
    return !isNaN(d) && d >= start_ && d <= end_;
  });
  if (!datesInRange) {
    const err = new Error(
      "AI scheduled sessions outside the requested date range. Please try again."
    );
    err.statusCode = 502;
    throw err;
  }

  return parsed;
};

module.exports = { generateQuiz, generateTeachingPlan };
