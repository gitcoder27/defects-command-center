# Backend Implementation Plan

## Developer Workspace

**Date:** March 7, 2026  
**Audience:** Backend implementation  
**Related docs:** `docs/12-developer-workspace-requirements.md`, `docs/13-developer-workspace-frontend-handoff.md`

---

## 1. Purpose

This document defines the backend work required to support the new developer-facing workspace.

The goal is to let backend implementation begin with minimal ambiguity while staying aligned with:

- the current Team Tracker data model
- the new product requirements
- the frontend handoff contract

This document is intentionally implementation-oriented.

---

## 2. Current Backend Context

Relevant existing backend pieces:

- app wiring in `server/src/app.ts`
- SQLite schema in `server/src/db/schema.ts`
- startup migration flow in `server/src/db/migrate.ts`
- Team Tracker routes in `server/src/routes/team-tracker.ts`
- Team Tracker service in `server/src/services/team-tracker.service.ts`
- shared contracts in `shared/types.ts`

Current state:

- Team Tracker already supports per-day developer status, work items, current item, check-ins, and carry-forward
- there is currently no application login/session model
- there is currently no role-aware authorization
- there is currently no developer-scoped route surface
- tracker data is manager-oriented and does not yet distinguish actor attribution

---

## 3. Backend Goals

1. Add lightweight internal authentication suitable for a small internal team.
2. Map authenticated users to roles and, for developers, to exactly one `developer.accountId`.
3. Expose a developer-scoped API for `My Day`.
4. Reuse the existing Team Tracker data model where possible.
5. Preserve a clear separation between manager-only data and shared operational data.
6. Add enough attribution and guardrails to support multi-user updates safely.

---

## 4. Recommended Technical Approach

### 4.1 Authentication Model

Use simple internal username/password authentication with server-managed sessions.

Recommended approach:

- login form posts credentials to backend
- backend verifies password hash
- backend creates session record
- backend returns authenticated session via secure HTTP cookie

Why this approach:

- fits the frontend login flow already described
- avoids browser-native HTTP Basic auth prompts
- supports logout and session expiry cleanly
- is still simple enough for internal use

This plan interprets "basic auth" as lightweight internal authentication, not necessarily RFC HTTP Basic.

### 4.2 Authorization Model

Use role-aware middleware with two roles:

- `manager`
- `developer`

Rules:

- manager can access manager endpoints and developer-scoped endpoints
- developer can only access developer-scoped endpoints for their own identity
- developer cannot access team-wide tracker routes unless explicitly allowed later

### 4.3 Tracker Reuse Strategy

Do not create a separate developer-tracker dataset.

Use the same underlying tracker tables already powering Team Tracker:

- `team_tracker_days`
- `team_tracker_items`
- `team_tracker_checkins`

Add only the minimum fields needed for:

- authentication
- actor attribution
- manager-only vs shared data separation

---

## 5. Data Model Changes

### 5.1 New `app_users` Table

Purpose:

- store login identity and role
- link developers to their tracker identity

Suggested columns:

- `id` integer primary key
- `username` text unique not null
- `password_hash` text not null
- `role` text not null
- `developer_account_id` text nullable
- `is_active` integer not null default `1`
- `created_at` text not null
- `updated_at` text not null

Rules:

- `role` values: `manager`, `developer`
- `developer_account_id` is required for developer users
- `developer_account_id` is optional for manager users
- one developer user maps to one `developers.account_id`

### 5.2 New `app_sessions` Table

Purpose:

- persist authenticated sessions
- support logout and expiry

Suggested columns:

- `id` text primary key
- `user_id` integer not null
- `created_at` text not null
- `expires_at` text not null
- `last_seen_at` text not null

Rules:

- session ID should be high-entropy and unguessable
- expired sessions are rejected by middleware
- optional later cleanup job can delete expired sessions

### 5.3 Extend `team_tracker_checkins`

Purpose:

- attribute updates once both manager and developers can add check-ins

Suggested added columns:

- `author_type` text not null default `manager`
- `author_account_id` text nullable

Rules:

- `author_type` values: `manager`, `developer`
- `author_account_id` should be the acting user's linked developer account when applicable
- existing rows can default to `manager`

### 5.4 Optional: Tracker Activity Table

Recommended if time allows in the same phase.

Purpose:

- preserve audit history for key actions beyond check-ins

Suggested table:

- `team_tracker_activity`

Suggested columns:

- `id` integer primary key
- `day_id` integer not null
- `item_id` integer nullable
- `actor_type` text not null
- `actor_account_id` text nullable
- `action_type` text not null
- `summary` text not null
- `created_at` text not null

This is not required for the first backend cut if time is tight, but actor attribution should at minimum exist on check-ins and session identity must be enforced in writes.

### 5.5 Manager Notes Handling

Current `team_tracker_days.manager_notes` should remain manager-only.

