# Exam Platform — Backend

Hono + MongoDB + Mongoose + Swagger/OpenAPI. TypeScript, ESM, structured for readability.

## Two distinct authentication flows

| Owner                       | How they sign in                                                                                                        | Token TTLs                                      | What they can do                              |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------- |
| **Staff** (admin / teacher) | `POST /auth/register` or `POST /auth/login` (email + password)                                                          | access 15m / refresh 30d                        | Manage exams, questions, students, moderators |
| **Student**                 | **No self-login.** A moderator physically confirms them via `POST /auth/student/confirm` (student code + moderator PIN) | access 15m / refresh 6h, scoped to **one exam** | Take exactly the exam they were confirmed for |

Students have no password, no JWT without a moderator in the loop. This is by design — the moderator's PIN is the credential.

## Refresh-token rotation + reuse detection

- Every `/auth/refresh` mints a new pair in the same `familyId` and revokes the old one.
- If a **revoked** refresh token is ever presented again, the entire family is killed (theft-signal).
- `/auth/logout` revokes a single refresh token (idempotent).
- The refresh JWT itself is stateless; only its **SHA-256 hash** is stored in the `RefreshToken` collection (TTL index auto-cleans expired rows).

## Project layout

```
src/
├── config/         env (Zod-validated) + db connection
├── models/         Mongoose models: User, Student, Moderator, RefreshToken, Exam, Question, Attempt
├── services/       Business logic (auth, exam, question, attempt, student, moderator, identity)
├── routes/         Hono routers (one file per resource)
├── openapi/        OpenAPIHono + Swagger UI (/api/doc, /api/swagger)
├── middleware/     auth, role, error, validate
├── validators/     Zod schemas (single source of truth for runtime + docs)
├── serializers/    Mongoose doc → JSON-friendly shapes
├── lib/            errors, jwt, password, shuffle, id, response
├── types/          Hono context augmentation
├── app.ts          Hono root + middleware + Swagger mounting
└── index.ts        Server entrypoint
```

## Quick start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# Edit .env: set MONGODB_URI, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET

# 3. Run dev server (auto-reload)
npm run dev

# 4. Or build + run
npm run build
npm start

# 5. Open the docs
# Swagger UI:  http://localhost:3000/api/swagger
# OpenAPI JSON: http://localhost:3000/api/doc
```

## Example flows (curl)

### Staff signup

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"fullName":"Maria Ionescu","email":"maria@school.example","password":"strongpass123","role":"teacher"}'
```

→ returns `{ user, tokens: { accessToken, refreshToken, ownerType: "User", expiresAt } }`

### Create a student (staff)

`studentCode` is optional — omit it (or send `""`) and the backend assigns
the next generated code in the `STU-<year>-<seq>` sequence.

```bash
# Explicit code
curl -X POST http://localhost:3000/api/auth/students \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"fullName":"Andrei Popescu","studentCode":"STU-2026-00417"}'

# Auto-generated code — the response contains the assigned studentCode
curl -X POST http://localhost:3000/api/auth/students \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"fullName":"Andrei Popescu"}'
```

### Create a moderator (staff)

```bash
curl -X POST http://localhost:3000/api/moderators \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"fullName":"Elena Radu","code":"7431-XQ"}'
```

### Student confirmation (issues student tokens AND starts the attempt)

```bash
curl -X POST http://localhost:3000/api/auth/student/confirm \
  -H 'Content-Type: application/json' \
  -d '{
        "examId": "665f0a1...",
        "studentCode": "STU-2026-00417",
        "moderatorCode": "7431-XQ"
      }'
```

→ returns `{ student, exam, moderator, attempt, tokens }`. The student now has 6h to take the exam.

### Answer a question

```bash
curl -X POST http://localhost:3000/api/attempts/$ATTEMPT_ID/answer \
  -H "Authorization: Bearer $STUDENT_ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"questionId":"...","givenOptionIds":["..."]}'
```

### Finish the exam (revokes the student session, returns private result token)

```bash
curl -X POST http://localhost:3000/api/auth/student/finish \
  -H "Authorization: Bearer $STUDENT_ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"attemptId":"$ATTEMPT_ID"}'
```

→ returns `{ attempt: { ..., resultToken } }`. Use that token to build the private result link.

### Lookup a result by its public token (no auth)

```bash
curl http://localhost:3000/api/auth/student/result/$RESULT_TOKEN
```

## Role / ownership model

- `User.role` ∈ `{ admin, teacher }` — controls staff endpoints via `requireRole(...)`
- `JWT.ownerType` ∈ `{ User, Student }` — controls who is making the request
- A student JWT has no `role` field, so `requireRole('admin', 'teacher')` naturally rejects student requests

## Scripts

| Command             | What it does                  |
| ------------------- | ----------------------------- |
| `npm run dev`       | Run with `tsx` watch mode     |
| `npm run build`     | TypeScript → `dist/`          |
| `npm start`         | Run the built `dist/index.js` |
| `npm run typecheck` | `tsc --noEmit`                |
| `npm run lint`      | ESLint                        |
| `npm run format`    | Prettier                      |

## Environment

| Variable                 | Required | Default       | Notes                                             |
| ------------------------ | -------- | ------------- | ------------------------------------------------- |
| `MONGODB_URI`            | ✅       | —             | `mongodb://localhost:27017/exam_db`               |
| `JWT_ACCESS_SECRET`      | ✅       | —             | min 16 chars                                      |
| `JWT_REFRESH_SECRET`     | ✅       | —             | min 16 chars (separate from access)               |
| `JWT_REFRESH_EXPIRES_IN` | —        | `30d`         | Staff refresh TTL (students are hard-coded to 6h) |
| `BCRYPT_ROUNDS`          | —        | `10`          |                                                   |
| `PORT`                   | —        | `3000`        |                                                   |
| `CORS_ORIGIN`            | —        | `*`           | Comma-separated list for multiple                 |
| `NODE_ENV`               | —        | `development` |                                                   |

## Response shape

All endpoints return:

```json
{ "success": true,  "data": { ... } }
```

or

```json
{ "success": false, "error": { "code": "STRING_CODE", "message": "...", "details": ... } }
```
