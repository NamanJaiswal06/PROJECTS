# FIELDNOTE — AI Architecture & Prompt Documentation

> This document is the ML engineer's deliverable for the `docs/` directory.
> Contains: final system prompt, intent classifier prompt, tool schemas, and agent architecture notes.

---

## System Prompt

Used by the agent loop on **every turn**. Kept under 200 words — every word goes into the token budget and influences the spoken reply.

```
You are FIELDNOTE, a voice assistant for field maintenance technicians.

Your job:
- Help technicians inspect equipment, record observations, find similar past incidents, and create shift handoffs.
- Always ground your answers in retrieved historical cases when equipment is in context.
- Be concise — your answer will be spoken aloud by Rime TTS. Use short sentences.
- When referencing retrieved cases, explicitly say "Based on N similar historical cases..." so the technician knows you used memory.
- When the user says "create the handoff", call the createHandoff tool with all session observations.
- Never invent equipment IDs or findings that were not stated or retrieved.
- Never use markdown, bullet points, or lists in your spoken response — plain spoken sentences only.

Tool calling rules:
- Always call getEquipment first when starting a new inspection.
- Always call findSimilarCases when the user reports a symptom or observation.
- Always call recordObservation to persist what the technician just observed.
- Call createHandoff only when explicitly asked.
- Call getHandoff when a new technician asks about prior shift context.
```

---

## Concise-Mode Suffix

Appended to the system prompt when the user says "just tell me", "short answer", "in one line":

```
Reply in at most one sentence — only the single most important fact.
```

---

## Intent Classifier Prompt

Single Gemini call with `responseMimeType: application/json` and `temperature: 0.0`.

```
You are a field-maintenance voice assistant intent classifier.

Given a technician's spoken utterance, classify it into exactly one of these intents:
- start_inspection  — technician is starting work on a specific unit
- record_observation — technician is reporting what they see/hear/feel
- create_handoff     — technician is ending the shift and wants a handoff created
- query_handoff      — technician is asking what happened in a prior shift
- chitchat           — anything else (greetings, confirmations, unclear)

Also extract:
- equipmentId: the unit ID mentioned (e.g. "UNIT-27"). Use null if not mentioned.
- concise: true if the user asks for a short/one-line answer

Output ONLY valid JSON:
{
  "intent": "<one of the five intents>",
  "equipmentId": "<UNIT-XX or null>",
  "concise": false
}
```

---

## Tool Schemas (Gemini Function Declarations)

### `getEquipment`
Fetch metadata for a specific equipment unit. Called first when starting an inspection.

| Param | Type | Required | Description |
|---|---|---|---|
| `equipmentId` | string | ✅ | e.g. "UNIT-27" |

### `getEquipmentHistory`
Fetch recent incident history from MongoDB for a unit.

| Param | Type | Required | Description |
|---|---|---|---|
| `equipmentId` | string | ✅ | e.g. "UNIT-27" |
| `limit` | number | — | Default 10, max 20 |

### `findSimilarCases`
Search Qdrant semantic memory for similar past incidents. **Always reference in spoken reply.**

| Param | Type | Required | Description |
|---|---|---|---|
| `query` | string | ✅ | Natural-language symptom description |
| `equipmentId` | string | — | Scopes search to this unit |
| `k` | number | — | Results to retrieve (default 5) |

**Retrieval rule:** filter → top-k cosine → rerank by recency on ties → feed top-3 to LLM → response must say "Based on N similar historical cases..."

### `recordObservation`
Persist a structured field-log entry to MongoDB + Qdrant. Called after every technician observation.

| Param | Type | Required | Description |
|---|---|---|---|
| `equipmentId` | string | ✅ | Unit being observed |
| `symptom` | string | ✅ | What was observed |
| `finding` | string | — | Root cause or diagnosis |
| `action` | string | — | Action taken |
| `status` | enum | — | `resolved` / `unresolved` / `monitoring` |
| `priority` | enum | — | `low` / `medium` / `high` |
| `nextAction` | string | — | Recommended follow-up |

**Zod-validated** before any write. Invalid calls return `{ error }` and never touch the database.

### `createHandoff`
Generate and persist end-of-shift summary to MongoDB + index in Qdrant for future recovery.

| Param | Type | Required | Description |
|---|---|---|---|
| `equipmentId` | string | ✅ | Unit |
| `summary` | string | ✅ | 1–2 sentence summary |
| `checked` | string[] | — | Items checked |
| `found` | string[] | — | Issues found |
| `fixed` | string[] | — | Issues resolved |
| `unresolvedIssues` | string[] | — | Still open |
| `nextActions` | string[] | — | Concrete follow-ups |
| `riskLevel` | enum | — | `low` / `medium` / `high` |

**Zod-validated.** Handoff is indexed with text pattern: `summary. Unresolved: ... Next: ...`

### `getHandoff`
Retrieve most recent shift handoff from MongoDB. Powers the shift-recovery demo flow.

| Param | Type | Required | Description |
|---|---|---|---|
| `equipmentId` | string | ✅ | Unit |
| `shift` | string | — | Optional shift filter |

---

## Agent Architecture

```
POST /api/agent/turn
   │
   ├─ STT (Deepgram nova-2) ← base64 audio or pre-transcribed text
   │
   ├─ Intent Router (Gemini, temp=0.0, JSON output)
   │     └─ { intent, equipmentId, concise }
   │
   ├─ Auto-retrieval: if equipmentId known → findSimilarCases(query)
   │     └─ top-3 injected as system context block
   │
   ├─ Agent loop (Gemini 1.5 Flash, function calling)
   │     ├─ Tool call 1 → result → messages
   │     ├─ Tool call 2 → result → messages   (max 5 iterations)
   │     └─ Final text reply
   │
   └─ TTS (Rime, voice=marsh, model=mist)
         └─ mp3 bytes → base64 → client
```

**Session state** (in-memory, per sessionId):
```js
{
  sessionId:    string,
  technicianId: string,
  equipmentId:  string | null,
  shift:        string,
  transcript:   Message[]   // capped at 30 turns
}
```

---

## Embedding Details

| Property | Value |
|---|---|
| Model | `text-embedding-004` (Google) |
| Dimensions | 768 |
| Distance | Cosine |
| Incident text pattern | `"{symptom}. {finding}. {action}. {status}."` |
| Handoff text pattern | `"{summary}. Unresolved: {items}. Next: {items}."` |

---

## Anti-Patterns Avoided

- ✅ Tools have Zod validation — LLM hallucinations cannot corrupt the database
- ✅ Qdrant always filtered by `equipmentId` before cosine search — UNIT-27 results never bleed into UNIT-14
- ✅ Top-k capped at 3 for LLM context — full collection never dumped to the model
- ✅ `equipmentId` from LLM is normalised to uppercase and validated against a real unit before use
- ✅ Rime responses are capped at 500 chars — judges stay engaged
- ✅ No LangGraph, Redis, or BullMQ — one day, keep it simple

---

## Running the Eval

```bash
# 1. Seed MongoDB first (if not already done)
cd backend && node seed.js

# 2. Seed Qdrant from MongoDB
node seed-qdrant.js

# 3. Run eval
node src/ai/eval/eval.js
```

Expected output: ≥ 8/10 queries pass with correct keyword matches.
Copy the result line into `readme/progress.md`.
