# AgentShield — Build Progress

> **Last updated:** Phase 5 complete
> **Next phase:** Phase 6 — Approval Workflow
> **Tests:** 158 passing / 158 total (7 suites)

---

## Architecture (built so far)

```
AI Agent
   |
   +-> POST /api/v1/actions/evaluate
              |
              +-- 1. Hard Checks  (agent ACTIVE? has tool? tool ACTIVE? action whitelisted?)
              +-- 2. Policy Engine (configurable rules -> ALLOW / BLOCK / REQUIRE_APPROVAL)
              +-- 3. Risk Scorer  (0-100, tool risk level + context penalties)
              +-- 4. Final Decision  (BLOCK > REQUIRE_APPROVAL > ALLOW)
              +-- 5. Action Record  (immutable audit trail, fire-and-forget write)
```

---

## Completed Phases

### Phase 1 — Infrastructure Foundation
**Tests:** 9 passing

- Express app factory (app.js + server.js split — tests import without binding a port)
- MongoDB + Mongoose (config/db.js)
- Winston structured logging (utils/logger.js)
- Helmet security headers, CORS, 10kb body limit
- Rate limiting middleware
- Centralized error handling: AppError, error.middleware.js, asyncHandler.js
- Zod validation middleware (validation.middleware.js)
- Route stubs for all planned endpoints
- GET /api/v1/health and GET /api/v1/health/ready

Key files:
  server/src/app.js
  server/src/utils/constants.js     <- all enums live here
  server/src/utils/AppError.js
  server/src/middleware/error.middleware.js
  server/__tests__/helpers/testDb.js

---

### Phase 2 — Authentication
**Tests:** 24 new -> 33 total

- User model (passwordHash is select:false, bcrypt cost 12)
- JWT access tokens (configurable expiry via JWT_EXPIRES_IN)
- authenticate middleware — re-fetches user from DB every request (real-time revocation)
- authorize(roles) RBAC middleware
- POST /api/v1/auth/register — role forced to VIEWER, email lowercased
- POST /api/v1/auth/login — detects suspended accounts
- GET /api/v1/auth/me

Key files:
  server/src/models/User.js
  server/src/services/auth/auth.service.js
  server/src/middleware/auth.middleware.js
  server/__tests__/auth/auth.test.js

Security rules baked in:
  - Client cannot set role on registration (always VIEWER)
  - Suspended accounts blocked at both login and token validation

---

### Phase 3 — Agent & Tool Management
**Tests:** 43 new -> 76 total

- Agent model: permissions whitelist, riskProfile sub-doc
  Instance methods: hasPermission(), hasTool(), isOperational()
- Tool model: allowedActions whitelist, isActionAllowed(), isActive kill-switch
- Zod validators for Agent and Tool CRUD
- CRUD services with full RBAC (ADMIN write, VIEWER read)
- Agent soft-disable: DISABLED is permanent, no reactivation
- Tool soft-deactivate: isActive:false preserves FK integrity in Action records
- validateToolIds() in agent service (reused in Phase 5)
- createUserWithRole() test helper in __tests__/helpers/authHelpers.js

Key files:
  server/src/models/Agent.js
  server/src/models/Tool.js
  server/src/services/agents/agent.service.js
  server/src/services/tools/tool.service.js
  server/__tests__/agents/agents.test.js
  server/__tests__/tools/tools.test.js
  server/__tests__/helpers/authHelpers.js

Zod v3 caveat (applies to ALL validators):
  z.enum() cannot use required_error AND errorMap together.
  Fix: use errorMap only, check issue.code === 'invalid_type' && ctx.data === undefined

---

### Phase 4 — Policy Engine
**Tests:** 57 new -> 133 total

- Policy model: condition array, scope arrays (appliesToAgents/Tools/ActionTypes), enabled, priority
- 12 condition operators: eq ne gt gte lt lte in nin contains notContains startsWith exists
- policyEngine.service.js — core evaluation engine:
    Dot-notation field extractor: action.parameters.count, resource.sensitivity, tool.riskLevel
    Scope check first (per-agent / per-tool / per-action-type / global)
    ALL conditions = AND logic (for OR: create two separate policies)
    Strictest effect wins: BLOCK > REQUIRE_APPROVAL > ALLOW
    One DB query loads all enabled policies sorted by priority desc
