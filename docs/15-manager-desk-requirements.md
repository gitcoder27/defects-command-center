# Product Requirements Document

## Manager Desk

**Version:** 1.0  
**Date:** March 8, 2026  
**Status:** Draft for implementation

---

## 1. Overview

The Defects Command Center already covers two important operational layers:

- `Defects`: issue-level tracking and triage
- `Team Tracker`: team-level daily execution tracking

What is still missing is the manager's own operational workspace.

Throughout the day, the manager must handle a mix of work that is not captured well by the current system:

- defect analysis to perform personally
- design review and preparation work
- internal team meetings
- onshore / cross-functional meetings
- follow-ups with developers
- decisions, escalations, and waiting-on items

Today, that work is likely spread across memory, chat, meeting notes, personal reminders, and ad hoc lists. This creates fragmentation and makes it easy to miss follow-ups, lose meeting outputs, or forget why a decision was made.

This phase adds a new manager-only module called **Manager Desk**.

Manager Desk is a personal management operating system inside the existing application. It is not meant to replace Jira, a calendar system, or the current team tracker. Its purpose is to give the manager one structured place to capture, plan, review, and continue the work they personally own throughout the office day.

---

## 2. Problem Statement

Current product behavior answers:

- what defects exist
- which developers are carrying work
- what the team is working on today

Current product behavior does not answer:

- what the manager personally needs to do today
- which meetings require preparation or follow-up
- which analysis or design tasks are still pending
- what decisions were taken and why
- what is waiting on others
- what must be carried into tomorrow

This gap matters because manager work is operational but not purely defect-centric or developer-centric. It includes both execution and coordination. Without a dedicated workspace, the manager remains dependent on external notes or memory even though the dashboard already holds much of the relevant surrounding context.

---

## 3. Product Goal

Create a new manager-only workspace that lets the manager:

- capture work the moment it appears
- plan the day without leaving the application
- connect manager work to defects, developers, and meetings
- record decisions and outcomes
- track waiting-on and follow-up items
- review the day and carry work forward cleanly

The desired result is that the manager can use the Defects Command Center as their primary operational home during the day, not only as a defect dashboard.

---

## 4. Non-Goals

This phase does not aim to build:

- a replacement for Jira issue workflow
- a replacement for Outlook/Google Calendar
- a large project management suite
- a general-purpose notes application
- team-visible manager notes by default
- enterprise collaboration or commenting for many managers

The Manager Desk should stay focused on the personal operational workflow of a single manager in this application.

---

## 5. Product Principles

| Principle | Description |
|---|---|
| Action-first | The system should capture what the manager needs to do next, not only what they observed. |
| Scannable | The manager should understand today's state in under 10 seconds. |
| Low-friction capture | New items must be capturable quickly, especially during meetings or interruptions. |
| Context-linked | Items should link to defects, developers, or external groups when useful. |
| Continuity over clutter | The page should preserve history and carry-forward context without becoming a dumping ground. |
| Flexible structure | Analysis, meeting prep, follow-up, decision, and waiting-on items must all fit naturally. |
| Private by default | This is a manager-owned workspace unless expanded later. |

---

## 6. Core Concepts

### 6.1 Manager Day

Each date should have a manager-owned daily workspace containing:

- today's focus items
- today's planned meetings
- today's follow-ups
- waiting-on items relevant to the day
- decisions or outcomes recorded that day
- quick-capture / inbox items that still need sorting

### 6.2 Manager Desk Item

The central object in the system is a **Manager Desk Item**.

Every item should support:

- title
- item kind
- work category
- status
- priority
- time or follow-up date
- short context
- next action
- outcome / resolution text when completed
- links to related defects and/or developers

### 6.3 Item Kinds

An item kind describes the operational shape of the work.

Required item kinds:

- `action`
- `meeting`
- `decision`
- `waiting`

Meaning:

