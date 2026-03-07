# Product Requirements Document (PRD)

## Team Workload Tracker

**Version:** 1.0  
**Date:** March 7, 2026  
**Author:** Engineering Lead  
**Status:** Approved for Implementation

---

## 1. Problem Statement

### Current Situation

The current dashboard already helps the lead triage defects and view Jira-based workload, but it does not support active day management of the team. It can show who has defects assigned, but it cannot answer the operational questions the lead needs throughout the day:

- What did each person plan to work on today?
- What are they working on right now?
- What is next in their queue?
- When was the last follow-up?
- Which people need a check-in now?
- What is blocked, drifting, or at risk?

The lead currently has to track this through memory, chat threads, notes, or a separate spreadsheet.

### Desired Outcome

A dedicated **Team Tracker** inside the Defect Command Center that lets the lead manage each team member's daily plan, current work, next-up queue, status, and follow-up notes from one place.

This tracker is a **personal manager workspace**. It is optimized for the lead to monitor the team during the day, not to replace Jira as the source of record.

---

## 2. Goals

### Primary Goals

1. Give the lead a single operational view of what each team member planned for today.
2. Show the current task for each person at a glance.
3. Make follow-ups easy by storing last update time and manager notes.
4. Surface who needs attention now based on stale updates, blockers, or risk.
5. Support both Jira-linked work and non-Jira work.
6. Preserve enough daily history to review what happened and continue the next day.

### Non-Goals

- Replacing Jira as the source of record for issue status.
- Building a collaborative multi-user system in MVP.
- Sprint planning, backlog management, or long-term capacity planning.
- Full timesheet or effort tracking.
- Automatic employee surveillance or activity inference.

---

## 3. Primary User

### Engineering Team Lead

- Uses the command center as a personal operational dashboard.
- Follows up with team members multiple times a day.
- Needs fast scanning, low-friction note taking, and accurate current-state tracking.
- Wants a view that combines Jira context with manager-owned tracking fields.

---

## 4. Product Principles

| Principle | Description |
|---|---|
| Scannable | The lead should understand the team's current state in under 10 seconds. |
| Current-state first | Current work, blockers, and stale follow-ups are more important than static load numbers. |
| Manager-owned | Tracker data is private to the lead unless expanded later. |
| Flexible | A planned item can be Jira-linked or custom work. |
| Minimal friction | Updating a team member should take a few clicks and a short note, not a full form. |
| History-aware | The system should preserve daily context instead of overwriting it blindly. |

---

## 5. Core Concepts

### 5.1 Developer Day Card

Each tracked developer gets a daily card showing:

- identity
- current status
- last check-in time
- current work
- planned queue for today
- completed items for today
- blockers / risks
- manager notes

### 5.2 Work Item Types

A tracked item can be one of two types:

1. **Jira-linked item**
   - references an existing synced Jira issue
   - shows issue key, title, priority, and due date context
2. **Custom item**
   - supports non-defect work such as meetings, investigations, support, KT, release tasks, or interruptions

### 5.3 Team Member Status

Each developer has one high-level daily state:

- `on_track`
- `at_risk`
- `blocked`
- `waiting`
- `done_for_today`

### 5.4 Item State

Each planned item has a workflow state:

- `planned`
- `in_progress`
- `done`
- `dropped`

Only one item should be marked `in_progress` for a developer at a time.

---

## 6. Primary Workflows

### 6.1 Morning Planning

```
Open Team Tracker
    → Review all developers
    → Add or confirm today's planned items for each person
    → Set one item as current where appropriate
    → Add expected risk notes if needed
```

### 6.2 Midday Follow-Up

```
Open Team Tracker
    → Scan "needs follow-up" indicators
    → Open a developer detail drawer
    → Update current item, status, and notes based on the conversation
    → Reorder next-up items if priorities changed
    → Save a timestamped check-in
```

### 6.3 Interruptions / Replanning

```
Lead gets new information
    → Move current item back to planned or mark blocked
    → Add a new urgent item
    → Mark it current
    → Capture the reason in manager notes
```

### 6.4 End-of-Day Review

```
Open Team Tracker
    → Review completed vs remaining work
    → Capture final status notes
    → Optionally carry unfinished planned items into the next day
```

---

## 7. Feature Specifications

### F1: Team Tracker View

Add a dedicated top-level view called **Team Tracker**.

The existing workload bar remains as a summary component in the main dashboard, but the tracker becomes the operational workspace for daily team management.

### F2: Follow-Up Summary Strip

Purpose: show who needs attention immediately.

Display:

- stale follow-up count
- blocked developers
- at-risk developers
- waiting developers
- people with no current item

Behavior:

- clicking a summary chip filters the board
- stale logic should be time-based and configurable in code for MVP

### F3: Team Tracker Board

Purpose: central view of all team members.

Each developer card should show:

- developer name
- status pill
- last check-in time
- current item
- next planned items
- completed count
- quick notes preview
- visual indicator if the card is stale, blocked, or at risk

Behavior:

- cards are sortable or reorderable later; simple fixed order is acceptable for MVP
- clicking a card opens a detail drawer
- quick actions should exist for:
  - set status
  - set current item
  - mark item done
  - add follow-up note

### F4: Developer Detail Drawer

Purpose: full management context for one person.

Display:

- developer identity
- current status
- last check-in timestamp
- list of planned items
- completed items
- manager notes
- check-in history for the selected day

Actions:

- add Jira-linked item
- add custom item
- reorder planned items
- mark one item as current
- mark item done / dropped
- update status
- save check-in note

### F5: Jira Linkage

The tracker must support Jira context without being limited by it.

Rules:

- Jira-linked items are selected from existing synced issues already available in the app.
- Custom items must be first-class and not treated as second-rate.
- Jira issue changes in Jira do not delete manager tracking state.
- Tracker state is local app data, not written back to Jira except where existing dashboard features already do so.

### F6: Daily History

Purpose: preserve manager context over time.

MVP expectations:

- each day has its own tracker state
- check-ins are timestamped
- unfinished items can be carried to the next day

Future:

- daily history view
- previous-day comparisons
- end-of-day snapshot summary

---

## 8. MVP Scope

### Included in MVP

- Dedicated Team Tracker view
- One card per active developer
- Daily planned items
- Current item tracking
- Jira-linked and custom work items
- Developer-level status
- Last check-in timestamp
- Manager notes and timestamped check-ins
- Basic stale highlighting
- Detail drawer for editing
- Persisted data in local SQLite

### Deferred to Phase 2

- Team members updating their own status
- Drag-and-drop polish
- Rich analytics and charts
- Automated daily rollover UX
- Slack or chat integrations
- Notifications
- Per-developer historical trends

---

## 9. Success Criteria

The feature is successful if the lead can:

1. Open the Team Tracker and immediately see what each person is working on.
2. Record a follow-up in under 15 seconds.
3. Know who has not been checked recently.
4. Track both Jira and non-Jira work in one place.
5. Use the tracker throughout the day without needing a separate spreadsheet or notes app.

---

## 10. Acceptance Criteria

1. A new Team Tracker view exists and is reachable from the main app shell.
2. The view loads all active developers from the existing tracked team list.
3. Each developer can have multiple planned items for a selected day.
4. Each planned item can be either Jira-linked or custom.
5. Exactly one item per developer can be `in_progress` at a time.
6. The lead can save a check-in note with timestamp for a developer.
7. The board visually distinguishes `blocked`, `at_risk`, and stale follow-up states.
8. Tracker data persists across refreshes and app restarts.
9. Existing dashboard functionality remains intact.

