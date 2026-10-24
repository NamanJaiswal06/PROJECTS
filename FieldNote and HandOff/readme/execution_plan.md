# FIELDNOTE — Execution Plan (Your Role: ML Engineer)

> Single source of truth for what *you* build today. The full-stack teammate owns everything marked `[FS]`.

---

## 0. Your Role in One Paragraph
You own the **AI brain and the voice**: speech-to-text ingestion, LLM reasoning with structured outputs and tool calling, embeddings + Qdrant semantic memory, the Rime text-to-speech response, and the real-time voice loop (including interruption/recovery). You do **not** own the React UI, the Express HTTP surface, MongoDB persistence calls (the full-stack teammate writes the data), or deployment. Your job is to make sure that when the UI presses the mic button, the system *thinks with retrieved memory* and *speaks the answer naturally*.

---

## 1. Tech Choices — Lock These First

| Layer | Pick | Why |
|---|---|---|
| STT | **Deepgram** (nova-2) | Streaming, fast, multilingual, code-switch tolerant. Fallback: AssemblyAI. |
| LLM | **Claude Sonnet 4.5** or **GPT-4o-mini** | Both support tool calling + structured outputs. Pick what you have keys for. |
| Embeddings | **text-embedding-3-small** (1536d) | Cheap, fast, good enough for incident similarity. |
| Vector DB | **Qdrant Cloud** (free tier) | Required by track. Use cosine, 1536d. |
| TTS | **Rime Coda** | Required by track. Pick a voice early. |
| Agent loop | **Hand-rolled** in TS (no LangGraph) | One day. Don't introduce frameworks. |
| Realtime | **WebSocket** (audio frames in) + **HTTP** (text reply out) | Simpler than full-duplex on day one. |

Recommended providers — but use whatever you already have keys for. Substitutions are fine, do not block on procurement.

---

## 2. Folder Layout (your work)
```
D:\EDC_hackathon\
├── server\                  ← shared, you contribute /server/src/ai
│   └── src\
│       ├── ai\
│       │   ├── stt.ts            ← Deepgram client + stream-to-text
│       │   ├── tts.ts            ← Rime client, returns mp3/wav bytes
│       │   ├── llm.ts            ← Claude/OpenAI client + system prompt
│       │   ├── embeddings.ts     ← embed(text) → number[]
│       │   ├── qdrant.ts         ← upsertPoints, search, payload schema
│       │   ├── tools\
│       │   │   ├── index.ts      ← tool registry + Zod schemas
│       │   │   ├── equipment.ts  ← getEquipment, getEquipmentHistory
│       │   │   ├── memory.ts     ← findSimilarCases
│       │   │   ├── incidents.ts  ← recordObservation, createIncident
│       │   │   └── handoff.ts    ← createHandoff, getHandoff
│       │   ├── agent.ts          ← the loop: tool calling, context mgmt
│       │   ├── router.ts         ← intent classification
│       │   └── prompts.ts        ← all system/agent prompts
│       └── routes\               ← [FS] HTTP routes, you provide handlers
├── client\                  ← [FS] React UI
└── docs\                    ← you write prompts.md, eval.md
```

---

## 3. End-to-End Voice Pipeline (your ownership)

```
mic (MediaRecorder, webm/opus)
  └─► WebSocket frames ──► server
        └─► STT (Deepgram) ──► transcript
              └─► intent router ──► agent.run(transcript, session)
                    └─► tool calls (Qdrant, Mongo) ──► observations
                          └─► LLM final answer (text)
                                └─► Rime TTS ──► audio bytes
                                      └─► WebSocket/HTTP ──► client plays
```

`session` is a small object: `{ technicianId, equipmentId?, shift, transcript[] }`. Persist nothing yet — let the full-stack teammate write to Mongo on tool calls.

---

## 4. Qdrant — Make It *Visibly* Matter

**Collection:** `fieldnote_memory`
**Vector size:** 1536
**Distance:** Cosine

**Payload schema (each point):**
```ts
{
  type: "incident" | "handoff" | "field_log" | "manual",
  equipmentId: "UNIT-27",
  equipmentType: "compressor",
  location: "Factory-A",
  symptom: string,            // empty for handoffs
  finding: string,
  action: string,
  status: "resolved" | "unresolved" | "monitoring",
  priority: "low" | "medium" | "high",
  technicianId: string,
  timestamp: string,          // ISO
  text: string                // the chunk that was embedded
}
```

