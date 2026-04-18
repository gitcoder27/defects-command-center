# Manager Desk Persistent Workspace Proposal

**Date:** April 18, 2026  
**Status:** Draft for product review  
**Authoring context:** Based on current Manager Desk behavior and manager workflow feedback from live usage  
**Related docs:** `docs/15-manager-desk-requirements.md`, `docs/16-manager-desk-frontend-handoff.md`, `docs/17-manager-desk-backend-requirements.md`, `docs/28-manager-workflow-review.md`, `docs/30-manager-workflow-follow-up-top-5.md`

---

## 1. Executive Summary

The current Manager Desk behaves like a day-owned workspace:

- each day starts mostly clean
- unfinished work must be reviewed and carried forward
- continuity depends on a manual manager action

This proposal changes the product model.

**Recommended new model:**

- Manager Desk becomes one persistent manager workspace
- tasks remain in the workspace until they are `completed`, `dropped`, or `archived`
- date navigation changes the lens on the workspace, not task existence
- "review" remains useful, but "carry forward" is no longer required for continuity

The core principle is:

**Tasks are durable. Dates are views.**

This should reduce missed work, lower daily bookkeeping, and make Manager Desk a more trustworthy operating surface.

---

## 2. Problem With The Current Model

The current day-based model creates avoidable workflow risk:

- unfinished work can disappear from the active day unless the manager remembers to carry it forward
- continuity depends on a manual ritual instead of the product's default behavior
- the manager has to maintain the desk instead of using the desk to manage work
- review and carry-forward are tightly coupled, even though they solve different problems

This does not match the intended meaning of a manager-owned task.

If a manager captures a task, one of the following should eventually happen:

- it is completed
- it is dropped
- it is intentionally archived as no longer relevant

A date change alone should not make the task fall out of active management.

---

## 3. Product Decision

### 3.1 Recommended Direction

Adopt a **persistent Manager Desk** model.

Manager Desk tasks should:

- survive day changes automatically
- remain actionable until explicitly resolved
- support long-running and multi-day manager work naturally
- preserve historical visibility by day without cloning tasks across days

### 3.2 What Changes

Replace this mental model:

```text
Each day has its own task set
and unfinished work must be moved into the next day
```

With this one:

```text
The manager has one living task workspace
and each date shows the state of that workspace for that day
```

### 3.3 What Stays

The following ideas still remain valuable:

- daily review
- date navigation
- historical visibility into past days
- manager-only privacy
- sectioned organization such as inbox, meetings, waiting, completed

What changes is the role of the day:

- the day becomes a reporting and planning lens
- the day stops being the container that determines whether the task still exists

---

## 4. Proposed Product Principles

| Principle | Meaning |
|---|---|
| Persistence by default | A manager task stays alive until the manager resolves it |
| Review is not transport | Review helps inspect and close the day, but does not move tasks between days |
| Dates are lenses | Viewing a date should show that day's state, not create a separate task universe |
| History must stay trustworthy | Past dates must remain reviewable without mutating current work |
| Open work must be hard to lose | Pending manager work should surface automatically until handled |
| Clutter must be controlled | A persistent desk must provide structure so it does not turn into a dump |

---

## 5. Core Product Model

### 5.1 Primary Entities

The product should treat these as separate concepts:

#### A. Manager Task

A persistent work item owned by the manager.

It continues to exist across days until it is:

- `completed`
- `dropped`
- `archived`

#### B. Day View

A filtered or historical view of Manager Desk for a selected date.

The day view answers questions like:

- what was open on this date?
- what was completed on this date?
- what was overdue on this date?
- what did my desk look like by end of day?

#### C. Daily Snapshot

A historical representation of task state for a specific date.

This supports review without requiring task duplication.

---

## 6. Task Lifecycle

### 6.1 Recommended Status Model

Keep the status model explicit and durable:

- `inbox`
- `planned`
- `in_progress`
- `waiting`
- `completed`
- `dropped`
- `archived`

### 6.2 Status Meanings

| Status | Meaning |
|---|---|
| `inbox` | Captured but not yet organized |
| `planned` | Intentionally kept on the manager's active desk |
| `in_progress` | The manager is actively working it |
| `waiting` | Blocked on another person, team, or external event |
| `completed` | Finished with an outcome recorded where needed |
| `dropped` | Intentionally stopped or no longer relevant |
| `archived` | Hidden from normal active views after resolution or long-term aging |

### 6.3 Core Rule

A task in any of these states remains visible in active desk logic until explicitly moved out:

- `inbox`
- `planned`
- `in_progress`
- `waiting`

