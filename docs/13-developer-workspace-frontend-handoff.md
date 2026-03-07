# Frontend Requirement Handoff

## Developer Workspace

**Date:** March 7, 2026  
**Audience:** Frontend implementation  
**Related product doc:** `docs/12-developer-workspace-requirements.md`

---

## 1. Purpose

This document defines what the frontend needs to build for the new developer-facing workspace.

It is intentionally focused on:

- user-facing requirements
- page structure
- states and interactions
- permission boundaries
- backend contract expectations needed to build the frontend in parallel

It intentionally does not prescribe full backend implementation design.

---

## 2. Product Summary

Build a developer-facing workspace, referred to in the UI as **My Day**.

This page is for the logged-in developer to manage their own work for the day. It uses the same underlying tracker data that powers the manager Team Tracker, but the interface is scoped to self-management rather than team oversight.

Key behavior:

- a developer logs in
- sees only their own daily workspace
- updates tasks, status, and check-ins
- changes are reflected in the manager tracker

---

## 3. Page Scope

The frontend should support one primary page:

- `My Day`

This page should cover:

- today's work state
- task switching
- check-ins
- blockers
- completed work visibility

The frontend should not expose:

- manager-only notes
- other developers
- settings/admin controls
- full manager dashboard behavior

---

## 4. Required Information on Screen

### Header / Identity

Show:

- page title such as `My Day`
- developer display name
- current date or selected day
- login/session state
- logout action

### Daily Status

Show current status with clear selectable states:

- `on_track`
- `at_risk`
- `blocked`
- `waiting`
- `done_for_today`

### Current Work

Show one primary current task area:

- current item title
- Jira key when applicable
- note/context when available
- action to mark done
- action to drop/pause when allowed

If no current item exists:

- show a clear empty state
- allow the developer to select one from planned items

### Planned Work

Show the developer's queue for the day:

- ordered list of planned items
- Jira-linked and custom items both supported
- actions to set an item as current
- ability to reorder planned items
- ability to edit per-item note if included in contract

### Completed Work

Show work completed today:

- completed item list
- completion timestamp if available

### Dropped / Paused Work

If tracked, show a separate section for dropped items so developers can understand what was explicitly paused or abandoned during the day.

### Check-Ins / Updates

Show:

- quick input for short progress update
- recent updates list with timestamps
- last update time

### Add Work

The UI must support adding:

- custom task
- Jira-linked task when allowed by backend contract

---

## 5. Required User Actions

The developer must be able to:

1. log in and enter the workspace
2. load their day view
3. change daily status
4. set one planned item as current
5. mark current or planned item done
6. mark item dropped
7. reorder planned items
8. add a short check-in / progress update
9. add a custom task
10. add a Jira-linked task if enabled
11. log out

---

## 6. Permissions and Visibility Rules

The frontend must assume the following boundaries:

- the logged-in developer can only operate on their own workspace
- manager-only notes are never shown
- any role-specific controls that belong only in the manager experience must be hidden
- the UI should not offer actions that modify other developers

If the backend returns role/session details, the frontend should use them to enforce visibility and navigation.

---

## 7. UX Requirements

The page should feel lightweight and fast to update.

Important UX goals:

- common updates should take only a few clicks
- the current task should be visually dominant
- status and blocker state should be easy to change
- check-ins should not require a large form
- mobile and laptop layouts should both be usable

The frontend can choose the final visual treatment, but the experience should avoid feeling like a heavy admin console.

---

## 8. Page States

The frontend should account for all of the following states.

### Loading State

Show a full-page loading state while session and initial day data are being resolved.

### Logged-Out State

Show the login form when no valid session exists.

### Empty Day State

If there are no tasks yet for the day:

- show status
- show quick check-in input
- show add-task actions
- show a clear message such as "No tasks planned yet"

### No Current Task State

If planned items exist but none is in progress:

- show a warning or neutral reminder
- make it easy to set one planned item as current

### Error State

Show inline error handling for:

- login failure
- session expiration
- failed task update
- failed check-in submission
- failed day load

The page should support retry where practical.

---

## 9. Recommended Information Architecture

The frontend should organize the page around the following content blocks:

1. Header / session
2. Status summary
3. Current task
4. Planned queue
5. Add task action
6. Quick update / check-in
7. Completed work
8. Dropped work if present
9. Recent activity / updates

The exact component structure is up to the frontend implementation.

---

## 10. Backend Contract Expectations

The frontend should be able to build independently against the following logical contract.

