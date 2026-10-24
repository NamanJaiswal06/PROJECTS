# AgentShield Server

**Runtime Security and Authorization Layer for AI Agents**

AgentShield sits between an AI agent and the tools it wants to use, evaluating every action against context, policies, risk analysis, and ML signals before allowing execution.

---

## Architecture

```
AI Agent
   ↓
AgentShield
   ↓
Context + Policy + Risk Analysis
   ↓
ALLOW / BLOCK / HUMAN APPROVAL
   ↓
Tool / API / Database
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| Validation | Zod |
| Real-time | Socket.IO |
| Logging | Winston |
| Testing | Jest + Supertest |

---

## Quick Start

### 1. Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

### 2. Install dependencies

```bash
cd server
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

```env
MONGODB_URI=mongodb://localhost:27017/agentshield
JWT_SECRET=<generate a long random string — see below>
```

**Generate a secure JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Start the server

**Development** (with auto-restart on file changes):
```bash
npm run dev
```

**Production:**
```bash
npm start
```

### 5. Verify

```bash
curl http://localhost:5000/api/v1/health
```

Expected response:
```json
{
  "success": true,
  "message": "AgentShield API is healthy",
  "data": {
    "status": "UP",
    "environment": "development",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "version": "1.0.0"
  }
}
```

---

## API Reference

### Health

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/health` | Liveness check | None |
| GET | `/api/v1/health/ready` | Readiness check (DB connected?) | None |

### Authentication *(Phase 2)*
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Register a new user |
| POST | `/api/v1/auth/login` | Login and receive JWT |
| GET | `/api/v1/auth/me` | Get current user |

### Agents *(Phase 3)*
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/agents` | Register a new agent |
| GET | `/api/v1/agents` | List all agents |
| GET | `/api/v1/agents/:id` | Get agent details |
| PATCH | `/api/v1/agents/:id` | Update agent |
| DELETE | `/api/v1/agents/:id` | Decommission agent |

### Actions *(Phase 5)*
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/actions/evaluate` | Evaluate an action through the security pipeline |
| POST | `/api/v1/actions/execute` | Execute an already-authorized action |
| GET | `/api/v1/actions` | List evaluated actions |

*(See future phases for Policies, Approvals, Events, Dashboard, Simulator)*

---

## Project Structure

```
server/
├── src/
│   ├── config/
│   │   ├── db.js           — MongoDB connection
│   │   ├── env.js          — Validated env config
│   │   └── socket.js       — Socket.IO initialization
│   ├── controllers/
│   │   └── health.controller.js
│   ├── middleware/
│   │   ├── auth.middleware.js      — JWT auth (Phase 2)
│   │   ├── error.middleware.js     — Global error handler
│   │   ├── notFound.middleware.js  — 404 handler
│   │   ├── rateLimit.middleware.js — Rate limiting
│   │   └── validation.middleware.js— Zod validation
│   ├── routes/
│   │   ├── health.routes.js
│   │   └── ... (other routes — see phases)
│   ├── utils/
│   │   ├── AppError.js     — Custom error class
│   │   ├── asyncHandler.js — Async error wrapper
│   │   ├── constants.js    — All enum values
│   │   └── logger.js       — Winston logger
│   ├── simulator/          — Agent simulator (Phase 11)
│   ├── app.js              — Express app factory
│   └── server.js           — Entry point
├── __tests__/
│   └── health/health.test.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## Running Tests

```bash
npm test
```

With coverage:
```bash
npm run test:coverage
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Runtime environment |
| `PORT` | No | `5000` | HTTP port |
| `MONGODB_URI` | **Yes** | — | MongoDB connection string |
| `JWT_SECRET` | **Yes** | — | JWT signing secret (min 64 chars in prod) |
| `JWT_EXPIRES_IN` | No | `7d` | JWT expiry duration |
| `CORS_ORIGINS` | No | `http://localhost:3000` | Comma-separated allowed origins |
| `RATE_LIMIT_MAX` | No | `100` | Max requests per 15min window |
| `AUTH_RATE_LIMIT_MAX` | No | `10` | Max login attempts per 15min |
| `ACTION_RATE_LIMIT_MAX` | No | `50` | Max action evaluations per 15min |
| `ML_SERVICE_MODE` | No | `MOCK` | `MOCK` or `HTTP` |
| `ML_SERVICE_URL` | No | `http://localhost:8000` | ML service URL (HTTP mode) |
| `RISK_APPROVAL_THRESHOLD` | No | `60` | Risk score to trigger approval |
| `RISK_BLOCK_THRESHOLD` | No | `80` | Risk score to auto-block |
| `APPROVAL_EXPIRY_HOURS` | No | `24` | Hours before pending approval expires |
| `LOG_LEVEL` | No | `debug` | `error`, `warn`, `info`, `http`, `debug` |

---

## Development Phases

| Phase | Status | Feature |
|-------|--------|---------|
| 1 | ✅ Done | Foundation — Express, MongoDB, error handling, health check |
| 2 | ⬜ Next | Authentication — JWT, bcrypt, RBAC |
| 3 | ⬜ | Agent + Tool management |
| 4 | ⬜ | Policy engine |
| 5 | ⬜ | Action gateway + context builder |
| 6 | ⬜ | Risk engine |
| 7 | ⬜ | Decision engine |
| 8 | ⬜ | Approval workflow |
| 9 | ⬜ | Audit logs + security events |
| 10 | ⬜ | ML service integration |
| 11 | ⬜ | Agent simulator |
| 12 | ⬜ | Socket.IO real-time events |
| 13 | ⬜ | Dashboard APIs |
| 14 | ⬜ | Testing + hardening |

---

## Security Notes

- Never commit `.env` to source control
- JWT_SECRET must be at least 64 chars in production
- Rate limiting is in-memory (per process) — plan Redis upgrade when scaling
- All errors are sanitized before being sent to clients
- Stack traces are never exposed in production responses
