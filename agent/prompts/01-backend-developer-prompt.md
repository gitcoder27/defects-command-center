# Developer Agent Prompt — Backend

## Your Role

You are a senior backend engineer. Your job is to implement the **complete Node.js/Express backend** for the Defect Management Command Dashboard.

You have been given a `docs/` folder with full project documentation. Read all five documents before writing any code. They are your source of truth.

---

## Documentation to Read First

Read these documents in order before starting:

1. `docs/01-PRD.md` — Understand what the system does and why.
2. `docs/02-system-design.md` — Architecture, data models, API design, Jira integration. **This is your primary reference.**
3. `docs/04-technical-plan.md` — Technology stack, repository structure, and implementation tasks.
4. `docs/05-execution-plan.md` — Sequential task list. Follow **Phase A and Phase B and Phase C** tasks only (Tasks 1–2, 6–18).

---

## Your Scope

You build **everything inside the `server/` directory** and the shared types in `shared/`.

You do NOT build any frontend code. Do not create anything in `client/`.

---

## What to Build

### Project Foundation

- Root `package.json` (npm workspaces for `client/`, `server/`, `shared/`)
- `shared/types.ts` — all shared TypeScript interfaces
- `tsconfig.base.json` — base TypeScript config
- `.env.example` — environment variable template
- `.gitignore`
- `data/.gitkeep`

### Server (`server/`)

- TypeScript + Express application
- SQLite database via `better-sqlite3` + Drizzle ORM
- Auto-migration on startup (create tables if not exist)
- Jira REST API client (authentication, pagination, error handling, rate limit backoff)
- Sync engine (full sync on startup, incremental every 5 minutes via `node-cron`)
- All service classes: `IssueService`, `WorkloadService`, `AlertService`, `AutomationService`
- All REST API routes (see full list below)
- Zod validation middleware on all write endpoints
- Global error handler (clean JSON errors, no stack trace leaks in production)
- Structured logging with `pino`

---

## API Endpoints to Implement

Every endpoint must return JSON. All errors must return `{ error: string, status: number }`.

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/issues` | List issues with optional filters: `filter`, `assignee`, `priority`, `status`, `sort`, `order` |
| GET | `/api/issues/:key` | Single issue detail |
| PATCH | `/api/issues/:key` | Update issue fields: assigneeId, priorityName, dueDate, flagged |
| POST | `/api/issues/:key/comments` | Add Jira comment |
| GET | `/api/overview` | Overview card counts (new, unassigned, dueToday, overdue, blocked, inProgress, total, lastSynced) |
| GET | `/api/team/workload` | Per-developer workload with scores |
| GET | `/api/team/developers` | Configured developer list |
| GET | `/api/team/:accountId/issues` | Issues for a specific developer |
| GET | `/api/alerts` | Active alerts (all types) |
| GET | `/api/suggestions/assignee/:key` | Ranked developer suggestions for assignment |
| GET | `/api/suggestions/priority/:key` | Priority suggestion for an issue |
| GET | `/api/suggestions/duedate/:priority` | Due date suggestion for a given priority |
| POST | `/api/sync` | Trigger manual sync, returns sync result |
| GET | `/api/sync/status` | Last sync time and status |
| GET | `/api/config` | Current config (mask the API token) |
| PUT | `/api/config` | Save configuration |
| POST | `/api/config/test` | Test Jira connection with given credentials |

---

## Database Schema

Implement these tables exactly as defined in `docs/02-system-design.md` Section 3.1:

- `issues` — cached Jira issues
- `developers` — configured team members
- `component_map` — component-to-developer mapping (create schema now, populate in Phase 2)
- `sync_log` — sync audit log
- `config` — key-value configuration store

Create all indexes defined in the schema.

---

## Business Logic

### Workload Scoring

```
Priority Weights:
  Highest = 5
  High    = 3
  Medium  = 1
  Low     = 0.5
  Lowest  = 0.5

Thresholds:
  light:  score < 5
  medium: 5 <= score < 12
  heavy:  score >= 12
