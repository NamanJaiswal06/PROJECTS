"use strict";
const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * Rewrites raw notice text into a professional title + content using Gemini.
 * Returns { title, content } — never saves or publishes.
 * Throws an Error with a `.statusCode` property for HTTP mapping.
 */
const rewriteNotice = async (rawText) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const err = new Error(
      "AI service is not configured. Please set GEMINI_API_KEY."
    );
    err.statusCode = 503;
    throw err;
  }

  const candidateModels = [
    process.env.GEMINI_MODEL,
    "gemini-3.7-flash",
    "gemini-3.5-flash",
    "gemini-flash-lite-latest",
  ].filter(Boolean);

  // Extract JSON object safely even if model includes conversational text
  const extractJsonObject = (text) => {
    const clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const firstBrace = clean.indexOf("{");
    const lastBrace = clean.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return clean.slice(firstBrace, lastBrace + 1);
    }
    return clean;
  };

  const prompt = `You are an administrative assistant for a college campus.
Rewrite the following raw text into a professional, well-structured notice.

STRICT RULES:
1. Do NOT invent, add, or assume any dates, times, venues, eligibility criteria, deadlines, amounts, or other facts that are not explicitly present in the input.
2. If the input lacks a specific detail, omit it from the output — do not guess.
3. Return ONLY valid JSON matching exactly this structure:
{
  "title": "<concise professional title>",
  "content": "<professional notice body>"
}
4. Do not include any text outside the JSON object.
5. The notice is a DRAFT only.

RAW TEXT:
${rawText}`;

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
          console.warn(`[Gemini model ${mName} attempt ${attempt} failed: ${err.message}]`);
          // If quota exceeded (429) or model not found (404), skip immediately to next model
          if (err.status === 429 || err.status === 404) break;
          if (attempt === 1) {
            await new Promise((r) => setTimeout(r, 1200));
          }
        }
      }
    }
    throw lastErr;
  };

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const responseText = await generateWithFallback(genAI, prompt);
    const jsonText = extractJsonObject(responseText);

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      const err = new Error(
        "AI returned an unexpected response format. Please try again."
      );
      err.statusCode = 502;
      throw err;
    }

    if (
      typeof parsed.title !== "string" ||
      typeof parsed.content !== "string"
    ) {
      const err = new Error(
        "AI response is missing required fields (title, content)."
      );
      err.statusCode = 502;
      throw err;
    }

    return { title: parsed.title, content: parsed.content };
  } catch (err) {
    if (err.statusCode) throw err;

    console.error("[AI Service Error]", err);
    const serviceErr = new Error(
      "AI provider request failed. Please try again later."
    );
    serviceErr.statusCode = 502;
    throw serviceErr;
  }
};

module.exports = { rewriteNotice };
