const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI((process.env.GEMINI_API_KEY || '').trim());

const MODEL = 'gemini-3.6-flash';

/**
 * Core LLM call using Gemini.
 * All 5 prompts output ONLY valid JSON — responseMimeType enforces this.
 *
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @returns {object} parsed JSON response
 */
const callLLM = async (systemPrompt, userPrompt) => {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: systemPrompt,
    generationConfig: {
      responseMimeType: 'application/json', // Forces valid JSON output
      temperature: 0.2,                     // Low temp = factual, structured
    },
  });

  const result = await model.generateContent(userPrompt);
  const raw = result.response.text();
  return JSON.parse(raw);
};

// ─── Prompt #2 — Parse spoken observation ─────────────────────────────────────
/**
 * @param {{ unit_id, technician_name, raw_transcript }} params
 * @returns {{ type, text, resolved, risk, needs_clarification, clarification_question }}
 */
const parseTranscript = async ({ unit_id, technician_name, raw_transcript }) => {
  const system = `You are the logging layer for a field-maintenance voice assistant. You receive a raw speech transcript from a technician working on industrial equipment. Convert it into a single structured log entry. Do not invent details that were not said. If the transcript is ambiguous or incomplete, set "needs_clarification": true and write a short spoken-back clarifying question in "clarification_question".

Output ONLY valid JSON matching this shape:
{
  "type": "observation",
  "text": "<cleaned, third-person summary of what was said>",
  "resolved": false,
  "risk": "low",
  "needs_clarification": false,
  "clarification_question": ""
}

The "type" field must be one of: observation, action, unresolved
The "risk" field must be one of: low, medium, high`;

  const user = `Unit: ${unit_id}
Technician: ${technician_name}
Transcript: "${raw_transcript}"`;

  return callLLM(system, user);
};

// ─── Prompt #3 — Rank retrieved cases + draft spoken response ─────────────────
/**
 * @param {{ current_observation, retrieved_cases, last_handoff }} params
 * @returns {{ spoken_response, used_case_ids, confidence }}
 */
const draftResponse = async ({ current_observation, retrieved_cases, last_handoff }) => {
  const system = `You are the voice-response layer for a field technician's hands-free assistant. You will receive the technician's current observation and a list of retrieved past cases/handoffs for the same equipment unit. Produce a short spoken response.

Rules:
- Maximum 2 sentences. This will be spoken aloud, not read.
- Lead with the single most relevant retrieved fact, not a list.
- If nothing retrieved is actually relevant, say so plainly and suggest the next diagnostic step.
- Never use markdown, SSML, or emotion tags. Plain spoken sentences only.
- End with one clear next action, phrased as a suggestion, not a command.

Output ONLY valid JSON:
{
  "spoken_response": "<what Rime will say, 2 sentences max>",
  "used_case_ids": ["<ids of retrieved cases actually referenced>"],
  "confidence": "high"
}

The "confidence" field must be one of: high, medium, low`;

  const user = `Current observation: "${current_observation}"
Retrieved cases:
${JSON.stringify(retrieved_cases, null, 2)}
Last handoff for this unit (if any):
${JSON.stringify(last_handoff, null, 2)}`;

  return callLLM(system, user);
};

// ─── Prompt #4 — Generate end-of-shift handoff ────────────────────────────────
/**
 * @param {{ unit_id, session_id, technician_name, all_session_logs }} params
 * @returns {{ unit_id, session_id, summary, checked, found, fixed, unresolved, next_steps, risk_level }}
 */
const generateHandoff = async ({ unit_id, session_id, technician_name, all_session_logs }) => {
  const system = `You are generating an end-of-shift handoff summary for a field technician working on industrial equipment. You will receive every log entry from this session. Produce a structured summary that lets the next technician understand the full state of the unit without re-reading raw notes.

Be precise and factual. Do not editorialize. Do not invent items that weren't logged. Separate genuinely unresolved issues from completed actions.

Output ONLY valid JSON:
{
  "unit_id": "<unit_id>",
  "session_id": "<session_id>",
  "summary": "<one or two sentence overview, spoken-back friendly>",
  "checked": ["<short phrases>"],
  "found": ["<short phrases>"],
  "fixed": ["<short phrases>"],
  "unresolved": ["<short phrases>"],
  "next_steps": ["<concrete, specific actions>"],
  "risk_level": "low"
}

The "risk_level" field must be one of: low, medium, high`;

  const user = `Session log entries for ${unit_id}, technician ${technician_name}:
${JSON.stringify(all_session_logs.map((p) => p.payload || p), null, 2)}`;

  return callLLM(system, user);
};

// ─── Prompt #5 — RECOVER: answer new technician's question ───────────────────
/**
 * @param {{ new_technician_name, unit_id, question_text, latest_handoff, recent_logs }} params
 * @returns {{ spoken_response, unresolved_flagged }}
 */
const recover = async ({ new_technician_name, unit_id, question_text, latest_handoff, recent_logs }) => {
  const system = `You are the memory-recovery layer for a field-maintenance assistant. A new technician is asking about the current state of a piece of equipment. Answer using ONLY the retrieved handoff and log context provided — never invent findings that aren't in the record.

If the retrieved context doesn't cover what they're asking, say so directly rather than guessing.

Keep the answer spoken-friendly: 2 to 4 short sentences, prioritized by what's most operationally important right now (unresolved issues and next steps first, then what's already been checked).

Output ONLY valid JSON:
{
  "spoken_response": "<answer, spoken-friendly>",
  "unresolved_flagged": false
}`;

  const user = `Question from ${new_technician_name}: "${question_text}"
Latest handoff for ${unit_id}:
${JSON.stringify(latest_handoff, null, 2)}
Recent session logs:
${JSON.stringify(recent_logs, null, 2)}`;

  return callLLM(system, user);
};

// ─── Prompt #7 — Correction / deletion ───────────────────────────────────────
/**
 * @param {{ correction_transcript, recent_entries }} params
 * @returns {{ action, target_entry_summary, corrected_text }}
 */
const correct = async ({ correction_transcript, recent_entries }) => {
  const system = `A technician is correcting a previously logged fact about this equipment unit. Identify which stored log entry the correction refers to, and produce an update: either a corrected version of that entry, or a flag to delete it if it is now known to be wrong.

Output ONLY valid JSON:
{
  "action": "update",
  "target_entry_summary": "<short description of what is being corrected>",
  "corrected_text": "<string, only if action is update>"
}

The "action" field must be one of: update, delete`;

  const user = `Correction spoken by technician: "${correction_transcript}"
Candidate recent entries for this unit:
${JSON.stringify(recent_entries, null, 2)}`;

  return callLLM(system, user);
};

module.exports = { parseTranscript, draftResponse, generateHandoff, recover, correct };
