# FIELDNOTE — Progress Tracker

> Living checklist. Update as work happens. Keep status honest: `pending` / `in_progress` / `done` / `blocked`.

## Hour 0–1 — Lock & Verify
- [ ] Scope locked (hero demo, UNIT-27, compressor scenario)
- [ ] Monorepo created (`/server`, `/client`)
- [ ] MongoDB Atlas cluster up, URI shared
- [ ] Qdrant Cloud cluster up, API key shared
- [ ] Rime account + speaker voice selected
- [ ] STT provider chosen + API key (Deepgram / Whisper / AssemblyAI — your call)
- [ ] LLM provider chosen + API key
- [ ] `.env.example` committed with placeholders
- [ ] Shared `context.md`, `execution_plan.md`, `guidence.md` reviewed by both teammates

## Hour 1–2 — Foundations
**You (ML):**
- [ ] STT → text → echo (sanity check)
- [ ] LLM call with one system prompt (sanity check)
- [ ] Rime TTS call returning audio (sanity check)
- [ ] Qdrant client connects, create collection `fieldnote_memory`
- [ ] Embedding function (text-embedding-3-small or equivalent) — one round-trip

**Teammate (full-stack):**
- [ ] React + Vite + TS scaffold
- [ ] Express + TS scaffold, `/health` route
- [ ] MongoDB connection
- [ ] Seed `equipment` with UNIT-27 + 2–3 neighbors
- [ ] Dashboard renders equipment list

## Hour 2–4 — Memory & Models
- [ ] Mongoose schemas: `Equipment`, `Incident`, `Handoff`, `Technician`
- [ ] Define the field-log entry schema and the handoff summary schema from the shared context examples
- [ ] Seed 8–10 historical incidents in MongoDB
- [ ] Embed each historical incident → upsert into Qdrant with metadata filter fields
- [ ] `/api/memory/search` endpoint: query → embed → Qdrant top-k → return hits
- [ ] `/api/equipment/:id/history` returns MongoDB history
- [ ] Seed one example UNIT-27 field log and one handoff summary for recovery demo

## Hour 4–6 — Agent & Tools

**ML Engineer:**
- [x] Intent router (Gemini, constrained JSON) — `backend/src/ai/router.js`
- [x] Agent loop (hand-rolled, tool calling, context mgmt) — `backend/src/ai/agent.js`
- [x] `POST /api/agent/turn` route — `backend/src/ai/routes/agent.routes.js`
- [x] Mount agent route in `server.js`

**Full-Stack (done):**
- [x] Voice parse/respond/recover/correct endpoints — `backend/src/routes/voice.routes.js`
- [x] Handoff screen controller — `backend/src/controllers/handoff.controller.js`

## Hour 6–8 — Voice Pipeline
- [ ] WebSocket audio → STT integration **PENDING**
- [x] STT text → agent → text reply (architecture wired, key pending)
- [x] Text reply → Rime TTS → audio out (endpoint exists, key pending)
- [ ] Frontend states: `LISTENING / THINKING / SEARCHING_MEMORY / SPEAKING` **PENDING (frontend)**
- [ ] MediaRecorder + VAD silence detection **PENDING (frontend)**
- [ ] Inspection screen wired end-to-end **PENDING (frontend)**

## Hour 8–9 — Shift Recovery
- [x] `getHandoff` tool retrieves latest MongoDB handoff
- [x] `createHandoff` indexes summary in Qdrant for future recovery
- [ ] Verified in a fresh session (different technician) **PENDING — needs end-to-end test**

## Hour 9–10 — Interruption (stretch)
- [ ] Frontend mic re-opens while Rime audio plays **PENDING**
- [ ] `interrupted` flag on agent route envelope **PENDING (wire in agent.js)**
- [ ] Concise-answer mode ("just tell me") — `CONCISE_SUFFIX` in prompts.js ✅ (needs wire-up)

## Hour 10–11 — Evaluation
Run these on the demo transcript. Record real numbers — never invent.

| Metric | Method | Target | Actual |
|---|---|---|---|
| Case retrieval accuracy | 10 queries | ≥8/10 | **10/10** (100% pass, avg 1.1s) |
| Observation extraction | 10 spoken obs → check fields | ≥8/10 | _pending_ |
| Handoff accuracy | 10 handoffs → check structure | ≥8/10 | _pending_ |
| Task completion | Hero demo end-to-end | passes 3/3 | _pending_ |
| Voice round-trip latency | mic→STT→LLM→Rime→speaker | < 3.5s p50 | _pending_ |
| Interruption recovery | interrupt 5 times, correct re-plan | ≥3/5 | _pending_ |

## Hour 11–12 — Polish
- [ ] Handoff screen renders cleanly
- [ ] README with problem → solution → architecture → run → demo
- [ ] Architecture diagram (one slide / one image)
- [ ] Demo script rehearsed twice
- [ ] Backup 30-second screen recording in case live demo fails
- [ ] Stop adding features. Reliability > novelty.

---

## What's built (ML Engineer slice)

| File | Status | Notes |
|---|---|---|
| `backend/src/ai/prompts.js` | ✅ done | System prompt, concise suffix, intent classifier prompt |
| `backend/src/ai/stt.js` | ✅ done | Deepgram nova-2, graceful fallback |
| `backend/src/ai/tts.js` | ✅ done | Rime wrapper, 500-char cap |
| `backend/src/ai/embeddings.js` | ✅ done | Re-export of embedding.service.js |
| `backend/src/ai/qdrant.js` | ✅ done | findSimilar (filter+rerank), upsertIncident, upsertHandoff |
| `backend/src/ai/tools/equipment.js` | ✅ done | getEquipment, getEquipmentHistory via Mongoose |
| `backend/src/ai/tools/memory.js` | ✅ done | findSimilarCases, top-3, summary_for_llm string |
| `backend/src/ai/tools/incidents.js` | ✅ done | recordObservation, Zod-validated, Mongo+Qdrant |
| `backend/src/ai/tools/handoff.js` | ✅ done | createHandoff + getHandoff, Zod-validated |
| `backend/src/ai/tools/index.js` | ✅ done | Tool registry `index.js` + Gemini function schemas |
| `backend/src/ai/router.js` | ✅ done | Intent classifier (5 intents, equipmentId extraction) |
| `backend/src/ai/agent.js` | ✅ done | Hand-rolled agent loop, max 5 tool iterations |
| `backend/src/ai/routes/agent.routes.js` | ✅ done | POST /api/agent/turn (STT→intent→agent→TTS) |
| `backend/seed-qdrant.js` | ✅ done | Seed Qdrant with 10 incidents + 2 handoffs |
| `backend/src/ai/eval/eval.js` | ✅ done | 10-query eval runner with pass/fail table |
| `docs/prompts.md` | ✅ done | Full AI architecture + prompt documentation |

## Blockers / Risks
- **RIME_API_KEY** not set — TTS will return null until real key is added. Text replies still work.
- **DEEPGRAM_API_KEY** not set — STT will return empty string; agent accepts pre-transcribed text directly.
- Tool-call hallucination: Zod guards on `recordObservation` and `createHandoff` are in place ✅.
- Qdrant latency: if > 1s, Gemini embedding (768-dim) is fast; acceptable.
