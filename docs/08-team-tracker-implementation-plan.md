# Technical Implementation Plan

## Team Workload Tracker

**Version:** 1.0  
**Date:** March 7, 2026

---

## 1. Current Repo Context

The existing app already provides:

- active developer roster via `/api/team/developers`
- Jira-synced issue data in local SQLite
- a workload summary via `/api/team/workload`
- a single main dashboard view with no routing library
- local-only issue notes via `analysisNotes`

Relevant current files:

- `client/src/App.tsx`
- `client/src/components/layout/Header.tsx`
- `client/src/components/layout/DashboardLayout.tsx`
- `client/src/components/workload/WorkloadBar.tsx`
- `server/src/routes/team.ts`
- `server/src/services/workload.service.ts`
- `server/src/db/schema.ts`
- `shared/types.ts`

This means the tracker should be added as a local, manager-owned layer on top of existing team and issue data.

---

## 2. Architecture Decisions

### 2.1 View Model

Add a new top-level app view: `team-tracker`.

For MVP, use a lightweight internal view switch in app state instead of introducing `react-router`. The current app is single-view and this keeps the feature contained.

Recommended approach:

- add `activeView: 'dashboard' | 'team-tracker'` near the app shell
- update the header to expose a small view switch
- render either `DashboardLayout` or `TeamTrackerPage`

If the app grows further later, this can be upgraded to a real router.

### 2.2 Persistence Model

Tracker data must be local app data in SQLite. Do not attempt to repurpose Jira issue fields or `analysisNotes` for this feature.

### 2.3 UX Model

Keep the current workload bar on the dashboard as a summary.

The new Team Tracker page should be:

- board-oriented
- card-based
- detail-drawer driven
- optimized for fast scanning and repeated updates

---

## 3. Proposed Data Model

### 3.1 New Tables

#### `team_tracker_days`

One row per tracked day and developer.

Suggested columns:

- `id` integer primary key
- `date` text `YYYY-MM-DD`
- `developer_account_id` text
- `status` text
- `manager_notes` text nullable
- `last_check_in_at` text nullable
- `created_at` text
- `updated_at` text

Suggested uniqueness:

- unique on `(date, developer_account_id)`

#### `team_tracker_items`

Planned items for a developer day.

Suggested columns:

- `id` integer primary key
- `day_id` integer
- `item_type` text: `jira` or `custom`
- `jira_key` text nullable
- `title` text
- `state` text: `planned`, `in_progress`, `done`, `dropped`
- `position` integer
- `note` text nullable
- `completed_at` text nullable
- `created_at` text
- `updated_at` text

Rules:

- `jira_key` required only when `item_type = 'jira'`
- `title` stores a snapshot label for faster rendering
- exactly one `in_progress` item per day card should be enforced in service logic

#### `team_tracker_checkins`

Timestamped follow-up records.

Suggested columns:

- `id` integer primary key
- `day_id` integer
- `created_at` text
- `summary` text

Optional later additions:

- `status_after`
- `next_follow_up_at`

### 3.2 Schema / Migration Work

Update:

- `server/src/db/schema.ts`
- `server/src/db/migrate.ts`

Keep migrations additive and compatible with the current auto-migrate startup flow.

---

## 4. Shared Types

Add tracker-specific shared types in `shared/types.ts` and mirror export usage in `client/src/types/index.ts` if that pattern remains.

Suggested types:

- `TrackerDeveloperStatus`
- `TrackerItemState`
- `TrackerItemType`
- `TrackerCheckIn`
- `TrackerWorkItem`
- `TrackerDeveloperDay`
- `TeamTrackerBoardResponse`

Suggested shape:

```ts
export type TrackerDeveloperStatus =
  | "on_track"
  | "at_risk"
  | "blocked"
  | "waiting"
  | "done_for_today";

export type TrackerItemState = "planned" | "in_progress" | "done" | "dropped";
export type TrackerItemType = "jira" | "custom";
```

`TrackerDeveloperDay` should embed:

- developer summary
- selected date
- current item
- planned items
- completed items
- check-ins
- last check-in timestamp
- notes preview
- stale state derived on the client or server

---

## 5. API Design

Create a dedicated route module such as:

- `server/src/routes/team-tracker.ts`

Register it in:

- `server/src/app.ts`

Recommended endpoints:

### Board / Day Loading

- `GET /api/team-tracker?date=YYYY-MM-DD`
  - returns one `TrackerDeveloperDay` per active developer

### Developer Day Upsert

- `PATCH /api/team-tracker/:accountId/day`
  - body: `{ date, status?, managerNotes?, lastCheckInAt? }`

### Work Items

- `POST /api/team-tracker/:accountId/items`
  - body: `{ date, itemType, jiraKey?, title?, note? }`
- `PATCH /api/team-tracker/items/:itemId`
  - body: `{ title?, state?, note?, position? }`
- `DELETE /api/team-tracker/items/:itemId`

### Current Item Helpers

- `POST /api/team-tracker/items/:itemId/set-current`
  - sets selected item to `in_progress`
  - resets other non-done items for the same day card from `in_progress` to `planned`

### Check-Ins

- `POST /api/team-tracker/:accountId/checkins`
  - body: `{ date, summary, status? }`

### Carry Forward