- `action`: work the manager needs to do
- `meeting`: a conversation, sync, review, or discussion that may need agenda and follow-up
- `decision`: an important conclusion or call that should be preserved
- `waiting`: something blocked on another person or team

### 6.4 Work Categories

Work category is a second dimension used for filtering and reporting.

Required categories:

- `analysis`
- `design`
- `team_management`
- `cross_team`
- `follow_up`
- `escalation`
- `admin`
- `planning`
- `other`

### 6.5 Item Status

Required statuses:

- `inbox`
- `planned`
- `in_progress`
- `waiting`
- `done`
- `cancelled`

Notes:

- `inbox` is intentionally different from `planned`; it means captured but not yet organized
- `waiting` can be used for any item that is blocked on an external dependency
- `done` items should preserve outcome context

### 6.6 Linked Context

Each manager item may optionally link to:

- one or more Jira defects
- one or more developers / team members
- a free-text external group or counterpart, such as `Onshore Design Team`

This is important so the manager's personal work stays connected to the existing dashboard context.

---

## 7. Primary User

### Engineering Manager / Team Lead

Characteristics:

- manages defects and team execution throughout the day
- attends multiple internal and cross-functional meetings
- performs their own analysis and design review work
- needs a personal operational view, not only a team view
- prefers quick updates and structured follow-up over long-form note taking

---

## 8. Primary Workflows

### 8.1 Quick Capture During the Day

```
New work appears
    → manager quickly captures a short title
    → item lands in inbox
    → later assigns kind, category, status, links, and follow-up date
```

Examples:

- analyze DEF-241 root cause
- prepare questions for design sync
- follow up with Rahul after lunch
- note decision from onshore meeting

### 8.2 Morning Planning

```
Open Manager Desk
    → review inbox and carry-forward items
    → pick top priorities for today
    → place meetings and follow-ups into today's agenda
    → identify waiting items that need chasing
```

### 8.3 Meeting Execution

```
Open meeting item
    → review agenda/context
    → capture discussion notes or decision summary
    → create follow-up actions or waiting items
    → mark meeting done with outcome
```

### 8.4 Follow-Up and Coordination

```
Manager sees item due now
    → opens linked defect / developer context
    → records update or next action
    → keeps item in waiting or marks done
```

### 8.5 End-of-Day Closure

```
Open Manager Desk
    → review completed, waiting, and still-open work
    → add short day-end note if needed
    → carry unfinished items into next day
```

---

## 9. Functional Requirements

### F1: Dedicated Top-Level Manager Module

Add a new top-level manager-only workspace called **Manager Desk**.

Requirements:

- reachable from the main application shell for managers
- not visible to developer-role users
- treated as a first-class module alongside the existing dashboard and Team Tracker

### F2: Daily Manager Workspace

The page must load for a selected date and show:

- today's priority view
- inbox items
- planned items / agenda items
- waiting items
- completed items
- key summary counts

The manager must be able to move across days and review history.

### F3: Quick Capture

The system must support rapid capture of new work with minimal required fields.

Minimum capture requirements:

- title
- date
- default status of `inbox`

The manager should be able to enrich the item later.

### F4: Structured Item Editing

The manager must be able to create and edit items with:

- kind
- category
- status
- priority
- planned start / end time when relevant
- follow-up date when relevant
- context note
- next action
- outcome note
- links to defects and developers

### F5: Meeting Support

Meeting items must support:

- meeting title
- participants / counterpart text
- optional agenda
- optional start / end time
- discussion or outcome note
- follow-up actions created from the meeting

The system does not need calendar sync in this phase.

### F6: Decision Capture

Decision items must support preserving:

- what was decided
- related context
- related defects or people
- date/time
- follow-up if the decision requires action

### F7: Waiting-On Queue

The system must make waiting items highly visible.

A waiting item should support:

- who or what the manager is waiting on
- due / follow-up date
- linked defect or developer if applicable
- escalation or risk note when applicable

