# Backend Requirements

## Manager Desk

**Date:** March 8, 2026  
**Audience:** Backend implementation  
**Related docs:** `docs/15-manager-desk-requirements.md`, `docs/16-manager-desk-frontend-handoff.md`

---

## 1. Purpose

This document defines the backend work required to support the new manager-only `Manager Desk` module.

The goal is to let backend implementation start with minimal ambiguity while staying aligned with:

- the current application architecture
- the current auth/session model already present in the repo
- the new product requirements
- the frontend API contract required for parallel UI development

---

## 2. Current Backend Context

Relevant existing backend pieces:

- app wiring in `server/src/app.ts`
- SQLite schema in `server/src/db/schema.ts`
- startup migration flow in `server/src/db/migrate.ts`
- auth routes in `server/src/routes/auth.ts`
- auth middleware in `server/src/middleware/auth.ts`
- issues routes and service
- Team Tracker routes and service
- shared contracts in `shared/types.ts`

Current state:

- lightweight internal auth and sessions already exist
- role-aware session identity already exists with `manager` and `developer`
- `My Day` routes already show a role-specific workspace pattern
- Team Tracker already models day-based operational data for developers
- there is currently no manager-owned day workspace or manager-desk-specific schema

This means the Manager Desk backend is an additive feature, not a foundational auth rewrite.

---

## 3. Backend Goals

1. Expose a new manager-only route surface for `Manager Desk`.
2. Persist manager-owned daily workspace data by date.
3. Support quick capture with minimal required fields.
4. Support structured item editing for actions, meetings, decisions, and waiting items.
5. Support linking desk items to existing defects and developers.
6. Support carry-forward between dates.
7. Return a stable contract that allows frontend development to proceed independently.

---

## 4. Authorization Model

All Manager Desk routes must be manager-only.

Recommended enforcement:

- use existing session middleware to require authentication
- add or reuse manager-role guard middleware
- reject developer-role access with `403`

Rules:

- manager users may read and mutate their own manager desk data
- developer users may not access any manager-desk route
- this phase assumes one manager's private desk data, even if multiple manager accounts exist later

If the system later supports multiple managers, data ownership must become user-scoped. The schema design below should keep that extension possible.

---

## 5. Recommended Data Model

### 5.1 `manager_desk_days`

Purpose:

- store manager-owned day records for a selected date
- allow day-level metadata if needed later

Suggested columns:

- `id` integer primary key
- `date` text not null
- `manager_account_id` text not null
- `created_at` text not null
- `updated_at` text not null

Rules:

- one row per `manager_account_id + date`
- if only one manager exists in practice, still keep `manager_account_id` for future-proofing

### 5.2 `manager_desk_items`

Purpose:

- store the main units of manager work

Suggested columns:

- `id` integer primary key
- `day_id` integer not null
- `title` text not null
- `kind` text not null
- `category` text not null
- `status` text not null default `inbox`
- `priority` text not null default `medium`
- `participants` text nullable
- `context_note` text nullable
- `next_action` text nullable
- `outcome` text nullable
- `planned_start_at` text nullable
- `planned_end_at` text nullable
- `follow_up_at` text nullable
- `completed_at` text nullable
- `created_at` text not null
- `updated_at` text not null

Recommended enum values:

- `kind`: `action`, `meeting`, `decision`, `waiting`
- `category`: `analysis`, `design`, `team_management`, `cross_team`, `follow_up`, `escalation`, `admin`, `planning`, `other`
- `status`: `inbox`, `planned`, `in_progress`, `waiting`, `done`, `cancelled`
- `priority`: `low`, `medium`, `high`, `critical`

### 5.3 `manager_desk_links`

Purpose:

- connect manager desk items to existing app entities

Suggested columns:

- `id` integer primary key
- `item_id` integer not null
- `link_type` text not null
- `issue_key` text nullable
- `developer_account_id` text nullable
- `external_label` text nullable
- `created_at` text not null

Recommended enum values:

- `link_type`: `issue`, `developer`, `external_group`

Rules:

- `issue` link requires `issue_key`
- `developer` link requires `developer_account_id`
- `external_group` link requires `external_label`

### 5.4 Optional Later Tables

Not required in this phase:

- recurring templates
- reminders / notifications
- item activity log
- rich meeting transcript store

If backend implementation wants lightweight audit coverage, an activity table can be added later without blocking the main feature.

---

## 6. Migration Requirements

Update:

- `server/src/db/schema.ts`
- `server/src/db/migrate.ts`

Migration requirements:

- additive only
- safe on existing databases
- preserve current user, defect, and Team Tracker data

Add DDL for:

- `manager_desk_days`
- `manager_desk_items`
- `manager_desk_links`

Suggested indexes:

- `manager_desk_days(manager_account_id, date)` unique
- `manager_desk_items(day_id)`
- `manager_desk_items(status)`
- `manager_desk_items(follow_up_at)`
- `manager_desk_links(item_id)`
- `manager_desk_links(issue_key)`
- `manager_desk_links(developer_account_id)`

---

## 7. Shared Types

Update `shared/types.ts` with new contracts for:

- `ManagerDeskItemKind`
- `ManagerDeskCategory`
- `ManagerDeskStatus`
- `ManagerDeskPriority`
- `ManagerDeskLinkType`
- `ManagerDeskLink`
- `ManagerDeskItem`
- `ManagerDeskSummary`
- `ManagerDeskDayResponse`
- lookup response item types where useful

The frontend handoff document should be treated as the source for the public contract shape.