For the new workflow, also persist a session-level handoff summary and a granular field-log entry using the examples from the shared context as the contract. The handoff summary should carry `checked`, `found`, `fixed`, `unresolved`, `next_steps`, and `similar_cases`.

**Index these payload fields** for filtered search: `equipmentId`, `equipmentType`, `location`, `status`, `type`.

**What gets embedded:**
- For incidents: `"{symptom}. {finding}. {action}. {status}."`
- For handoffs: the summary + key unresolved issues concatenated.

**Retrieval rule (this is what judges must see):**
1. If `equipmentId` is known (e.g. UNIT-27), filter `equipmentId = UNIT-27 OR equipmentType = compressor`.
2. Top-k=5 by cosine.
3. Re-rank by recency weight if scores tie.
4. Feed the top 3 into the LLM context, **and explicitly say "based on N similar historical cases"** in the response.

This guarantees Qdrant changes the answer — the LLM cannot just guess; it must reference the retrieved text.

---

## 5. The Agent

**One system prompt. One tool list. One loop.** No LangGraph.

```ts
// pseudocode
async function agent(userText, session) {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...session.transcript.map(t => ({ role: t.role, content: t.text })),
    { role: "user", content: userText },
  ];

  // 1. Always first: look up current equipment context if known
  if (session.equipmentId) {
    const cases = await findSimilarCases({ equipmentId: session.equipmentId, query: userText });
    messages.push({ role: "system", content: `Retrieved cases:\n${cases.map(c => c.text).join("\n---\n")}` });
  }

  // 2. LLM decides: respond OR call a tool
  const response = await llm.chat({ messages, tools: TOOL_SCHEMAS, tool_choice: "auto" });

  if (response.tool_calls) {
    for (const call of response.tool_calls) {
      const result = await runTool(call.name, call.arguments, session);
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
    const final = await llm.chat({ messages, tools: TOOL_SCHEMAS });
    return final.text;
  }
  return response.text;
}
```

**System prompt (draft — keep tight):**
> You are FIELDNOTE, a voice assistant for field technicians. You help inspect equipment, record observations, find similar past incidents, and produce shift handoffs. Always ground your answer in retrieved cases when equipment is in context. Be concise — your answer will be spoken aloud. Use short sentences. When the user says "create the handoff," call the `createHandoff` tool with the current session's observations. Never invent equipment IDs.

**Tool list (final):**
1. `getEquipment({ equipmentId })`
2. `getEquipmentHistory({ equipmentId, limit? })`
3. `findSimilarCases({ equipmentId?, query, k? })`
4. `recordObservation({ equipmentId, symptom, finding, action, status, priority, nextAction })` — validates with Zod, writes a granular field-log entry, and calls the full-stack teammate's HTTP `POST /api/incidents`.
5. `createHandoff({ equipmentId, shift, summary, findings, unresolvedIssues, nextActions, technicianId })` — calls `POST /api/handoffs`, writes a structured handoff summary, and indexes the summary into Qdrant.
6. `getHandoff({ equipmentId, shift? })` — calls `GET /api/handoffs/:equipmentId`.

**Intent router** (a small classifier, single LLM call with a constrained schema — keep simple):
- `start_inspection(equipmentId)` → equipment context
- `record_observation` → extract fields, call `recordObservation`
- `create_handoff` → call `createHandoff`
- `query_handoff` → call `getHandoff` then summarize
- `chitchat` → plain LLM reply

---

## 6. Rime — Make It Genuine, Not Decorative

Rime is 20% of the score. Use it on **every spoken reply** in the hero demo, not just the closing line.

- Pick one voice early and stick with it (test 2 voices, pick the clearer one).
- Short replies (< 80 words) — long Rime audio loses judges.
- Stream if Rime supports it; if not, fetch full audio, then play.
- When the user interrupts, **cancel the in-flight audio** on the client (full-stack teammate handles the HTMLAudioElement), then re-plan. You do not need to do anything on the server — the next user turn naturally takes over.