The exact route names may vary slightly, but the behavior and payload shape should match this document.

### 10.1 Session / Auth

The frontend needs a minimal authenticated session contract.

Suggested endpoints:

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

Minimum session response fields needed by frontend:

```ts
interface AuthSessionResponse {
  user: {
    accountId: string;
    displayName: string;
    role: "manager" | "developer";
  };
}
```

Frontend assumptions:

- `accountId` identifies the logged-in developer
- `role` controls whether the UI should show developer-only or manager navigation

### 10.2 My Day Load

The frontend needs one endpoint to load the logged-in developer's day view.

Suggested endpoint:

- `GET /api/my-day?date=YYYY-MM-DD`

Expected response shape:

```ts
interface MyDayResponse {
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

The frontend may reuse the existing tracker item and check-in shapes if shared types are extended from the current tracker model.

### 10.3 Update Daily Status

Suggested endpoint:

- `PATCH /api/my-day`

Suggested request body:

```ts
{
  date: string;
  status?: "on_track" | "at_risk" | "blocked" | "waiting" | "done_for_today";
}
```

### 10.4 Add Task

Suggested endpoint:

- `POST /api/my-day/items`

Suggested request body:

```ts
{
  date: string;
  itemType: "jira" | "custom";
  jiraKey?: string;
  title: string;
  note?: string;
}
```

### 10.5 Update Task

Suggested endpoint:

- `PATCH /api/my-day/items/:itemId`

Supported fields needed by frontend:

```ts
{
  title?: string;
  note?: string;
  state?: "planned" | "in_progress" | "done" | "dropped";
  position?: number;
}
```

### 10.6 Set Current Task

Suggested endpoint:

- `POST /api/my-day/items/:itemId/set-current`

Frontend assumption:

- only one item can be current at a time
- backend enforces this rule

### 10.7 Add Check-In

Suggested endpoint:

- `POST /api/my-day/checkins`

Suggested request body:

```ts
{
  date: string;
  summary: string;
  status?: "on_track" | "at_risk" | "blocked" | "waiting" | "done_for_today";
}
```

### 10.8 Optional: Jira Task Picker Data

If Jira-linked tasks are supported in the developer page, the frontend needs a searchable list or lookup source.

Possible options:

- reuse an existing issues endpoint with developer-relevant filtering
- provide a dedicated lightweight search endpoint for eligible Jira issues

Minimum data needed by frontend for selection:

```ts
interface JiraTaskOption {
  jiraKey: string;
  summary: string;
  priorityName: string;
  dueDate?: string;
  developmentDueDate?: string;
}
```

---

## 11. Shared Type Expectations

The frontend can be developed independently if the backend exposes shapes compatible with the existing tracker model.

Minimum item shape:

```ts
interface TrackerWorkItem {
  id: number;
  dayId: number;
  itemType: "jira" | "custom";
  jiraKey?: string;
  jiraPriorityName?: string;
  jiraDueDate?: string;
  title: string;
  state: "planned" | "in_progress" | "done" | "dropped";
  position: number;
  note?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

Minimum check-in shape:

```ts
interface TrackerCheckIn {
  id: number;
  dayId: number;
  summary: string;
  createdAt: string;
  authorType?: "manager" | "developer";
  authorAccountId?: string;
}
```

The frontend should not depend on manager-only fields being present in the developer response.

---

## 12. Interaction Rules

The frontend should assume these behavioral rules:

- exactly one current item at a time
- planned items are ordered
- done items are read as completed work, not current candidates
- dropped items are separate from completed work
- check-ins are append-only activity entries
- manager-only notes are excluded from the developer contract

---

## 13. Frontend Acceptance Criteria

1. A logged-out user sees a login screen.
2. A logged-in developer sees only their own `My Day` workspace.
3. The page renders current, planned, completed, and dropped work correctly.
4. The developer can change status and see the UI update after save.
5. The developer can set a planned item as current.
6. The developer can mark an item done or dropped.
7. The developer can submit a check-in and see it appear in recent updates.
8. The UI does not expose manager-only notes or team-wide controls.
9. The page is usable on both desktop and mobile widths.
10. The frontend can be developed against mocked responses matching this contract without requiring backend implementation details.

---

## 14. Notes for Parallel Development

To keep frontend work independent:

- do not couple the UI to database schema details
- build against the response shapes in this document
- treat route names as adjustable, but keep payload contracts stable
- assume backend enforces authorization and single-current-item rules

If backend naming differs later, the frontend adapter layer should absorb those differences rather than rewriting page components.