---

## 8. Route Surface

Recommended route namespace:

- `/api/manager-desk`

All routes should require authenticated manager access.

### 8.1 Load Manager Desk Day

`GET /api/manager-desk?date=YYYY-MM-DD`

Behavior:

- resolve or lazily create the manager day row
- return all items for that day
- include per-item links
- compute summary counts

Response shape:

- `ManagerDeskDayResponse`

### 8.2 Create Item

`POST /api/manager-desk/items`

Behavior:

- support quick-capture create with only `date` and `title`
- apply defaults:
  - `kind = action`
  - `category = other`
  - `status = inbox`
  - `priority = medium`
- optionally accept full structured payload
- optionally accept initial links

Response:

- created `ManagerDeskItem`

### 8.3 Update Item

`PATCH /api/manager-desk/items/:itemId`

Behavior:

- update any editable field
- set `completed_at` automatically when state becomes `done` if not already present
- clear or preserve `completed_at` consistently if an item is moved out of `done`

Recommended policy:

- if item leaves `done`, clear `completed_at`

### 8.4 Delete Item

`DELETE /api/manager-desk/items/:itemId`

Behavior:

- hard delete is acceptable in v1
- must also remove related links

### 8.5 Add Link

`POST /api/manager-desk/items/:itemId/links`

Behavior:

- validate link payload by `linkType`
- ensure referenced issue or developer exists for typed links
- avoid accidental duplicate identical links for the same item

### 8.6 Remove Link

`DELETE /api/manager-desk/items/:itemId/links/:linkId`

Behavior:

- delete only if the link belongs to the specified item

### 8.7 Carry Forward

`POST /api/manager-desk/carry-forward`

Body:

- `fromDate`
- `toDate`
- optional `itemIds`

Behavior:

- copy unfinished items into target day
- preserve kind, category, priority, times, follow-up, notes, and links
- do not duplicate items already carried to the target day with identical content unless explicitly allowed

Recommended v1 duplicate rule:

- if same source item has already been carried to the target date, skip it

This may require a source-tracking column if the implementation wants robust deduplication. If time is tight, backend may first ship without full lineage but should at minimum prevent obvious accidental duplicate carry-forward within one request.

### 8.8 Lookup Endpoints for Link Attach Flows

`GET /api/manager-desk/lookups/issues?q=...`

Behavior:

- search currently synced issues by key and summary
- return a lightweight result set suitable for attach pickers

`GET /api/manager-desk/lookups/developers?q=...`

Behavior:

- search tracked developers by display name and optionally email
- return a lightweight result set suitable for attach pickers

These routes exist to support efficient link attachment without requiring the frontend to load the full defect dataset.

---

## 9. Validation Requirements

Backend validation must enforce at least:

- manager-only authorization
- valid `YYYY-MM-DD` date format for day-based routes
- valid item ID and link ID params
- enum safety for kind, category, status, priority, link type
- non-empty title with reasonable max length
- reasonable max length for text fields
- `plannedEndAt >= plannedStartAt` when both are present
- link payload matches link type and required target field
- referenced issue / developer exists before link creation

Suggested limits:

- `title`: max 500
- `participants`: max 500
- `contextNote`: max 5000
- `nextAction`: max 2000
- `outcome`: max 5000
- `externalLabel`: max 300

---

## 10. Service Layer Responsibilities

Recommended service decomposition:

- `manager-desk.service.ts`
  - day load / summary build
  - create / update / delete items
  - link management
  - carry forward
  - lookup helpers if not placed elsewhere

Route handlers should stay thin and validation-focused.

Service responsibilities should include:

- date/day resolution
- ownership scoping by manager account
- summary calculation
- item normalization
- duplicate-link protection
- carry-forward rules

---

## 11. Summary Calculation Requirements

For each day response, backend should calculate:

- `totalOpen`
- `inbox`
- `planned`
- `inProgress`
- `waiting`
- `overdueFollowUps`
- `meetings`
- `completed`

Definition guidance:

- `totalOpen`: items not in `done` or `cancelled`
- `meetings`: items whose `kind = meeting`
- `overdueFollowUps`: items with `followUpAt < now` and not `done` or `cancelled`

The summary should be calculated server-side so frontend can render immediately.

---

## 12. Suggested Error Semantics

Use the existing API error shape pattern:

```json
{
  "error": "Manager access required",
  "status": 403
}
```

Recommended status codes:

- `400` validation failure
- `401` unauthenticated
- `403` wrong role / forbidden
- `404` item or link not found
- `409` conflict when duplicate link or duplicate carry-forward is rejected

---

## 13. Testing Requirements

Add backend tests covering:

- manager can load an empty manager desk day
- developer cannot access manager desk routes
- quick-capture item creation with defaults
- structured item creation with all major fields
- item update transitions including `done`
- link creation for issue, developer, and external group
- invalid link payload rejection
- lookup endpoints
- carry-forward behavior
- duplicate carry-forward protection

Tests should live in backend Vitest coverage alongside existing route and service tests.

---

## 14. Acceptance Criteria

1. Manager-authenticated sessions can load `/api/manager-desk?date=...`.
2. Developer-authenticated sessions receive `403` on manager-desk routes.
3. Quick capture works with minimal payload and stores an inbox item.
4. Full structured item create and update flows work for all required fields.
5. Links to issues and developers are validated and persisted.
6. Day response includes computed summary counts and item links.
7. Carry-forward creates target-day items without losing notes or links.
8. Backend tests cover the main happy paths and authorization boundaries.