Optional for MVP if time allows:

- `POST /api/team-tracker/carry-forward`
  - body: `{ fromDate, toDate }`

Use Zod validation for all request bodies.

---

## 6. Backend Service Layer

Add a service such as:

- `server/src/services/team-tracker.service.ts`

Responsibilities:

- ensure a developer day row exists
- load board data for a given date
- group items into current / planned / done
- enforce single-current-item rule
- create custom items
- resolve Jira-linked item snapshots from existing issues table
- save check-ins and update `lastCheckInAt`
- compute stale flags based on a configurable threshold

Recommended rule location:

- stale computation can live in the service so the client receives consistent derived state

---

## 7. Frontend Structure

Recommended files:

- `client/src/components/team-tracker/TeamTrackerPage.tsx`
- `client/src/components/team-tracker/TrackerSummaryStrip.tsx`
- `client/src/components/team-tracker/TrackerBoard.tsx`
- `client/src/components/team-tracker/DeveloperTrackerCard.tsx`
- `client/src/components/team-tracker/DeveloperTrackerDrawer.tsx`
- `client/src/components/team-tracker/TrackerItemRow.tsx`
- `client/src/components/team-tracker/TrackerStatusPill.tsx`
- `client/src/components/team-tracker/AddTrackerItemForm.tsx`
- `client/src/hooks/useTeamTracker.ts`
- `client/src/hooks/useTeamTrackerMutations.ts`

Recommended integration changes:

- `client/src/App.tsx`
- `client/src/components/layout/Header.tsx`

---

## 8. Frontend UX Recommendations

### 8.1 Page Layout

Recommended structure:

1. Header with view switch and date selector
2. Summary strip for stale / blocked / at-risk / no-current filters
3. Scrollable grid or stacked list of developer cards
4. Right-side detail drawer for focused editing

### 8.2 Visual Direction

Stay within the current dashboard aesthetic:

- tactical / command-center styling
- dark layered surfaces
- cyan accent
- strong status color coding

The Team Tracker should feel like part of the product, not a disconnected mini-app.

### 8.3 Card Content Priority

On each developer card, prioritize in this order:

1. developer + status + stale signal
2. current item
3. next-up items
4. last check-in
5. notes preview

### 8.4 Interaction Design

MVP can use buttons and small forms instead of full drag-and-drop.

Recommended actions:

- `Set current`
- `Mark done`
- `Add note`
- `Add Jira item`
- `Add custom item`

Reordering can initially be handled with simple up/down controls if drag-and-drop feels too expensive for the first pass.

---

## 9. Query Strategy

Suggested query keys:

- `['team-tracker', date]`
- `['team-tracker', 'developer', accountId, date]` only if needed

On successful tracker mutations, invalidate:

- tracker queries for the active date

Do not invalidate unrelated dashboard data unless a mutation truly affects existing issue data.

---

## 10. Jira Linking Strategy

For Jira-linked items:

- selection should come from the already-synced local issues dataset
- use existing issue key, summary, priority, and assignee context
- store a title snapshot for stable rendering even if the issue is temporarily unavailable later

Possible implementation options:

1. fetch from existing `/api/issues`
2. add a lightweight issue search endpoint for tracker item linking

For MVP, reusing existing issues query data on the client is acceptable if performance remains reasonable.

---

## 11. Suggested Delivery Order

### Step 1: Data Layer

- add schema tables
- add migrations
- add shared types

### Step 2: Backend

- add service
- add routes
- add validation
- add tests for core service rules

### Step 3: Basic Page

- add app-level view switch
- create Team Tracker page shell
- load board data for today

### Step 4: Core Editing

- add developer cards
- add detail drawer
- add create / update item flows
- add check-in note flow

### Step 5: Polish

- add summary filters
- add stale highlighting
- refine mobile behavior
- add empty states and optimistic updates

---

## 12. Testing Plan

### Backend Tests

Add Vitest coverage for:

- day row creation
- item creation
- single-current-item enforcement
- check-in creation updates `lastCheckInAt`
- board loading groups items correctly
- inactive developers are excluded from the board

### Frontend Tests

Add Testing Library coverage for:

- view switch renders tracker page
- board renders developers
- setting current item updates the card
- adding custom item works
- stale / blocked / at-risk visual indicators render

---

## 13. Risks and Constraints

| Risk | Impact | Mitigation |
|---|---|---|
| No routing library currently exists | Navigation changes can sprawl | Keep MVP to a simple app-state view switch |
| Drag-and-drop adds complexity fast | Can delay delivery | Use explicit reorder controls first |
| Jira-linked item search can bloat UI | Harder item creation flow | Reuse existing synced issues for MVP |
| Over-modeling notes/history | Slows first release | Keep check-ins simple: timestamp + summary |
| Query invalidation mistakes | UI inconsistency | Isolate tracker query keys from existing dashboard keys |

---

## 14. Implementation Definition of Done

The feature is done when:

1. The app has a working Team Tracker view.
2. The view shows one daily card per active developer.
3. The lead can add Jira-linked and custom items.
4. The lead can set one current item per developer.
5. The lead can save follow-up notes with timestamps.
6. Data persists in SQLite.
7. Existing dashboard flows still work.
8. New backend and frontend tests pass.

