# Campus Connect — Backend

> One-classroom campus platform: Notices, Events, Placement Opportunities, Applications, Complaints, AI Notice Rewriting.

---

## Quick Start

### 1. Prerequisites
- Node.js ≥ 18
- MongoDB Atlas cluster (or local MongoDB)

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
```
Edit `.env` and fill in every variable (see [Environment Variables](#environment-variables)).

### 4. Seed demo accounts
```bash
npm run seed
```
This creates:
| Role    | Email                          |
|---------|--------------------------------|
| Teacher | teacher@campusconnect.dev      |
| Student | student1@campusconnect.dev     |
| Student | student2@campusconnect.dev     |

Passwords come from `DEMO_TEACHER_PASSWORD` / `DEMO_STUDENT_PASSWORD` in `.env`.  
Safe to run multiple times — uses upsert, no duplicates.

### 5. Start the server
```bash
npm run dev    # development (nodemon)
npm start      # production
```

Server starts on `http://localhost:5000` by default.

---

## Environment Variables

| Variable              | Description                                  | Example                          |
|-----------------------|----------------------------------------------|----------------------------------|
| `PORT`                | HTTP port                                    | `5000`                           |
| `MONGODB_URI`         | MongoDB Atlas connection string              | `mongodb+srv://...`              |
| `JWT_SECRET`          | Long random secret for JWT signing           | *(generate with openssl rand)*   |
| `JWT_EXPIRES_IN`      | JWT expiry duration                          | `1d`                             |
| `GEMINI_API_KEY`      | Google Gemini API key                        | *(from Google AI Studio)*        |
| `GEMINI_MODEL`        | Gemini model name                            | `gemini-2.5-flash`               |
| `CLIENT_ORIGIN`       | Frontend origin for CORS                     | `http://localhost:5173`          |
| `DEMO_TEACHER_PASSWORD` | Password for demo teacher account          | *(set a strong value)*           |
| `DEMO_STUDENT_PASSWORD` | Password for demo student accounts         | *(set a strong value)*           |

---

## API Reference

Base URL: `http://localhost:5000/api`

### Authentication

| Method | Path            | Auth       | Description                    |
|--------|-----------------|------------|--------------------------------|
| POST   | `/auth/login`   | Public     | Login, returns JWT + user      |
| GET    | `/auth/me`      | Any        | Get current user profile       |

### Notices

| Method | Path                     | Auth    | Description                   |
|--------|--------------------------|---------|-------------------------------|
| GET    | `/notices`               | Any     | List published notices        |
| POST   | `/notices`               | Teacher | Create a notice (draft/pub)   |
| PATCH  | `/notices/:id/publish`   | Teacher | Publish a draft notice        |

### Events

| Method | Path       | Auth    | Description                          |
|--------|------------|---------|--------------------------------------|
| GET    | `/events`  | Any     | List events (sorted by date ASC)     |
| POST   | `/events`  | Teacher | Create an event                      |

### AI

| Method | Path                   | Auth    | Description                      |
|--------|------------------------|---------|----------------------------------|
| POST   | `/ai/rewrite-notice`   | Teacher | Rewrite raw text → draft notice  |

### Opportunities

| Method | Path              | Auth    | Description                              |
|--------|-------------------|---------|------------------------------------------|
| GET    | `/opportunities`  | Any     | List opportunities (sorted by deadline)  |
| POST   | `/opportunities`  | Teacher | Create a placement opportunity           |

### Applications

| Method | Path                       | Auth    | Description                              |
|--------|----------------------------|---------|------------------------------------------|
| POST   | `/applications`            | Student | Apply to an opportunity                  |
| GET    | `/applications/mine`       | Student | List my applications                     |
| PATCH  | `/applications/:id/status` | Teacher | Update application status                |

### Complaints

| Method | Path                      | Auth    | Description                    |
|--------|---------------------------|---------|--------------------------------|
| POST   | `/complaints`             | Student | Submit a complaint             |
| GET    | `/complaints/mine`        | Student | List my complaints             |
| GET    | `/complaints`             | Teacher | List all classroom complaints  |
| PATCH  | `/complaints/:id/status`  | Teacher | Update complaint status        |

### Health

| Method | Path         | Auth   | Description   |
|--------|--------------|--------|---------------|
| GET    | `/health`    | Public | Health check  |

---