```

### Filter Definitions

| Filter name | Logic |
|---|---|
| `unassigned` | assignee_id = lead's account ID (from config) |
| `dueToday` | due_date = today's ISO date |
| `dueThisWeek` | due_date between today and next Sunday |
| `overdue` | due_date < today AND status_category != 'done' |
| `blocked` | flagged = 1 |
| `stale` | updated_at < now - 48h AND status_category != 'done' |
| `highPriority` | priority_name IN ('Highest', 'High') |

### Overview Card Counts

- **New**: created_at >= now - 24h
- **Unassigned**: assignee_id = lead's account ID
- **Due Today**: due_date = today
- **Overdue**: due_date < today AND status_category != 'done'
- **Blocked**: flagged = 1
- **In Progress**: status_category = 'indeterminate'

### Alert Rules

| Type | Condition |
|---|---|
| `overdue` | due_date < today AND status_category != 'done' |
| `stale` | updated_at < now - 48h AND status_category != 'done' |
| `blocked` | flagged = 1 |
| `idle_developer` | Developer has 0 active (non-done) defects |
| `high_priority_not_started` | priority IN (Highest, High) AND status = 'To Do' AND created_at < now - 4h |

### Automation / Suggestion Rules

**Priority suggestion:**
```
labels includes 'production' or 'prod-bug'  → Highest
labels includes 'customer' or 'client'      → High
otherwise                                   → Medium
```

**Due date suggestion:**
```
Highest → created + 24 hours
High    → created + 3 calendar days
Medium  → created + 7 calendar days
Low     → created + 14 calendar days
Lowest  → created + 14 calendar days
```

**Assignee suggestion:**
- Rank all active developers by workload score (ascending)
- Top-ranked = lowest score = most available
- Return ranked list with score and reason

---

## Jira Integration Details

### Authentication
```
Authorization: Basic base64(email:apiToken)
Content-Type: application/json
Accept: application/json
```

### Key endpoints used
- Search: `GET /rest/api/3/search?jql=...&fields=...&startAt=0&maxResults=100`
- Get issue: `GET /rest/api/3/issue/{key}`
- Update: `PUT /rest/api/3/issue/{key}` with `{ "fields": { ... } }`
- Comment: `POST /rest/api/3/issue/{key}/comment` using ADF format
- Users: `GET /rest/api/3/user/assignable/search?project={key}`
- Self: `GET /rest/api/3/myself`

### Sync JQL
```
Full sync:
project = {PROJECT_KEY} AND issuetype = Bug AND statusCategory != Done

Incremental (add to full sync JQL):
AND updated >= "{lastSyncTime}"
```

### Fields to fetch
```
summary,description,priority,status,assignee,reporter,
components,labels,duedate,created,updated,flagged
```

### Rate limit handling
- On HTTP 429: read `Retry-After` header, wait, retry once
- Paginate with `startAt` increments of 100 until `total` is reached
- Log each page fetched

### Jira comment format (ADF v3)
```json
{
  "body": {
    "type": "doc",
    "version": 1,
    "content": [{
      "type": "paragraph",
      "content": [{ "type": "text", "text": "YOUR_COMMENT_HERE" }]
    }]
  }
}
```

### Flagged field
The "blocked" flag in Jira is stored as `customfield_10021`. Its value when flagged is `[{ "id": "10019" }]`. When unflagged it is `null`. Map this to the `flagged` boolean in the local schema.

---

## Technology Stack

| Package | Version | Purpose |
|---|---|---|
| `express` | ^4.19 | HTTP server |
| `better-sqlite3` | ^11 | SQLite driver |
| `drizzle-orm` | ^0.30 | ORM + query builder |
| `node-cron` | ^3 | Sync scheduler |
| `pino` + `pino-pretty` | ^9 | Structured logging |
| `zod` | ^3.23 | Input validation |
| `dotenv` | ^16 | Environment loading |
| `tsx` | ^4 | TypeScript runner (dev) |

TypeScript: strict mode, `noUncheckedIndexedAccess: true`.

---

## Environment Variables

```
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-api-token
JIRA_PROJECT_KEY=PROJ
PORT=3001
```

**Security:** `JIRA_API_TOKEN` must NEVER be stored in the database or returned in any API response. Always read from `process.env`. When returning config via `GET /api/config`, replace the token value with `"****"`.

---

## Directory Structure to Create

```
defects-dashboard/
├── .env.example
├── .gitignore
├── package.json               ← root, npm workspaces
├── tsconfig.base.json
├── data/
│   └── .gitkeep
├── shared/
│   ├── package.json
│   └── types.ts
└── server/
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts
        ├── app.ts
        ├── config.ts
        ├── db/
        │   ├── connection.ts
        │   ├── schema.ts
        │   └── migrate.ts
        ├── jira/
        │   ├── client.ts
        │   └── types.ts
        ├── sync/
        │   └── engine.ts
        ├── services/
        │   ├── issue.service.ts
        │   ├── workload.service.ts
        │   ├── alert.service.ts
        │   └── automation.service.ts
        ├── routes/
        │   ├── issues.ts
        │   ├── overview.ts
        │   ├── team.ts
        │   ├── alerts.ts
        │   ├── suggestions.ts
        │   ├── sync.ts
        │   └── config.ts
        ├── middleware/
        │   ├── errorHandler.ts
        │   └── validate.ts
        └── utils/
            └── date.ts
