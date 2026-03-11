# Product / Engineering Review

## Team Tracker Manager Review And Enhancement Roadmap

**Date:** March 11, 2026  
**Status:** Active roadmap with partial implementation tracking  
**Audience:** Product, frontend, backend  
**Related docs:** `docs/07-team-tracker-prd.md`, `docs/08-team-tracker-implementation-plan.md`, `docs/11-team-tracker-gap-findings.md`, `docs/12-developer-workspace-requirements.md`

---

## 1. Summary

The current Team Tracker is a solid operational MVP for a manager.

It already covers the core day-management loop well:

- per-developer day cards
- current work
- next planned work
- completed and dropped work
- manager notes
- check-ins
- carry-forward
- daily status
- optional day capacity
- a direct bridge into Manager Desk

As a result, the page is usable today for a small team and can already support morning planning, midday follow-up, and end-of-day review.

However, the page is not yet a fully mature manager control surface.

The main gap is that it tracks the team state, but it does not yet help the manager prioritize attention, understand risk quickly, or review what changed over time with enough clarity.

The working conclusion is:

- **Current state:** good foundation, usable MVP
- **Product verdict:** not yet fully sufficient as the manager's primary high-confidence command view
- **Next direction:** improve attention management, risk clarity, change visibility, and scalability of the board

### 1.1 Implementation Tracking

Use this section to record roadmap items that have moved from proposal to implementation.

| Date | Item | Status | Notes |
|---|---|---|---|
| March 11, 2026 | `TTM-01` Attention Queue | Implemented | Added backend-ranked attention queue data and a Team Tracker "Needs Attention Now" section with ranked developers, reason chips, and quick-open access into the drawer. Daily clear/snooze controls are still deferred. |

---

## 2. Current-State Verdict

If I were using this as the manager of a team, I would use this page.

I would be comfortable using it for:

- checking what each developer is working on
- updating the daily queue
- capturing notes from follow-ups
- seeing who is stale or blocked
- carrying unfinished work into the next day

I would not yet be fully satisfied using it as my only operational screen for fast team supervision throughout the day.

The main reasons are:

1. the page still requires too much manual scanning
2. blocked and at-risk states are not structured enough
3. freshness is too simplistic
4. the board does not yet scale well as the team or work volume grows
5. the screen is snapshot-oriented rather than change-oriented

---

## 3. What Works Well Today

These parts are already strong and should be preserved:

- The page is clear and lightweight.
- The summary strip supports quick filtering.
- The card model is good for a small team.
- The drawer gives enough detail for day-level management.
- Jira-linked and custom tasks are both supported.
- Carry-forward is practical and aligned with real manager workflows.
- Capacity is simple and understandable.
- Manager Desk capture is a useful adjacent workflow.
- The Team Tracker remains manager-owned while My Day can keep it updated from the same shared data.

This matters because the current screen does not need a full replacement. It needs a focused second phase.

---

## 4. Main Findings

### 4.1 No ranked attention queue

The page shows counts and filters, but it does not answer the manager's next question strongly enough:

> Who needs me first?

The current board still depends on the manager visually scanning the whole grid and deciding urgency manually.

### 4.2 Risk states are visible but not operationally explained

The manager can mark someone `blocked`, `at_risk`, or `waiting`, but the page does not capture:

- blocker reason
- dependency owner
- expected unblock time
- next follow-up time
- confidence level
- whether manager action is required

This means the state is visible, but not actionable enough.

### 4.3 Freshness logic is too blunt

The current stale signal is based on elapsed time since the last check-in.

That helps, but it is not enough on its own:

- a low-risk task can look stale even when it is fine
- a critical slipping task can look healthy if someone posted a recent check-in

The manager needs a more nuanced signal.

### 4.4 The board is good for a small team, but weak for scale

The card grid is fine for a small number of people, but it becomes harder to scan when:

- the team grows
- many people have multiple planned items
- several people are healthy and can be ignored
- the manager wants to compare developers by one signal quickly

### 4.5 The page is snapshot-based instead of change-based

The current page tells the manager what the state is right now.

It does not strongly tell the manager:

- what changed since the previous day
- who just became blocked
- who switched current work
- who is carrying more work than planned
- who completed less than expected