Changing the date does not move a task out of those states.

---

## 7. Date Semantics

### 7.1 Today View

When the manager opens today's desk, the page should show all still-relevant work, including:

- tasks created today
- tasks carried over naturally because they remain unresolved
- overdue follow-ups from previous days
- waiting items still unresolved
- completed items completed today

This means "today" is not a fresh blank slate.

It is the manager's current operating surface.

### 7.2 Past Date View

When the manager opens a past date, the page should show a **historical snapshot** of how the desk looked on that day.

This should support review questions such as:

- what all tasks were on my desk on that date?
- what did I finish that day?
- what remained open by end of day?
- what was overdue or waiting?

This view should be read-first and history-oriented.

### 7.3 Future Date View

When the manager opens a future date, the page should act as a planning lens.

It may show:

- tasks already scheduled for that day
- follow-ups due that day
- meetings planned for that day
- unresolved work expected to still matter by then

Future dates should not require cloning active tasks into a separate day record.

---

## 8. What Happens At Day Rollover

### 8.1 Current Problem

Today the product behaves as if a new date means a new workspace that must be repopulated.

### 8.2 Proposed Behavior

At midnight or on first open of a new day:

- all unresolved tasks remain part of the active Manager Desk
- no manual carry-forward is required
- tasks keep their status
- overdue signals update automatically based on due or follow-up dates
- completed and dropped items remain in history and in completed-style sections

### 8.3 Important Outcome

The manager should never need to think:

"Did I remember to bring yesterday's unfinished work into today?"

The system should make that automatic by design.

---

## 9. Reframing Review And Carry Forward

### 9.1 Review Should Stay

Review is still valuable.

The manager should be able to review a day and answer:

- what did I complete?
- what is still open?
- what is waiting?
- what became overdue?
- what should I intentionally reprioritize tomorrow?

### 9.2 Carry Forward Should Change Meaning

The current carry-forward concept should not remain as the mechanism that preserves task continuity.

Instead:

- continuity happens automatically because tasks persist
- "carry forward" becomes either unnecessary or is renamed to a narrower action

### 9.3 Recommended Replacement

Replace "carry forward" with one or both of these concepts:

#### A. `Reschedule`

Use when the manager wants to move a date-bound field such as:

- follow-up date
- planned start
- planned end
- meeting date

This changes scheduling, not task existence.

#### B. `Daily Review`

Use as a closure workflow that helps the manager:

- inspect unfinished work
- mark items done or dropped
- reschedule items that need a new date
- leave notes for tomorrow

This is a review ritual, not a data transport mechanism.

---

## 10. Recommended Screen Model

### 10.1 Today / Live Workspace

Recommended major sections for today's Manager Desk:

1. Summary strip
2. Quick capture
3. Needs attention
4. Planned and in-progress work
5. Meetings
6. Waiting and follow-up
7. Inbox
8. Completed today

### 10.2 Suggested Meaning Of Each Section

| Section | Purpose |
|---|---|
| `Needs attention` | Overdue, stale, and at-risk items that should not be missed |
| `Planned and in-progress work` | The manager's active working set |
| `Meetings` | Meeting prep, agenda, and post-meeting follow-up |
| `Waiting and follow-up` | Items blocked on others or pending a follow-up date |
| `Inbox` | Fresh capture waiting to be shaped |
| `Completed today` | Closure and confidence that work moved forward |

### 10.3 Past-Day Screen Behavior

Past-day view should emphasize review:

- daily snapshot summary at top
- list of tasks as of that day
- clear indication of end-of-day open vs completed vs dropped
- no requirement to manually continue those tasks from that screen

### 10.4 Future-Day Screen Behavior

Future-day view should emphasize planning:

- planned meetings
- due follow-ups
- scheduled manager work
- expected open items relevant to that date

---

## 11. Inclusion Rules For Date Views

To make the behavior predictable, each date view should follow explicit inclusion rules.

### 11.1 Today's Live View

Include:

- all unresolved tasks
- all tasks completed today
- all tasks dropped today

Group unresolved tasks by urgency and type rather than by creation date.

### 11.2 Past-Day Historical View

Include:

- all tasks that existed on that day
- each task's status as of end of that day
- tasks completed or dropped on that day
- tasks still open at end of that day

This should answer: "What did my desk look like by close of business?"

### 11.3 Future-Day Planning View

Include:

- tasks with scheduled/follow-up relevance on that future date
- planned meetings for that date
- unresolved work with dates on or before that date that still requires manager action

This should answer: "What is already waiting for me on that day?"

---

## 12. Required User Actions In The New Model

The manager should be able to:

1. capture a task once and trust that it stays visible until resolved
2. change task status without moving it between day-owned containers
3. reschedule a task's date fields without recreating the task
4. complete, drop, or archive a task explicitly
5. review what the desk looked like on any previous day
6. see unresolved work automatically on the next day
7. filter the desk to focus on `today`, `overdue`, `waiting`, `meetings`, or `completed`
8. inspect what changed today without manually comparing two day buckets

---

## 13. Historical Review Requirements

This is the most important requirement to preserve from the current model.

The manager wants to look back and review a specific day.

That means the product must preserve:

- what tasks existed by that day
- the status of those tasks on that day
- what was completed that day
- what remained pending by end of day

### 13.1 Recommended Historical Contract

Past-date review should reflect **end-of-day state**.

That is the cleanest interpretation of:

"When I open April 17, show me what my dashboard looked like by the end of April 17."

### 13.2 Why End-Of-Day State Is Better Than Current Live State

If a task was open on April 17 but completed on April 18:

- past-day review for April 17 should still show it as open
- today's live view should show it as completed

Without historical state capture, the past view becomes misleading.

---

## 14. Recommended Product Rules

### Rule 1. Task persistence

Every Manager Desk task remains active until the manager explicitly marks it:

- completed
- dropped
- archived

### Rule 2. No daily cloning for continuity

A new day does not require task duplication or carry-forward to preserve open work.

### Rule 3. Reschedule instead of carry-forward

If a date field changes, update the field. Do not create a new copy of the task for a new day unless there is a special product reason.

### Rule 4. History must be read-only and trustworthy

Past-date review should show what was true on that date, not what is true now.

### Rule 5. Open work must surface automatically

If the manager forgot about a task, the desk should not.

### Rule 6. Resolved work should not clutter the live desk forever

Completed and dropped items should remain reviewable but should progressively move behind:

- completed today
- recent completed
- archive

---

## 15. Benefits Of The Proposed Model

### 15.1 Operational Benefits

- lower risk of missed manager-owned work
- less manual bookkeeping
- better trust in Manager Desk as the single manager operating surface
- more natural support for multi-day work
- simpler mental model for the user

### 15.2 UX Benefits

- today opens with meaningful continuity
- review becomes cleaner and more intentional
- historical dates remain useful
- task management feels more like a real workbench and less like a daily scratchpad

### 15.3 Product Benefits

- aligns better with real manager behavior
- reduces friction in adoption
- creates a stronger bridge between capture, planning, and completion

---

## 16. Risks And How To Control Them

The persistent model is stronger, but it adds one major product risk:

### Risk: the desk becomes cluttered

If unresolved work simply accumulates forever, the desk can become noisy and stressful.

### Mitigations

- make `Needs attention` a first-class section
- support strong filters such as `open only`, `waiting`, `overdue`, `completed today`
- allow archive behavior for old resolved work
- highlight stale items explicitly
- group active work by urgency instead of by original date

### Secondary Risk: historical view becomes confusing

If past-date logic is not clearly defined, users may not know whether they are seeing:

- current task state
- tasks created that day
- end-of-day state for that day

### Mitigation

Standardize on:

- **today = live workspace**
- **past date = historical end-of-day snapshot**
- **future date = planning lens**

---

## 17. Suggested Scope If This Direction Is Approved

### Phase 1. Product model shift

- stop requiring carry-forward for unfinished manager work
- make open tasks automatically persist into the current live workspace
- define date views clearly

### Phase 2. Historical review

- preserve end-of-day desk state for past-date review
- show daily summaries and resolved/open breakdowns

### Phase 3. Cleanup and guidance

- replace or rename carry-forward actions
- introduce reschedule flows
- add stale/overdue attention handling

---

## 18. Product Questions To Confirm Before Implementation

These are the key decisions to lock before coding:

1. Should past-date view show end-of-day state only, or also allow a "tasks created that day" sub-view?
2. Should future-date view be a full projected desk or a lighter scheduling-only view?
3. Should `archived` be part of phase 1, or can it wait until the live desk becomes noisy?
4. Should meetings remain persistent tasks after the meeting date, or should completed meetings roll into history while their follow-ups persist separately?
5. Should "review" become a guided daily checklist or remain a simple read-only summary plus actions?

---

## 19. Recommended Final Product Position

Manager Desk should no longer behave like a per-day scratchpad that must be manually repopulated.

It should behave like a **persistent manager workspace** with:

- durable manager-owned tasks
- automatic continuity across days
- strong visibility for unresolved work
- trustworthy historical day review

In short:

**The manager should manage tasks, not manage carry-forward.**