### F8: Cross-Linking With Existing Modules

The manager must be able to link desk items to:

- synced Jira defects already present in the app
- tracked developers / team members already present in the app

This creates continuity between:

- Defects
- Team Tracker
- Manager Desk

### F9: Carry Forward

The manager must be able to carry unfinished items forward to another day.

Carry-forward rules:

- `done` and `cancelled` items are excluded by default
- items already carried should not be duplicated accidentally
- the carry-forward action should preserve links and notes

### F10: Search, Filter, and Scan

The module must support quick scanning with filters such as:

- item kind
- category
- status
- priority
- linked developer
- linked defect
- due / follow-up today
- overdue waiting items

### F11: Private Manager Context

All Manager Desk data in this phase is manager-owned.

Requirements:

- developer-role users cannot access this module
- desk items are not shown in developer `My Day`
- no implicit sharing into Team Tracker unless intentionally linked in future

### F12: History Preservation

The system must preserve the manager's operational context over time.

Requirements:

- completed items remain visible in historical day views
- decisions remain searchable later
- waiting items maintain continuity across days

---

## 10. Information Architecture Requirements

The UI implementation may choose the final visual design, but it must make room for these functional zones:

1. Date navigation and daily summary
2. Quick capture
3. Priority / today view
4. Agenda / meetings
5. Waiting-on / follow-up queue
6. Inbox
7. Completed items / history for the selected day
8. Item detail or editing surface

The exact composition is intentionally not prescribed here. The frontend implementation should choose the best layout and interaction model.

---

## 11. UX and Interaction Requirements

The final experience should feel like a world-class manager command surface, not a form-heavy admin page.

Required UX outcomes:

- adding an item should be very fast
- moving from capture to organization should feel lightweight
- meetings and follow-ups should not disappear into long notes
- the manager should immediately see what needs attention now
- old context should be preserved without overwhelming today's focus
- the page should work well on laptop-sized screens and remain usable on smaller widths

The product requirement is outcome-based. Visual language, layout, animation, and component treatment are intentionally left to the frontend implementation.

---

## 12. Reporting and Summary Requirements

For each selected day, the system should compute summary signals for the manager:

- total open items
- inbox count
- planned count
- in-progress count
- waiting count
- overdue follow-up count
- meetings today count
- completed today count

These summary signals are for scanning, not for heavy analytics.

---

## 13. Permissions

### Manager

Can:

- access Manager Desk
- create, edit, complete, cancel, and carry forward desk items
- link items to defects and developers
- review historical days

### Developer

Cannot:

- access Manager Desk routes or data
- view manager private operational items
- create or modify manager desk items

---

## 14. Out of Scope for This Phase

These may be considered later but are not required now:

- calendar integration
- reminders / notifications engine
- recurring templates
- multiple managers sharing a desk
- automatic meeting import
- AI summarization of meeting notes
- writing back manager desk data into Jira

---

## 15. Acceptance Criteria

1. A manager can open a dedicated `Manager Desk` module from the app shell.
2. The manager can capture a new item in a few inputs without leaving the page.
3. The manager can classify an item as action, meeting, decision, or waiting.
4. The manager can set status, category, priority, date/time, follow-up date, and notes.
5. The manager can link desk items to one or more defects and/or developers.
6. The manager can review a selected day and navigate to past or future dates.
7. The manager can see overdue and waiting follow-ups clearly.
8. The manager can mark items done or cancelled and retain outcome context.
9. The manager can carry unfinished work into another day without losing links or notes.
10. Developer-role users cannot access the module.

---

## 16. Implementation Guidance

This feature should be implemented as a new manager-only layer on top of the current application rather than as an extension of `My Day`.

Recommended module relationship:

- `Dashboard`: defects
- `Team Tracker`: team execution
- `Manager Desk`: manager execution

This keeps the mental model clear and prevents the manager workflow from being squeezed into the developer-oriented `My Day` structure.