```

---

## Testing Requirements

Write unit tests using **Vitest** for all service files.

Minimum coverage targets (≥ 80% on service files):

- `workload.service.ts` — score calculation per priority weight, level thresholds (light/medium/heavy), idle detection, assignee ranking.
- `alert.service.ts` — each of the 5 alert types triggers correctly, no false positives.
- `automation.service.ts` — all priority suggestion label rules, all due date calculations.
- `issue.service.ts` — each filter type returns the correct subset, overview counts are accurate.

Use mocked data (no live Jira calls in tests). Mock the database with in-memory SQLite or simple object mocks.

Run: `npm run test` — all tests must pass.
Run: `npm run test:coverage` — verify ≥ 80% on changed service files.

---

## Production Build

The server must also serve the frontend in production:
- After `npm run build` is complete, `server/src/app.ts` must serve static files from `../client/dist/`.
- All non-`/api/*` routes must fall through to `client/dist/index.html` (SPA fallback).
- This allows running the full app with a single `npm run start`.

---

## Security Checklist

Before considering your work complete, verify:

- [ ] `JIRA_API_TOKEN` never stored in DB, never returned in API responses
- [ ] All write endpoints (`PATCH`, `PUT`, `POST`) validated with Zod before processing
- [ ] Issue keys and account IDs validated against expected format (e.g., `^[A-Z]+-\d+$`)
- [ ] No raw SQL string interpolation — all queries use Drizzle ORM parameterized methods
- [ ] Jira description content is never executed — treat as plain text/markdown only
- [ ] Error messages do not leak internal paths or stack traces in production (`NODE_ENV=production`)
- [ ] `Retry-After` is respected in Jira API 429 responses

---

## Completion Criteria

Your backend is complete when:

1. `npm run dev:server` starts the server on port 3001 with no errors.
2. `GET /api/health` returns `{ "status": "ok" }`.
3. After providing valid `.env` values, `POST /api/config/test` succeeds against a real Jira instance.
4. After setup, `POST /api/sync` fetches issues from Jira and `GET /api/issues` returns them.
5. `GET /api/overview` returns correct counts.
6. `GET /api/team/workload` returns scored developer data.
7. `GET /api/alerts` returns correct active alerts.
8. `PATCH /api/issues/:key` with `{ "assigneeId": "..." }` updates Jira and returns success.
9. All unit tests pass (`npm run test`).
10. A `README.md` is created with setup and run instructions.

---

## Notes

- The frontend developer will build the React UI against your API. They will call your endpoints exactly as documented in `docs/02-system-design.md` Section 2.2.
- Do not break the API contract. If you add or change an endpoint, document the change.
- Leave a `client/` directory with just a `package.json` placeholder so the npm workspace is valid, but do not build anything inside it.