### 4.6 Update attribution is only partially visible

The shared contract already supports check-in authorship, but the Team Tracker UI does not surface that clearly.

The manager should be able to see:

- whether the latest update came from the developer or the manager
- what kind of update happened
- when the last meaningful change occurred

### 4.7 Jira context is still too passive inside Team Tracker

Jira context is present at the item level, but Team Tracker itself does not yet give enough operational issue awareness:

- no strong drill-in flow from tracker to issue context
- no prominent duplicate assignment warning inside tracker workflows
- no stronger emphasis for due-today or overdue Jira-linked work on the board itself

---

## 5. Product Direction

The next phase should not try to turn Team Tracker into a giant management suite.

The right direction is to keep Team Tracker as a compact manager command view, but make it better at these jobs:

1. show who needs attention first
2. explain risk instead of only labeling it
3. expose what changed recently
4. reduce manager scanning effort
5. work better for larger teams and busier days

---

## 6. Enhancement Backlog

This section defines the proposed backlog items that can later be broken into separate planning and implementation documents.

### TTM-01 Attention Queue

**Goal**

Add a dedicated, ranked "Needs Attention Now" section above the board so the manager can immediately see the highest-priority follow-ups.

**Implementation status**

Implemented on March 11, 2026.

**What it should add**

- ranked developers needing attention
- urgency ordering such as `blocked > at risk > stale > no current > waiting`
- visible reason chips for why the person is in the queue
- quick open into the developer drawer
- optional ability to clear or snooze an attention item for the day

**Delivered now**

- backend-computed attention queue on the Team Tracker board response
- ranked ordering using `blocked > at risk > stale > no current > waiting`
- visible reason chips in the new top-of-page queue
- quick open from the queue into the developer drawer

**Deferred from original scope**

- clear or snooze for the day

**Why it matters**

This is the single strongest improvement for same-day manager usability.

**Implementation scope**

- **Type:** frontend + backend
- **Change profile:** backend-heavy

**Why this classification**

The frontend needs a new top-level section and interaction model, but the ranking and reason generation should be computed from a richer backend summary model rather than reconstructed ad hoc in the browser.

---

### TTM-02 Structured Risk And Blocker Capture

**Goal**

Replace purely freeform risk tracking with a more structured blocker and follow-up model.

**What it should add**

- blocker reason
- waiting on
- owner or counterpart
- expected unblock date or time
- next follow-up date or time
- manager action required flag
- optional confidence or risk severity

**Why it matters**

A manager does not just need to know that someone is blocked. The manager needs to know what to do next and when to follow up again.

**Implementation scope**

- **Type:** frontend + backend
- **Change profile:** balanced

**Why this classification**

This requires new persisted fields and contracts on the backend, plus drawer and board UI changes on the frontend to enter, display, and summarize the structure cleanly.

---

### TTM-03 Smarter Freshness And Risk Signals

**Goal**

Move beyond a single stale timer and compute better operational signals.

**What it should add**

- stale-by-time
- stale-with-open-risk
- stale-without-current-work
- overdue linked Jira work
- over-capacity day
- status-change-without-follow-up
- configurable freshness thresholds

**Why it matters**

Managers need confidence that alerts reflect real operational risk, not only elapsed time.

**Implementation scope**

- **Type:** frontend + backend
- **Change profile:** backend-heavy

**Why this classification**

Most of the real value is in the backend logic and derived flags. The frontend work is important, but it mostly depends on how those new signals are computed and returned.

---

### TTM-04 Board Scalability Controls

**Goal**

Make the page faster to use when the team or workload is larger.

**What it should add**

- list mode in addition to card mode
- search by developer name or Jira key
- sort by attention level, stale time, capacity pressure, or alphabetical
- group by status
- hide healthy developers toggle
- compact density mode

**Why it matters**

The current grid is visually pleasant, but managers eventually need control over density and scan order.

**Implementation scope**

- **Type:** frontend only
- **Change profile:** frontend-heavy

**Why this classification**

The current board payload is already enough to support an initial version of view controls on the client side.

---

### TTM-05 Change Intelligence

**Goal**