## Shared Interface (for Developer 2)

### `middleware/auth.js`
```js
const authenticateToken = require("../middleware/auth");
// Usage:
router.get("/", authenticateToken, handler);
```
- Sets `req.user` to the full Mongoose User document (without `passwordHash`)
- Returns `401` if token is missing, invalid, or expired

### `middleware/requireRole.js`
```js
const requireRole = require("../middleware/requireRole");
// Usage:
router.post("/", authenticateToken, requireRole("teacher"), handler);
```
- Middleware factory — must be called with a role string
- Returns `403` if role doesn't match

### `utils/apiResponse.js`
```js
const { success, failure } = require("../utils/apiResponse");

// Success:
return success(res, 201, "Resource created", data);

// Error:
return failure(res, 400, "Validation failed");
```

---

## Working curl Examples

> Replace `TOKEN` with the JWT from the login response.

### Login (teacher)
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@campusconnect.dev","password":"YOUR_TEACHER_PASSWORD"}'
```

### Get my profile
```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer TOKEN"
```

### Create a notice (teacher)
```bash
curl -X POST http://localhost:5000/api/notices \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Exam Schedule","content":"Mid-semester exams begin next Monday.","status":"draft"}'
```

### Publish a notice (teacher)
```bash
curl -X PATCH http://localhost:5000/api/notices/NOTICE_ID/publish \
  -H "Authorization: Bearer TOKEN"
```

### Create an event (teacher)
```bash
curl -X POST http://localhost:5000/api/events \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Tech Fest 2026","description":"Annual technical festival.","eventDate":"2026-11-15T09:00:00.000Z","location":"Main Auditorium","registrationLink":"https://forms.example.com/techfest"}'
```

### AI rewrite notice (teacher)
```bash
curl -X POST http://localhost:5000/api/ai/rewrite-notice \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rawText":"students should submit project reports by end of month. late submissions wont be accepted"}'
```

### Create an opportunity (teacher)
```bash
curl -X POST http://localhost:5000/api/opportunities \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"company":"Acme Corp","role":"Software Engineer Intern","description":"6-month internship.","eligibility":"Final year students with 7+ CGPA","packageOrStipend":"25000/month","deadline":"2026-11-01T00:00:00.000Z","applicationLink":"https://acme.example.com/apply"}'
```

### Apply to opportunity (student)
> Login as student first to get a student TOKEN.
```bash
curl -X POST http://localhost:5000/api/applications \
  -H "Authorization: Bearer STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"opportunityId":"OPPORTUNITY_ID","status":"applied"}'
```

### Submit a complaint (student)
```bash
curl -X POST http://localhost:5000/api/complaints \
  -H "Authorization: Bearer STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Library AC not working","description":"The AC in the library reading room has been broken for 3 days.","category":"facilities"}'
```

### Update complaint status (teacher)
```bash
curl -X PATCH http://localhost:5000/api/complaints/COMPLAINT_ID/status \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"in_progress","teacherResponse":"We have raised a maintenance ticket."}'
```

---

## Response Format

Every endpoint returns this shape:

**Success**
```json
{ "success": true, "message": "...", "data": {} }
```

**Error**
```json
{ "success": false, "message": "..." }
```

---

## HTTP Status Codes

| Code | Meaning                          |
|------|----------------------------------|
| 200  | Successful read or update        |
| 201  | Resource created                 |
| 400  | Validation / bad input           |
| 401  | Missing or invalid token         |
| 403  | Insufficient role                |
| 404  | Resource not found               |
| 409  | Duplicate (e.g. application)     |
| 500  | Unexpected server error          |
| 502  | AI provider failure              |
| 503  | AI not configured                |

---

## Project Structure

```
src/
├── app.js              # Express app (exported for testing)
├── server.js           # HTTP server entry point
├── config/db.js        # MongoDB connection
├── middleware/
│   ├── auth.js         # authenticateToken
│   ├── requireRole.js  # requireRole("teacher"|"student")
│   ├── errorHandler.js # Centralized error handler
│   └── notFound.js     # 404 handler
├── utils/apiResponse.js  # success() / failure()
├── models/             # Mongoose models
├── routes/             # Express routers
├── controllers/        # Request handlers
├── services/ai.service.js  # Gemini AI integration
└── validators/         # Zod schemas
scripts/seed.js         # Demo data seeder
```
