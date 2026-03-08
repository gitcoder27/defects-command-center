# Frontend Requirement Handoff

## Manager Desk

**Date:** March 8, 2026  
**Audience:** Frontend implementation  
**Related docs:** `docs/15-manager-desk-requirements.md`

---

## 1. Purpose

This document defines the frontend-facing requirements for the new manager-only `Manager Desk` module.

It is intentionally focused on:

- user-facing product requirements
- page states and interactions
- permission boundaries
- information architecture needs
- backend contract details needed for parallel UI development

It intentionally does not prescribe the final visual design. The frontend implementation should decide the best UI direction.

---

## 2. Product Summary

Build a new manager-only workspace called **Manager Desk**.

This page is the manager's personal operating surface for daily work that does not fit cleanly into either the Defects dashboard or Team Tracker.

The page should help the manager capture and manage:

- analysis work
- design work
- team and cross-functional meetings
- follow-ups
- waiting-on items
- decisions and outcomes

This is a personal manager workspace. It should feel fast, scannable, and highly usable throughout the day.

---

## 3. Route and Navigation Requirements

The frontend should support a new top-level manager route.

Suggested route:

- `/manager-desk`

Requirements:

- managers can navigate to it from the app shell
- developers do not see this route in navigation
- unauthorized access should show a guarded error or redirect behavior consistent with the existing app

This module should be treated as a top-level destination, not as a subpanel hidden inside another page.

---

## 4. Core Page Scope

The frontend should support one primary manager page for a selected date.

The page must cover:

- quick capture
- daily summary
- inbox
- today's active / planned items
- meetings / agenda items
- waiting-on and overdue follow-ups
- completed items
- item detail / edit interaction

The exact layout is up to the frontend implementation.

---

## 5. Required Information on Screen

### Header / Day Context

Show:

- page title such as `Manager Desk`
- selected date
- previous / next day navigation
- go-to-today action
- manager identity and session controls as appropriate

### Daily Summary

Show summary signals for the selected day:

- open items
- inbox items
- in-progress items
- waiting items
- overdue follow-ups
- meetings today
- completed today

### Quick Capture

A lightweight creation entry point must exist near the top of the page.

Quick capture should allow:

- short title input
- optional kind selection
- optional category selection
- one-click create into `inbox`

The frontend can decide whether to expose more fields inline or in a secondary detail editor.

### Item Collections

The page must surface at least these operational groupings:

- inbox
- planned / active work
- meetings
- waiting / follow-up
- completed

The frontend may merge or rearrange these visually, but the behavior must still support those groupings.

### Item Detail / Edit Surface

The manager must be able to open an item and edit:

- title
- kind
- category
- status
- priority
- planned start / end time
- follow-up date
- participants / counterpart text
- context note
- next action
- outcome
- linked defects
- linked developers
- external text labels when needed

The UI may use a drawer, modal, inline expansion, split view, or other pattern.

---

## 6. Required User Actions

The manager must be able to:

1. load Manager Desk for a selected date
2. navigate across days
3. quick-capture a new item
4. create a fully structured item
5. edit any item field
6. change item status
7. mark item done
8. cancel an item
9. move an item out of inbox into active planning
10. link an item to defects
11. link an item to developers
12. unlink context references
13. filter the page by status, kind, category, or due state
14. carry unfinished items into another day
15. delete an item if it was created by mistake

---

## 7. Visibility and Permission Rules

The frontend must assume:

- only `manager` users may access this module
- `developer` users must not see navigation to it
- developer-role users must not receive manager desk content in their UI
- Manager Desk content is private manager data in this phase

The frontend should use the authenticated session contract to enforce visibility and route handling.

---

## 8. Required Interaction States

The UI must account for:

### Loading

- initial page load
- date change load
- background refresh

### Empty Day

If there are no items for the selected date:

- show summary state
- show quick capture
- show an inviting but clear empty message

### Empty Section

If only some sections are empty:

- show helpful empty states for inbox, meetings, waiting, or completed areas

### Error

Support recoverable error handling for:

- failed initial load
- failed quick capture
- failed item update
- failed carry forward
- failed lookup search for link attachment

### Unauthorized

If the session is not a manager session:

- do not render manager desk content
- show a guarded state or redirect consistent with app behavior

---

## 9. UX Requirements

The visual design is intentionally left to the frontend implementation, but the following outcomes are required:

- the current day should be understandable quickly
- capture should be faster than opening an external notes app
- meeting items should not feel like generic tasks
- waiting-on items should stand out clearly
- editing should feel lightweight, not form-heavy
- the page should remain usable under frequent small updates throughout the day
- keyboard-friendly interactions are strongly preferred for quick capture and editing