Do not expose this field from developer-scoped responses.

No immediate schema split is required if developer routes simply omit it from output and reject edits to it.

---

## 6. Migration Work

Update:

- `server/src/db/schema.ts`
- `server/src/db/migrate.ts`

Migration requirements:

- additive only
- safe on existing databases
- preserve current tracker data

Add DDL for:

- `app_users`
- `app_sessions`
- new columns on `team_tracker_checkins`
- indexes needed for session lookup and user lookup

Suggested indexes:

- `app_users(username)`
- `app_users(developer_account_id)`
- `app_sessions(user_id)`
- `app_sessions(expires_at)`

---

## 7. Shared Types

Update `shared/types.ts` with:

- auth session types
- developer-scoped response types
- optional actor attribution fields on check-ins

Suggested new shared contracts:

- `UserRole`
- `AuthUser`
- `AuthSessionResponse`
- `MyDayResponse`

Also extend:

- `TrackerCheckIn`

Keep developer-scoped response types separate from manager board response types so the frontend can rely on a stable role-specific contract.

---

## 8. Route Plan

### 8.1 New Auth Routes

Create:

- `server/src/routes/auth.ts`

Register in:

- `server/src/app.ts`

Endpoints:

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

Behavior:

- login verifies username/password and creates session
- `me` returns authenticated user context
- logout invalidates current session

### 8.2 New Developer-Scoped Routes

Create:

- `server/src/routes/my-day.ts`

Register in:

- `server/src/app.ts`

Endpoints:

- `GET /api/my-day?date=YYYY-MM-DD`
- `PATCH /api/my-day`
- `POST /api/my-day/items`
- `PATCH /api/my-day/items/:itemId`
- `POST /api/my-day/items/:itemId/set-current`
- `POST /api/my-day/checkins`

Optional:

- `DELETE /api/my-day/items/:itemId`

Important rule:

These routes must derive the developer identity from the authenticated session, not from a user-supplied account ID.

### 8.3 Existing Team Tracker Routes

Current manager-focused routes in `server/src/routes/team-tracker.ts` should remain available for the manager experience.

Recommended access rule:

- require authenticated manager session for the existing `/api/team-tracker` surface

If full-manager auth is deferred temporarily, still enforce auth on all new `/api/auth` and `/api/my-day` routes first.

---

## 9. Middleware Plan

Add middleware for:

### 9.1 Session Extraction

Responsibilities:

- read session cookie
- load session and user from database
- reject expired or missing sessions when required
- attach authenticated user to request context

Suggested new middleware file:

- `server/src/middleware/auth.ts`

### 9.2 Role Guards

Provide simple helpers such as:

- `requireAuth`
- `requireManager`
- `requireDeveloperOrManager`

For `/api/my-day`, `requireAuth` is enough if the route always scopes operations to `req.auth.user`.

### 9.3 Request Context Type

Extend Express request typing to include authenticated user/session context.

---

## 10. Service Layer Plan

### 10.1 New Auth Service

Create:

- `server/src/services/auth.service.ts`

Responsibilities:

- verify credentials
- hash and compare passwords
- create sessions
- load session user
- invalidate session

Recommended implementation details:

- use bcrypt or bcryptjs for password hashing
- do not store plain-text passwords
- use constant-time password verification via library

### 10.2 New Developer Workspace Service

Create:

- `server/src/services/my-day.service.ts`

Responsibilities:

- load the logged-in developer's day view
- expose developer-safe response shape
- delegate tracker mutations to `TeamTrackerService` where appropriate
- enforce developer ownership on all accessed items

Recommended strategy:

- reuse `TeamTrackerService.ensureDay`
- reuse `TeamTrackerService.addItem`
- reuse `TeamTrackerService.updateItem`
- reuse `TeamTrackerService.setCurrentItem`
- reuse `TeamTrackerService.addCheckIn`

Where reuse is not safe directly, add thin identity-aware wrapper methods.

### 10.3 Team Tracker Service Adjustments

`TeamTrackerService` should be extended where necessary to support:

- item ownership validation by `developerAccountId`
- actor-aware check-in creation
- developer-safe day loading without manager-only fields

Suggested additions:

- `getDeveloperDay(accountId, date)`
- `assertItemBelongsToDeveloper(itemId, accountId)`
- optional actor parameter on write methods

---

## 11. API Contract Targets

These should match the frontend handoff.

### 11.1 `POST /api/auth/login`

Request:

```ts
{
  username: string;
  password: string;
}
```

Response:

```ts
{
  user: {
    accountId: string;
    displayName: string;
    role: "manager" | "developer";
  };
}
```

Side effect:

- sets session cookie

### 11.2 `GET /api/auth/me`

Response:

```ts
{
  user: {
    accountId: string;
    displayName: string;
    role: "manager" | "developer";
  };
}
```

### 11.3 `POST /api/auth/logout`

Response:

```ts
{
  ok: true;
}
```

Side effect:

- invalidates session and clears cookie

### 11.4 `GET /api/my-day?date=YYYY-MM-DD`

Response:

```ts
{
  date: string;
  developer: {
    accountId: string;
    displayName: string;
    email?: string;
    avatarUrl?: string;
  };
  status: "on_track" | "at_risk" | "blocked" | "waiting" | "done_for_today";
  lastCheckInAt?: string;
  currentItem?: TrackerWorkItem;
  plannedItems: TrackerWorkItem[];
  completedItems: TrackerWorkItem[];
  droppedItems: TrackerWorkItem[];
  checkIns: TrackerCheckIn[];
  isStale: boolean;
}
```

Must not include:

- `managerNotes`

### 11.5 `PATCH /api/my-day`

Request:

```ts
{
  date: string;
  status?: "on_track" | "at_risk" | "blocked" | "waiting" | "done_for_today";
}
```

Behavior:

- updates only the authenticated developer's day

### 11.6 `POST /api/my-day/items`

Request:

```ts
{
  date: string;
  itemType: "jira" | "custom";
  jiraKey?: string;
  title: string;
  note?: string;
}
```

Behavior:

- creates item only for authenticated developer
- preserve current Jira validation rules

### 11.7 `PATCH /api/my-day/items/:itemId`

Request:

```ts
{
  title?: string;
  note?: string;
  state?: "planned" | "in_progress" | "done" | "dropped";
  position?: number;
}
```

Behavior:

- reject if item does not belong to authenticated developer

### 11.8 `POST /api/my-day/items/:itemId/set-current`

Behavior:

- item must belong to authenticated developer
- backend enforces single-current-item rule

### 11.9 `POST /api/my-day/checkins`

Request:

```ts
{
  date: string;
  summary: string;
  status?: "on_track" | "at_risk" | "blocked" | "waiting" | "done_for_today";
}
```

Behavior:

- create developer-authored check-in
- update `lastCheckInAt`
- persist actor attribution

---

## 12. Security Requirements

Minimum backend requirements for this phase:

- password hashes only, never plain-text storage
- session IDs must be random and unguessable
- cookies should be `HttpOnly`
- `SameSite` should be set appropriately for same-origin app usage
- all developer write routes must use authenticated session identity, never caller-supplied account IDs
- manager-only fields must be omitted from developer responses

Optional but recommended:

- session expiry timeout
- logout-all or session revocation later
- simple rate limiting on login attempts

---

## 13. Seed / Bootstrap Plan

The backend needs an initial way to create users.

For the first implementation, one of these is required:

- seed manager and developer users from a script
- provide a one-time bootstrap script
- provide an internal admin-only route for user creation

Recommended first cut:

- use a script or startup seed path, not a public self-signup flow

This is an internal tool; user creation can remain operationally simple.

---

## 14. Testing Plan

### 14.1 Route Tests

Add tests for:

- successful login
- login rejection on invalid password
- authenticated `me`
- logout clears session
- unauthenticated access to `/api/my-day` is rejected
- developer cannot access another developer's item through forged item ID
- developer can load only their own day
- developer updates reflect through shared tracker state

Suggested files:

- `server/tests/auth.routes.test.ts`
- `server/tests/my-day.routes.test.ts`

### 14.2 Service Tests

Add tests for:

- session creation and validation
- expired session rejection
- password verification
- developer-safe day response omits `managerNotes`
- item ownership validation
- actor attribution on developer check-ins

Suggested files:

- `server/tests/auth.service.test.ts`
- `server/tests/my-day.service.test.ts`

### 14.3 Regression Tests

Ensure existing manager tracker tests still pass.

Add regression coverage that confirms:

- manager tracker still reads the same underlying updates
- developer-authored updates appear correctly in manager board data where intended
- existing carry-forward behavior remains intact

---

## 15. Suggested Implementation Order

1. Add schema and migration updates for users, sessions, and check-in attribution.
2. Add shared auth and `My Day` response types.
3. Implement `AuthService`.
4. Implement auth middleware and request context typing.
5. Add `/api/auth` routes.
6. Add developer-scoped `MyDayService`.
7. Add `/api/my-day` routes with ownership checks.
8. Update `TeamTrackerService` for actor attribution and safe reuse.
9. Add backend tests for auth and developer-scoped tracker flows.
10. Optionally put manager routes behind auth once the new session model is stable.

---

## 16. Definition of Done

Backend work for this phase is complete when:

1. Internal users can authenticate successfully.
2. A developer session is mapped to one developer identity.
3. Developer-scoped routes exist and are protected.
4. Developers can load and mutate only their own day data.
5. Manager-only notes are not exposed through developer routes.
6. Developer check-ins are attributed correctly.
7. Existing Team Tracker remains functional against the same underlying data.
8. Automated backend tests cover auth, authorization, and the main `My Day` workflows.
