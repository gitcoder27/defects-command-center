# Product Requirements Document

## Developer Workspace

**Version:** 1.0  
**Date:** March 7, 2026  
**Status:** Draft for implementation

---

## 1. Overview

The current Team Tracker works well as a manager-owned operational workspace. It lets the lead track each developer's current work, planned tasks, check-ins, and follow-ups from one place.

The gap is that updates are still manager-driven. If a developer finishes one task, starts another, gets blocked, or wants to record progress, that change does not appear in the tracker until the manager updates it manually.

This phase adds a new **developer-facing workspace** so each developer can open their own page, update their own work state, and keep the manager dashboard current in near real time.

This is not a replacement for the existing manager dashboard. It is a connected self-service layer on top of the same tracker data.

---

## 2. Problem Statement

Current behavior:

- the manager can view and edit team tracker data
- developers do not have a self-serve page
- tracker freshness depends on manual manager updates
- the manager becomes the bottleneck for simple daily state changes

Desired behavior:

- each developer can access a personal workspace for their own day
- developers can update their own current task, planned work, progress, and blockers
- those updates appear in the manager's Team Tracker without duplicate entry
- the manager keeps oversight while developers handle routine status maintenance themselves

---

## 3. Goals

### Primary Goals

1. Give each developer a personal page for updating their daily work.
2. Keep manager and developer views synchronized through one shared source of truth.
3. Reduce the manager's manual maintenance burden for routine day-to-day updates.
4. Preserve the Team Tracker as the manager's operational command view.
5. Support lightweight internal authentication suitable for a small internal team.

### Secondary Goals

1. Make updates fast enough to be used throughout the day, not only at standup.
2. Encourage developers to record blockers and task switches when they happen.
3. Keep the frontend build separable from backend implementation work by defining clear contracts.

---

## 4. Non-Goals

- replacing Jira as the source of record for issue workflow
- exposing the full manager dashboard to developers
- giving developers access to edit other team members
- building enterprise-grade SSO in v1
- building timesheets, effort logging, or surveillance features
- adding rich analytics, notifications, or chat integrations in this phase

---

## 5. Product Direction

The system should now support two connected experiences:

- **Manager Workspace**
  - existing dashboard and Team Tracker
  - full team visibility
  - manager-only actions and private notes

- **Developer Workspace**
  - personal "My Day" experience
  - only the logged-in developer can edit their own work state
  - all updates reflect in the shared tracker seen by the manager

The product model is:

- one shared tracker dataset
- role-specific interfaces
- role-specific permissions

---

## 6. Authentication and Access

For v1, use **basic internal authentication**.

Requirements:

- each user must log in before accessing the developer workspace
- each developer must be mapped to exactly one developer identity in the tracker
- the system must know which logged-in user is performing the action
- a developer can only access and edit their own workspace
- the manager must retain access to the manager-facing workspace

This phase does not require external identity providers. It is acceptable for the first version to use simple internal credentials as long as access is not anonymous.

---

## 7. Roles and Permissions

### Manager

Can:

- view all developers
- edit all developer tracker data
- add or reorder tasks for any developer
- update status for any developer
- review check-ins and activity history
- see manager-only notes

### Developer

Can:

- access only their own page
- view their own planned, current, completed, and dropped work
- set one of their tasks as current
- mark their own work done or dropped
- add their own updates and check-ins
- add custom work items if needed
- update their own daily status
- indicate blocker or waiting state

Cannot:

- view other developers' pages
- edit other developers' data
- access manager-only notes
- access team-wide admin or settings controls

---

## 8. Data Ownership Rules

This separation is important for product clarity.

### Shared Operational Data

These fields should be visible in both manager and developer experiences:

- daily status
- current item
- planned items
- completed items
- dropped items
- developer-authored updates and check-ins
- last update time
- blocker / waiting indicators

### Manager-Only Data

These fields remain private to the manager experience:

- manager notes
- manager-only follow-up context
- private coaching or escalation notes

### Audit / Attribution Requirement