- Policy CRUD: ADMIN write, ADMIN+ANALYST read
- PATCH /api/v1/policies/:id/toggle — enable/disable convenience endpoint
- Hard-delete is safe for policies (no FK references from Action records)

Key files:
  server/src/models/Policy.js
  server/src/validators/policy.validator.js
  server/src/services/policies/policyEngine.service.js   <- CORE ENGINE
  server/src/services/policies/policy.service.js
  server/__tests__/policies/policyEngine.test.js         <- 41 tests
  server/__tests__/policies/policies.test.js             <- 16 tests

Example conditions:
  { field: 'action.parameters.count',  operator: 'gte', value: 100 }
  { field: 'resource.destination',     operator: 'eq',  value: 'external' }
  { field: 'tool.riskLevel',           operator: 'in',  value: ['HIGH','CRITICAL'] }
  { field: 'resource.reversible',      operator: 'eq',  value: false }

---

### Phase 5 — Action Evaluation Gateway
**Tests:** 25 new -> 158 total

- Action model — immutable audit record (timestamps:false — no updatedAt)
- action.validator.js — riskScore, decision, requestedBy NEVER accepted from client
- riskScorer.js — deterministic formula:
    Tool riskLevel base: LOW=10, MEDIUM=25, HIGH=55, CRITICAL=85
    + recordCount > 1,000:   +15
    + recordCount > 10,000:  +25 (replaces +15)
    + External destination:  +10
    + Irreversible action:   +15
    + HIGH sensitivity:      +10
    + CRITICAL sensitivity:  +20
    + Sensitive action type: +10
    Cap: 100
- action.service.js — full pipeline:
    1. Load agent -> must exist + ACTIVE
    2. Agent must have tool in toolIds
    3. Load tool -> must exist + isActive
    4. actionType must be in tool.allowedActions
    5. Build SecurityContext + run policy engine
    6. Compute risk score
    7. Final decision
    8. Write Action record (fire-and-forget)
- Hard blocks always return riskScore:100 (unknown = max risk)
- POST /api/v1/actions/evaluate always returns HTTP 200
  (BLOCK is a valid security decision — read response.data.decision, not HTTP status)
- GET /api/v1/actions     — paginated audit log (ADMIN + ANALYST)
- GET /api/v1/actions/:id — full detail with populated references

Key files:
  server/src/models/Action.js
  server/src/validators/action.validator.js
  server/src/services/actions/riskScorer.js
  server/src/services/actions/action.service.js   <- EVALUATION PIPELINE
  server/src/controllers/action.controller.js
  server/src/routes/action.routes.js
  server/__tests__/actions/action.test.js

---

## >>> START HERE: Phase 6 — Approval Workflow

Goal: Human-in-the-loop approval queue for REQUIRE_APPROVAL decisions.

Endpoints to build:
  GET  /api/v1/approvals              ADMIN+ANALYST  List pending approvals
  GET  /api/v1/approvals/:id          ADMIN+ANALYST  Single approval detail
  POST /api/v1/approvals/:id/approve  ADMIN+ANALYST  Approve (optional note)
  POST /api/v1/approvals/:id/reject   ADMIN+ANALYST  Reject (required note)

Additional:
  - Expiry: pending > N minutes auto-set to EXPIRED (setInterval / node-cron)
  - Socket.IO: emit 'approval:new' when REQUIRE_APPROVAL action is created
  - Socket.IO: emit 'approval:decided' when approved or rejected

Infrastructure already in place (NO model changes needed):
  Action.approvalStatus     -> PENDING | APPROVED | REJECTED | EXPIRED
  Action.approvedBy         -> User ref
  Action.approvedAt         -> Date
  Action.approvalNote       -> String
  constants.js APPROVAL_STATUS
  approval.routes.js        -> stub already mounted at /api/v1/approvals in app.js
  config/socket.js          -> Socket.IO already configured