**Sample Rime call (TS):**
```ts
import fetch from "node-fetch";

export async function tts(text: string, voice = "cove"): Promise<Buffer> {
  const r = await fetch("https://users.rime.ai/v1/voices/synthesize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RIME_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ speaker: voice, text, format: "mp3" }),
  });
  if (!r.ok) throw new Error(`Rime ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}
```
> Verify the actual endpoint + payload shape against Rime's current docs before shipping. The exact URL/format here is a placeholder — your teammate should double-check on the first call.

---

## 7. Interruption / Recovery (Stretch, Hour 9–10)

Goal: while Rime audio is playing, the technician says "Stop. Just tell me the next action." The system stops audio and answers concisely.

**You implement (server side):**
- The agent's loop is naturally interruptible because each turn is independent.
- Add a flag `interrupted: boolean` on the WebSocket message envelope. If the client sends an interrupt frame, the server **does not need to cancel** an in-flight Rime fetch — the client will discard the audio. Just process the new turn immediately.
- Concise-answer mode: when the user says "just tell me" / "short answer" / "in one line", the system prompt gets a one-shot suffix: *"Reply in at most one sentence, only the requested fact."*

**Client side** (teammate): pause/cancel `<audio>` on new mic activity. You don't touch the React code.

**If this is flaky by Hour 9:30, cut it.** Document as "interruptible architecture" in the README. The hero demo without interruption still scores well.

---

## 8. Demo Data You Must Provide

You and the full-stack teammate share a single `seed.ts`. Your piece:
- 8–10 historical incidents for UNIT-27 + 2 sibling compressors. Each one needs an embedding → Qdrant point.
- 1–2 example handoffs to demonstrate recovery.

Quick seed approach:
```ts
const seed = [
  { symptom: "compressor vibration on startup", finding: "loose mounting bolts", action: "torqued to spec", status: "resolved", priority: "high", equipmentId: "UNIT-27" },
  // ... 9 more
];
for (const s of seed) {
  const text = `${s.symptom}. ${s.finding}. ${s.action}. ${s.status}.`;
  const vec = await embed(text);
  await qdrant.upsert("fieldnote_memory", [{ id: uuid(), vector: vec, payload: { ...s, text } }]);
}
```

Run this once at Hour 2. Verify by querying: "compressor vibration" → returns the loose-bolts case.

---

## 9. Evaluation (Hour 10–11)

You own the AI evaluation. Run real queries, record real numbers in `progress.md`.

**Test set (10 queries, mix of types):**
1. "What happened with UNIT-27?" — should retrieve last handoff.
2. "Compressor rattling on startup" — should retrieve mounting-bolts case.
3. "Any unresolved issues on UNIT-27?" — should filter status=unresolved.
4. "Same issue last month on UNIT-31?" — should retrieve neighbor unit.
5. "Give me the handoff for the night shift." — should pull night-shift handoff.
6–10. Free-form, mix of observation recording and chitchat.

For each: did the right Qdrant hits come back? Did the LLM use them? Did the structured write succeed?

**Latency test:** measure end-to-end mic→speaker for 3 queries, take p50.

---

## 10. Definition of Done (Your Slice)
- [ ] Sanity: STT echoes back what you say.
- [ ] Sanity: TTS speaks a fixed string.
- [ ] Sanity: Qdrant collection created and 10 incidents indexed.
- [ ] `findSimilarCases("compressor rattling on startup")` returns ≥1 relevant hit.
- [ ] Agent loop calls at least 2 tools in the hero flow.
- [ ] `recordObservation` persists a field-log entry and `createHandoff` persists a handoff summary in Mongo.
- [ ] `createHandoff` indexes the handoff summary in Qdrant.
- [ ] Hero demo runs end-to-end, hands-free, on UNIT-27.
- [ ] Eval table filled with real numbers.
- [ ] `docs/prompts.md` has the final system prompt.
- [ ] README's "AI architecture" section is yours to write.

## 11. Anti-Patterns (Don't Do These)
- One giant prompt instead of tools.
- Returning the entire Qdrant collection to the LLM (cap top-k).
- Trusting the LLM's `equipmentId` without validating against the seed list.
- Skipping Zod on structured writes — hallucinations will corrupt your handoffs.
- Long Rime responses (> 80 words). Judges will tune out.
- Adding LangGraph / Redis / BullMQ to look senior. Don't.
- "We'll evaluate later." Evaluate or don't claim it.