Once both manager and developers can update the same tracker, the system must preserve who made key updates. At minimum, the product should support actor-aware activity history for:

- status updates
- task state changes
- check-ins
- item additions

The frontend should assume actor attribution exists or will exist in the backend contract.

---

## 9. Core User Flows

### 9.1 Start of Day

Developer opens their workspace and:

- reviews today's planned work
- confirms or adjusts the current task
- adds any non-Jira work needed for the day
- posts a short opening update if needed

### 9.2 Task Switch

Developer completes or pauses one task and:

- marks the current task done or dropped
- sets the next task as current
- optionally adds a short context update

### 9.3 Midday Update

Developer records a quick progress update:

- status remains on track, or changes to at risk / blocked / waiting
- adds a short note about progress, risk, or dependency
- update appears in the manager tracker

### 9.4 Blocked / Needs Help

Developer marks themselves blocked or waiting and:

- records the blocker reason
- optionally flags that manager attention is needed
- manager can immediately see the updated state in Team Tracker

### 9.5 End of Day

Developer:

- marks completed work
- leaves unfinished items in planned state
- optionally adds a closing note
- manager can use the existing carry-forward flow the next day

---

## 10. Functional Requirements

### F1: Developer Login

The system must provide a login flow for internal users.

Required outcomes:

- authenticated access is required for developer workspace
- the app can identify the current user and their role
- the app can determine the linked developer account

### F2: My Day Workspace

Each developer must have a personal page showing:

- their name / identity
- today's status
- current task
- next planned tasks
- completed tasks
- dropped tasks if applicable
- recent updates / check-ins
- last update time

### F3: Task Management

The developer workspace must support:

- set task as current
- mark task done
- mark task dropped
- reorder planned tasks
- add custom task
- add Jira-linked task when allowed by product rules
- edit task note where applicable

### F4: Daily Status Updates

Developers must be able to set their daily state to:

- `on_track`
- `at_risk`
- `blocked`
- `waiting`
- `done_for_today`

### F5: Quick Check-Ins

Developers must be able to add short timestamped updates during the day.

These updates should be lightweight and fast to submit.

### F6: Shared Visibility

Any developer update in scope must be reflected in the manager Team Tracker without separate manual entry.

### F7: Private Manager Context

Manager-only notes must not be shown in the developer workspace.

### F8: Mobile-Friendly Internal Use

The developer workspace should be usable on laptop and phone-sized screens, since developers may update it from either.

---

## 11. Suggested v1 Scope

### Included

- internal login
- authenticated developer session
- one self-service workspace per developer
- read/write access for the logged-in developer to their own day
- daily status updates
- task state changes
- task queue management
- custom task creation
- quick check-ins
- reflection of changes in manager tracker

### Deferred

- enterprise SSO
- notifications and reminders
- Slack or Teams integration
- cross-day personal history views
- advanced analytics
- peer visibility

---

## 12. Acceptance Criteria

1. A developer can log in and reach their own workspace.
2. A developer cannot access another developer's workspace.
3. The developer can see their current, planned, completed, and dropped work for the selected day.
4. The developer can set one task as current.
5. The developer can mark a task done or dropped.
6. The developer can update their daily status.
7. The developer can submit a short check-in or progress update.
8. The manager's Team Tracker reflects those updates from the same underlying data.
9. Manager-only notes are not exposed in the developer-facing UI.
10. The developer workspace remains lightweight and usable for repeated updates throughout the day.

---

## 13. Dependencies on Existing System

This feature is intentionally built on top of the current Team Tracker capabilities already present in the app:

- per-developer daily tracker records
- planned and in-progress work items
- task completion and carry-forward model
- check-in history
- developer roster already synced into the local system

This phase extends the tracker from a manager-only workflow to a role-aware multi-user workflow.

---

## 14. Frontend Handoff

A separate frontend build brief is provided in:

- `docs/13-developer-workspace-frontend-handoff.md`

That document should be used by a frontend-focused implementation agent. It contains:

- developer-facing UI requirements
- states and interactions
- data visibility rules
- backend contract expectations needed for parallel frontend work