Show what changed, not only the current snapshot.

**What it should add**

- changes since yesterday
- changes since last manager visit
- newly blocked developers
- task switches
- newly added or dropped work
- carry-forwarded items
- completed-today versus planned-today comparison

**Why it matters**

This reduces memory burden and helps the manager focus on movement, not just state.

**Implementation scope**

- **Type:** frontend + backend
- **Change profile:** backend-heavy

**Why this classification**

A robust version needs event or delta-aware backend data rather than only frontend comparison of two snapshots.

---

### TTM-06 Visible Update Attribution

**Goal**

Show who made the most recent updates and where the latest signal came from.

**What it should add**

- author badge on check-ins
- clear distinction between developer and manager updates
- latest meaningful update indicator on the card
- optional lightweight activity line in the drawer

**Why it matters**

The manager needs to know whether the tracker is self-updating from the developer or still manager-maintained.

**Implementation scope**

- **Type:** frontend only for v1
- **Change profile:** frontend-heavy

**Why this classification**

The current shared contract already includes check-in author fields. A first useful version can be done entirely in the Team Tracker UI.

**Future extension**

A richer version with item-state attribution and full activity history would become a frontend + backend task later.

---

### TTM-07 Stronger Jira Context Inside Team Tracker

**Goal**

Make Jira-linked work more operational inside Team Tracker itself.

**What it should add**

- stronger due-today and overdue emphasis
- quick issue drill-in from tracker items
- visible duplicate assignment or overlap warning during task creation
- clearer linked-issue context on cards and in the drawer

**Why it matters**

Managers should not have to bounce to another area of the product to understand the urgency of linked defect work.

**Implementation scope**

- **Type:** frontend only for initial version
- **Change profile:** frontend-heavy

**Why this classification**

The current item payload already includes Jira key, summary, priority, and due date, and the repo already contains an issue-assignment query that can be consumed by Team Tracker UI.

**Future extension**

If the team later wants richer issue-side summary payloads or consolidated warnings returned with the board response, this becomes a frontend + backend task.

---

### TTM-08 Bulk Morning Planning Actions

**Goal**

Reduce the cost of morning setup and team-wide reprioritization.

**What it should add**

- quick multi-person planning workflow
- team-wide carry-forward review
- optional bulk capacity entry
- optional batch "set current" or "mark done" helpers where safe
- "review all no-current developers" flow

**Why it matters**

Managers often do the same small setup task repeatedly across multiple developers.

**Implementation scope**

- **Type:** frontend + backend
- **Change profile:** balanced

**Why this classification**

A minimal version can be frontend-driven, but the safer and cleaner long-term design is to add explicit batch-oriented backend support where multiple coordinated updates are needed.

---

### TTM-09 Follow-Up Scheduling And Reminders

**Goal**

Let the manager schedule the next attention point instead of relying on memory.

**What it should add**

- next follow-up timestamp on a developer day
- "follow up after lunch" or similar reminder helper
- due follow-up indicator on the board
- cleared follow-up once checked in again

**Why it matters**

This turns Team Tracker from passive visibility into active manager workflow support.

**Implementation scope**

- **Type:** frontend + backend
- **Change profile:** balanced

**Why this classification**

The schedule must be stored and returned by the backend, and the frontend must surface it clearly without overloading the board.

---

### TTM-10 Team Tracker And Manager Desk Coordination Improvements

**Goal**

Tighten the handoff between team supervision and the manager's own follow-up work.

**What it should add**

- clearer capture flows from Team Tracker into Manager Desk
- optional auto-linking of blocker context when creating follow-ups
- better visibility that a follow-up already exists
- optional "open related Manager Desk items" shortcut from the drawer

**Why it matters**

The current capture entry is useful, but it still behaves more like an adjacent feature than a strongly integrated manager workflow.

**Implementation scope**

- **Type:** frontend + backend
- **Change profile:** balanced

**Why this classification**

Some improvements are pure UI, but useful coordination requires persisted links and query support between the two modules.

---

## 7. Implementation Classification Matrix

This section groups the backlog items by implementation type for easier planning.

### 7.1 Pure Frontend Tasks

These can be planned and implemented without backend contract changes for the initial version.