New files to create:
  server/src/services/approvals/approval.service.js
  server/src/controllers/approval.controller.js
  server/src/routes/approval.routes.js    (replace stub)
  server/__tests__/approvals/approval.test.js

---

## Remaining Phases

  Phase 6  Approval Workflow (human-in-the-loop + Socket.IO)  <- START HERE
  Phase 7  Security Event Bus (structured security events, streaming)
  Phase 8  Dashboard & Analytics API
  Phase 9  Simulator (test policies against synthetic SecurityContexts)
  Phase 10 ML Integration (anomaly detection, prompt injection detection)
  Phase 11 Per-agent rate limiting + circuit breaker
  Phase 12 Seed data (example policies, demo agents/tools)
  Phase 13 Production hardening (env validation, graceful shutdown)
  Phase 14 Frontend (React dashboard)

---

## Project Structure (current state)

  server/src/
    config/
      db.js              done
      env.js             done
      socket.js          done
    controllers/
      action.controller.js    done (Ph5)
      agent.controller.js     done (Ph3)
      auth.controller.js      done (Ph2)
      health.controller.js    done (Ph1)
      policy.controller.js    done (Ph4)
      tool.controller.js      done (Ph3)
    middleware/
      auth.middleware.js      done
      error.middleware.js     done
      notFound.middleware.js  done
      rateLimit.middleware.js done
      validation.middleware.js done
    models/
      Action.js     done (Ph5) — immutable audit record
      Agent.js      done (Ph3)
      Policy.js     done (Ph4)
      Tool.js       done (Ph3)
      User.js       done (Ph2)
    routes/
      action.routes.js        done (Ph5)
      agent.routes.js         done (Ph3)
      approval.routes.js      STUB <- Phase 6 replaces this
      auth.routes.js          done (Ph2)
      dashboard.routes.js     stub (Ph8)
      event.routes.js         stub (Ph7)
      health.routes.js        done (Ph1)
      policy.routes.js        done (Ph4)
      tool.routes.js          done (Ph3)
    services/
      actions/
        action.service.js       done (Ph5)
        riskScorer.js           done (Ph5)
      agents/
        agent.service.js        done (Ph3)
      auth/
        auth.service.js         done (Ph2)
      policies/
        policy.service.js           done (Ph4)
        policyEngine.service.js     done (Ph4) CORE ENGINE
      tools/
        tool.service.js         done (Ph3)
    simulator/                  stub (Ph9)
    utils/
      AppError.js     done
      asyncHandler.js done
      constants.js    done  <- ALL ENUMS HERE
      logger.js       done
    validators/
      action.validator.js    done (Ph5)
      agent.validator.js     done (Ph3)
      auth.validator.js      done (Ph2)
      policy.validator.js    done (Ph4)
      tool.validator.js      done (Ph3)
    app.js             done

  server/__tests__/
    actions/action.test.js          25 tests (Ph5)
    agents/agents.test.js           25 tests (Ph3)
    auth/auth.test.js               24 tests (Ph2)
    health/health.test.js            9 tests (Ph1)
    helpers/
      authHelpers.js    createUserWithRole() — used by all test suites
      testDb.js         connect / clearDatabase / disconnect
    policies/
      policies.test.js        16 tests (Ph4)
      policyEngine.test.js    41 tests (Ph4)
    tools/tools.test.js             18 tests (Ph3)

---

## Quick Commands

  cd server
  npm test                                               # run all 158 tests
  npx jest __tests__/actions/action.test.js --runInBand # single suite
  npm run dev                                            # start dev server

---

## Security Principles — Never Break These

  1. Default Deny — when in doubt, BLOCK
  2. Hard checks before policies — suspended agent blocked before policy engine runs
  3. Never trust client security fields — riskScore, decision, owner, role always server-side
  4. Audit trail is immutable — Action records written once, never updated
  5. Authenticate re-fetches user from DB — JWT alone is not sufficient
  6. Soft-delete agents and tools — preserves FK integrity in historical Action records
  7. Effect precedence — BLOCK > REQUIRE_APPROVAL > ALLOW (strictest always wins)