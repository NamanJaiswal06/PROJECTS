# FIELDNOTE — Context

## Hackathon
- **Event:** StarForge 2026 — VoxForge track
- **Deadline:** One day (today, 2026-08-09)
- **Judging weights:** Problem/usefulness 30% | Voice 25% | Rime 20% | Tech execution 15% | Demo 10%

## Product
- **Name:** FIELDNOTE
- **Tagline:** "The operational memory for people who work in the physical world."
- **One-sentence claim:** FIELDNOTE turns spoken field observations into persistent operational memory, so the next technician can recover what happened, why it happened, and what needs to happen next.
- **Persona:** Field maintenance technician (e.g. compressor servicing on a factory floor)
- **Hero unit:** UNIT-27 (compressor)

## Problem
Operational knowledge is scattered across paper reports, prior service records, verbal handoffs, WhatsApp, manuals, and individual memory. The next technician re-discovers the same context every shift.

## Solution
Voice-first, equipment-centric memory:
1. Technician inspects equipment by voice.
2. STT → LLM extracts structured observations (symptom, finding, action, status, next action).
3. Qdrant retrieves similar historical incidents for the same/like equipment.
4. LLM reasons with retrieved context.
5. Rime speaks the answer.
6. On "create the handoff," a persistent field-log entry and a handoff summary are written to MongoDB and indexed in Qdrant.
7. The next technician asks "What happened with UNIT-27?" and the system recovers prior-shift context.

## Required data shape
The minimum structured outputs for one inspection session should support both a granular field log and an end-of-session handoff summary.

### Single field-log entry
```json
{
  "id": "log_001",
  "unit_id": "UNIT-27",
  "technician": "Raj",
  "timestamp": "2026-08-09T09:15:00Z",
  "type": "observation",
  "text": "Grinding noise near belt housing, checked tension, still present.",
  "raw_transcript": "..."
}
```

### Handoff summary
```json
{
  "unit_id": "UNIT-27",
  "session_id": "sess_001",
  "generated_at": "2026-08-09T09:45:00Z",
  "summary": "Grinding noise persists after belt adjustment; bearing and motor mount alignment remain to be checked.",
  "checked": ["belt tension", "oil level"],
  "found": ["grinding noise persists after belt adjustment"],
  "fixed": [],
  "unresolved": ["grinding noise - cause unknown"],
  "next_steps": ["inspect bearing", "check motor mount alignment"],
  "similar_cases": ["log_014", "log_009"]
}
```

These records become the memory substrate for future retrieval and recovery workflows.

## Core Loop
`INSPECT → RECORD → RETRIEVE → ACT → HANDOFF → RECOVER → CONTINUE`

## Required Tech (per VoxForge track)
- **Rime** — drives the actual TTS voice experience. Not optional, not decorative.
- **Qdrant** — semantic memory layer; its results must visibly change the answer.
- **LLM** — reasoning + structured outputs + tool calling.
- **MongoDB** — equipment, incidents, handoffs, users.

## Hero Demo Flow (judge-facing)
1. "Start inspection for Unit 27." → retrieve equipment history.
2. "I'm hearing rattling during startup." → Qdrant pulls 2 similar cases (mounting hardware).
3. AI (via Rime): "Two previous cases involved compressor mounting hardware."
4. "The mounting bolts are loose." → record observation (symptom, finding, status=unresolved, next_action=follow-up).
5. "Create the handoff." → write handoff to MongoDB, index in Qdrant.
6. Switch session/technician. "What happened with Unit 27?" → answer with prior shift context.
7. (Stretch) Interrupt mid-speech: "Stop. Just tell me the next action." → AI halts, gives concise reply.

## Out of Scope (do NOT build)
- Generic JARVIS / WhatsApp assistant / chatbot
- Hospital, construction, ERP, IoT features
- Many half-finished features
- New frameworks (LangGraph, Redis, BullMQ) unless they unblock something

## Roles
- **You (ML engineer):** STT, LLM, embeddings, Qdrant, agent logic, tool calling, Rime, retrieval quality, voice latency, interruption/recovery, AI evaluation.
- **Teammate (full-stack):** React + TS frontend, Express + TS backend, MongoDB schemas, dashboard/inspection/handoff screens, API integration, deployment, demo data, polish.

## Non-Negotiables
- Real problem, not flashy AI.
- One excellent workflow, not 20 features.
- Voice must be essential.
- Qdrant must change the answer.
- Rime must drive the actual voice interaction.
- Memory must persist across sessions.
- Never fabricate evaluation numbers.
- Stop adding features once the core pipeline works.