| ID | Item | Change profile |
|---|---|---|
| `TTM-04` | Board Scalability Controls | Frontend-heavy |
| `TTM-06` | Visible Update Attribution | Frontend-heavy |
| `TTM-07` | Stronger Jira Context Inside Team Tracker | Frontend-heavy |

### 7.2 Pure Backend Tasks

There are no strong standalone backend-only roadmap items in the current recommendation set.

Most meaningful improvements that touch backend logic also need UI work to surface their value.

Possible future backend-only refactors may include:

- signal-computation cleanup
- audit/event model refactoring
- configuration cleanup for freshness logic

Those are not recommended as user-facing roadmap items on their own.

### 7.3 Frontend + Backend Tasks

These are the main full-stack roadmap items.

| ID | Item | Change profile |
|---|---|---|
| `TTM-01` | Attention Queue | Backend-heavy |
| `TTM-02` | Structured Risk And Blocker Capture | Balanced |
| `TTM-03` | Smarter Freshness And Risk Signals | Backend-heavy |
| `TTM-05` | Change Intelligence | Backend-heavy |
| `TTM-08` | Bulk Morning Planning Actions | Balanced |
| `TTM-09` | Follow-Up Scheduling And Reminders | Balanced |
| `TTM-10` | Team Tracker And Manager Desk Coordination Improvements | Balanced |

---

## 8. Recommended Priority Order

The recommended order below is based on manager value, implementation leverage, and how much each item improves the page as a real operational command view.

### 8.1 Must-Have Next Phase

These are the highest-value upgrades.

1. `TTM-01` Attention Queue
2. `TTM-02` Structured Risk And Blocker Capture
3. `TTM-03` Smarter Freshness And Risk Signals
4. `TTM-04` Board Scalability Controls

### 8.2 Should-Have After That

These are strong second-wave improvements.

1. `TTM-05` Change Intelligence
2. `TTM-06` Visible Update Attribution
3. `TTM-09` Follow-Up Scheduling And Reminders

### 8.3 Nice-To-Have Or Parallel Track

These should follow once the core manager workflow is stronger.

1. `TTM-07` Stronger Jira Context Inside Team Tracker
2. `TTM-08` Bulk Morning Planning Actions
3. `TTM-10` Team Tracker And Manager Desk Coordination Improvements

---

## 9. Suggested Planning Sequence

To turn this roadmap into implementation work without overloading the team, the recommended sequence is:

### Phase 1: Attention And Risk

Plan together:

- `TTM-01`
- `TTM-02`
- `TTM-03`

Reason:

These three items are tightly related and define the next real version of the manager experience.

### Phase 2: Scan Speed And Daily Usability

Plan together:

- `TTM-04`
- `TTM-06`
- `TTM-07`

Reason:

These improve day-to-day speed and UI clarity without requiring the same level of data-model work.

### Phase 3: History, Follow-Up, And Coordination

Plan together:

- `TTM-05`
- `TTM-08`
- `TTM-09`
- `TTM-10`

Reason:

These deepen the product and make the manager workflow more complete after the high-priority operational gaps are closed.

---

## 10. Key Product Guardrails

While implementing the next phase, keep these guardrails in place:

1. Do not turn Team Tracker into a bloated analytics dashboard.
2. Keep current-state visibility stronger than reporting complexity.
3. Preserve low-friction editing for managers.
4. Keep custom work first-class beside Jira-linked work.
5. Keep manager-owned notes and context private unless intentionally expanded.
6. Avoid forcing the manager into drawer-only workflows for every common action.
7. Prefer high-signal summaries over dense text.

---

## 11. Final Recommendation

The current Team Tracker should be treated as a successful first version, not as a finished manager workspace.

It already solves the basic problem of day-level team visibility. The next planning and implementation work should focus on making it a stronger decision-support and attention-management surface.

If only a few items are selected for the next iteration, the best choices are:

1. `TTM-01` Attention Queue
2. `TTM-02` Structured Risk And Blocker Capture
3. `TTM-03` Smarter Freshness And Risk Signals
4. `TTM-04` Board Scalability Controls

Those four changes would produce the biggest step-change in manager confidence and daily usability.