The page should feel like a premium manager workflow surface, not a CRUD table.

---

## 10. Recommended Information Architecture

The frontend should support a structure equivalent to:

1. Header / date controls
2. Summary strip
3. Quick capture
4. Priority / planned work area
5. Meeting area
6. Waiting / follow-up area
7. Inbox
8. Completed area
9. Item detail / editing surface

The order and visual grouping may be changed if the frontend implementation finds a better experience.

---

## 11. Data Model Expectations for Frontend

The frontend should build against the following logical shapes.

These shapes can live in `shared/types.ts` or frontend-local types until backend contracts are finalized.

### 11.1 Enums

```ts
export type ManagerDeskItemKind =
  | "action"
  | "meeting"
  | "decision"
  | "waiting";

export type ManagerDeskCategory =
  | "analysis"
  | "design"
  | "team_management"
  | "cross_team"
  | "follow_up"
  | "escalation"
  | "admin"
  | "planning"
  | "other";

export type ManagerDeskStatus =
  | "inbox"
  | "planned"
  | "in_progress"
  | "waiting"
  | "done"
  | "cancelled";

export type ManagerDeskPriority =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type ManagerDeskLinkType =
  | "issue"
  | "developer"
  | "external_group";
```

### 11.2 Link Shape

```ts
export interface ManagerDeskLink {
  id: number;
  itemId: number;
  linkType: ManagerDeskLinkType;
  issueKey?: string;
  developerAccountId?: string;
  externalLabel?: string;
  displayLabel: string;
  createdAt: string;
}
```

### 11.3 Item Shape

```ts
export interface ManagerDeskItem {
  id: number;
  dayId: number;
  title: string;
  kind: ManagerDeskItemKind;
  category: ManagerDeskCategory;
  status: ManagerDeskStatus;
  priority: ManagerDeskPriority;
  participants?: string;
  contextNote?: string;
  nextAction?: string;
  outcome?: string;
  plannedStartAt?: string;
  plannedEndAt?: string;
  followUpAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  links: ManagerDeskLink[];
}
```

### 11.4 Day Summary Shape

```ts
export interface ManagerDeskSummary {
  totalOpen: number;
  inbox: number;
  planned: number;
  inProgress: number;
  waiting: number;
  overdueFollowUps: number;
  meetings: number;
  completed: number;
}
```

### 11.5 Day Response Shape

```ts
export interface ManagerDeskDayResponse {
  date: string;
  items: ManagerDeskItem[];
  summary: ManagerDeskSummary;
}
```

### 11.6 Lookup Shapes

```ts
export interface ManagerDeskIssueLookupItem {
  jiraKey: string;
  summary: string;
  priorityName: string;
  statusName: string;
  assigneeName?: string;
}

export interface ManagerDeskDeveloperLookupItem {
  accountId: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
}
```

---

## 12. Backend Contract Expectations

The frontend should be able to build in parallel against the following route contract.

The exact implementation can vary slightly, but route behavior and payload shape should remain compatible.

All routes below are manager-only.

### 12.1 Load Manager Desk Day

`GET /api/manager-desk?date=YYYY-MM-DD`

Response:

```json
{
  "date": "2026-03-08",
  "items": [
    {
      "id": 41,
      "dayId": 9,
      "title": "Prepare discussion points for onshore design sync",
      "kind": "meeting",
      "category": "design",
      "status": "planned",
      "priority": "high",
      "participants": "Onshore Design Team",
      "contextNote": "Need alignment on API edge cases before implementation starts.",
      "nextAction": "Review open assumptions from yesterday.",
      "outcome": "",
      "plannedStartAt": "2026-03-08T15:00:00.000Z",
      "plannedEndAt": "2026-03-08T15:30:00.000Z",
      "followUpAt": "2026-03-08T17:00:00.000Z",
      "completedAt": null,
      "createdAt": "2026-03-08T09:10:00.000Z",
      "updatedAt": "2026-03-08T09:15:00.000Z",
      "links": [
        {
          "id": 4,
          "itemId": 41,
          "linkType": "issue",
          "issueKey": "PROJ-321",
          "displayLabel": "PROJ-321",
          "createdAt": "2026-03-08T09:10:00.000Z"
        },
        {
          "id": 5,
          "itemId": 41,
          "linkType": "external_group",
          "externalLabel": "Onshore Design Team",
          "displayLabel": "Onshore Design Team",
          "createdAt": "2026-03-08T09:10:00.000Z"
        }
      ]
    }
  ],
  "summary": {
    "totalOpen": 7,
    "inbox": 2,
    "planned": 2,
    "inProgress": 1,
    "waiting": 2,
    "overdueFollowUps": 1,
    "meetings": 3,
    "completed": 4
  }
}
```

### 12.2 Quick Capture or Full Create

`POST /api/manager-desk/items`

Minimum accepted body:

```json
{
  "date": "2026-03-08",
  "title": "Follow up with Rahul on blocker"
}
```

Full body:

```json
{
  "date": "2026-03-08",
  "title": "Follow up with Rahul on blocker",
  "kind": "waiting",
  "category": "follow_up",
  "status": "inbox",
  "priority": "high",
  "participants": "Rahul",
  "contextNote": "Need ETA after dependency issue surfaced in standup.",
  "nextAction": "Ping after lunch if no update.",
  "plannedStartAt": "2026-03-08T13:30:00.000Z",
  "followUpAt": "2026-03-08T15:00:00.000Z",
  "links": [
    { "linkType": "developer", "developerAccountId": "abc123" },
    { "linkType": "issue", "issueKey": "PROJ-221" }
  ]
}
```

Response:

- `201 Created`
- body returns the created `ManagerDeskItem`

### 12.3 Update Item

`PATCH /api/manager-desk/items/:itemId`

Allowed fields:

- `title`
- `kind`
- `category`
- `status`
- `priority`
- `participants`
- `contextNote`
- `nextAction`
- `outcome`
- `plannedStartAt`
- `plannedEndAt`
- `followUpAt`

Response:

- updated `ManagerDeskItem`

### 12.4 Delete Item

`DELETE /api/manager-desk/items/:itemId`

Response:

```json
{ "deleted": true }
```

### 12.5 Add Link to Item

`POST /api/manager-desk/items/:itemId/links`

Body:

```json
{ "linkType": "issue", "issueKey": "PROJ-221" }
```

or

```json
{ "linkType": "developer", "developerAccountId": "abc123" }
```

or

```json
{ "linkType": "external_group", "externalLabel": "Onshore Design Team" }
```

Response:

- created `ManagerDeskLink`

### 12.6 Remove Link

`DELETE /api/manager-desk/items/:itemId/links/:linkId`

Response:

```json
{ "deleted": true }
```

### 12.7 Carry Forward Items

`POST /api/manager-desk/carry-forward`

Body:

```json
{
  "fromDate": "2026-03-08",
  "toDate": "2026-03-09",
  "itemIds": [41, 43]
}
```

Response:

```json
{
  "created": 2
}
```

If `itemIds` is omitted, backend may carry all unfinished items except `done` and `cancelled`.

### 12.8 Search / Lookup for Attach Flows

`GET /api/manager-desk/lookups/issues?q=design`

Response:

```json
{
  "items": [
    {
      "jiraKey": "PROJ-321",
      "summary": "Investigate design gap in review flow",
      "priorityName": "High",
      "statusName": "In Progress",
      "assigneeName": "Alice Smith"
    }
  ]
}
```

`GET /api/manager-desk/lookups/developers?q=rahul`

Response:

```json
{
  "items": [
    {
      "accountId": "abc123",
      "displayName": "Rahul Sharma",
      "email": "rahul@example.com",
      "avatarUrl": "https://..."
    }
  ]
}
```

---

## 13. Validation Expectations

The frontend should assume backend validation on at least:

- valid `date` query / body format as `YYYY-MM-DD`
- enum safety for kind, category, status, priority
- title required and length-limited
- `plannedEndAt` not earlier than `plannedStartAt`
- link payload must match link type
- manager-only authorization on all routes

The frontend should still apply friendly client-side validation where practical.

---

## 14. Suggested Implementation Notes for Frontend

The frontend is free to choose the final component structure.

Implementation should assume:

- incremental mutation flows are common
- optimistic or near-optimistic UX may be beneficial
- the page should support frequent item creation and lightweight edits
- section-level or item-level loading states may feel better than heavy full-page refreshes after the initial load

This page is interaction-heavy. Smoothness matters as much as visual quality.

---

## 15. Acceptance Criteria

1. A manager can open `/manager-desk` and load day data successfully.
2. A manager can create a quick-capture item with only a short title.
3. A manager can edit an item into a structured meeting, action, decision, or waiting item.
4. A manager can link items to issues and developers through lookup flows.
5. A manager can see and act on waiting / overdue items.
6. A manager can carry open work into another day.
7. A developer-role user does not receive access to the page.
