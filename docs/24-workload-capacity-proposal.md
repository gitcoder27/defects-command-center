# Product / Engineering Proposal

## Workload + Capacity Radar Refresh

**Date:** March 9, 2026  
**Status:** Proposed  
**Audience:** Product, frontend, backend  
**Related docs:** `docs/07-team-tracker-prd.md`, `docs/08-team-tracker-implementation-plan.md`

---

## 1. Summary

Refresh the current dashboard workload widget so it stops behaving like a single opaque Jira score and becomes a compact, operational team load view.

The proposed direction is:

- keep the existing Jira-based workload `score`
- add Team Tracker task counts for the selected day
- add optional daily capacity
- present the result in a minimal, modern UI with very low text density

This keeps the existing backlog-pressure signal while making the widget useful for same-day assignment decisions.

---

## 2. Current State

Today the bottom workload bar is driven only by Jira issue data.

For each active developer, the current implementation computes:

- `activeDefects`
- `dueToday`
- `blocked`
- `score`
- `level`

The collapsed pill shows the `score`. The expanded card shows the counts.

The `score` is currently derived only from Jira priority weights:

- `Highest = 5`
- `High = 3`
- `Medium = 1`
- `Low = 0.5`
- `Lowest = 0.5`
- unknown priorities default to `0.5`

Only active team issues are included. That means issues are excluded when they are:

- `done`
- explicitly excluded
- out of team scope
- sync inactive

Team Tracker is not currently part of this calculation.

---

## 3. Problem

The current widget is useful as a backlog signal, but weak as a daily planning signal.

It cannot answer:

- how many tasks are already planned for a developer today
- whether the developer has a current item
- whether the developer is already at or over today’s capacity
- whether Jira backlog and Team Tracker reality disagree

This creates a gap between:

- backlog pressure from Jira
- actual day plan from Team Tracker

As a result, the number can look precise while still being incomplete for live assignment decisions.

---

## 4. Product Goal

Turn the workload bar into a compact **Workload + Capacity Radar** that helps the lead answer two questions quickly:

1. Who has the lightest effective load right now?
2. Who already has enough planned work for today?

The widget should remain fast to scan and should not become a text-heavy analytics panel.

---

## 5. Proposed Model

### 5.1 Keep Two Signals Separate

Do not merge everything into one magic number.

Show two distinct dimensions:

- `Backlog score`: weighted Jira pressure
- `Today load`: Team Tracker task count and optional capacity utilization

This preserves clarity. A developer can have:

- low backlog score but a full day already planned
- high backlog score but little planned for today

Both are meaningful.

### 5.2 Proposed Developer Metrics

Extend the workload payload with tracker-aware fields for the selected day.

Required new fields:

- `currentCount`: `0 | 1`
- `plannedCount`
- `assignedTodayCount`
- `completedTodayCount`
- `droppedTodayCount`
- `trackerStatus`
- `isTrackerStale`
- `hasCurrentItem`

Definitions:

- `currentCount` = `1` when a current tracker item exists, else `0`
- `plannedCount` = number of tracker items in `planned`
- `assignedTodayCount` = `currentCount + plannedCount`
- `completedTodayCount` = number of tracker items in `done`
- `droppedTodayCount` = number of tracker items in `dropped`

Optional capacity fields:

- `capacityUnits`
- `capacityUsed`
- `capacityRemaining`
- `capacityUtilization`

For MVP, `capacityUsed` can be equal to `assignedTodayCount`.

### 5.3 Capacity Model

Capacity should be explicit and simple.

Recommended MVP model:

- each developer day can store `capacityUnits`
- default can be empty, not inferred
- when empty, the UI shows task counts only
- when present, the UI shows `assigned / capacity`

Example:

- Alice: `2 / 5`
- Bob: `4 / 4`
- Carol: `1 / 3`

This is better than trying to infer hours from Jira priority or status.

---

## 6. Team Tracker Integration

The existing Team Tracker already provides most of the day-state needed:

- `currentItem`
- `plannedItems`
- `completedItems`
- `droppedItems`
- `status`
- `isStale`
- `lastCheckInAt`

The missing concept is persisted daily capacity.

Recommended schema addition on `team_tracker_days`:

- `capacityUnits INTEGER NULL`

Optional future additions:

- `capacityNote TEXT NULL`
- `availabilityState TEXT NULL`

These should be deferred unless there is a clear real-world need.

---

## 7. UI Direction

### 7.1 Design Intent

The UI should feel:

- refined minimal
- operational
- modern
- low-noise

It should avoid:

- explanatory paragraphs in the widget
- oversized labels
- dashboards that look like analytics software
- decorative overload

### 7.2 Collapsed State

Each developer pill should remain compact and clickable.

Recommended content:

- initials
- first name
- backlog score
- today load

Recommended visual pattern:

- primary number: `assigned / capacity` when capacity exists, otherwise `assigned`
- secondary micro-label or subtle dot/badge for `score`

Examples:

- `Alice   2/5   S8`
- `Bob     4/4   S3`
- `Carol   1     S1`

If space is too tight, invert the hierarchy:

- primary: task load
- secondary: score on expand only

### 7.3 Expanded State

Expanded cards should show only the highest-signal stats:

- `Active`
- `Assigned`
- `Done`
- `Blocked`

Optional fifth stat:

- `Capacity`

Recommended layout:

- one strong top line with name and state
- one compact utilization row
- one quiet metrics row
- no descriptive sentences

### 7.4 Visual Language

Recommended style direction: **refined minimal**

Guidelines:

- neutral surfaces
- thin borders
- restrained accent color
- monospaced numerals for all counts
- strong spacing rhythm
- no bright heatmap treatment

Use color only for exceptions:

- blocked
- stale
- over capacity
- no current item

Default state should feel calm, not alarming.

### 7.5 Interaction Rules

- click on a developer still filters the defect table
- active selection remains visually clear
- hover can reveal more detail, but do not require hover to understand the state
- capacity overload should be visible without opening the card

---

## 8. Suggested Backend Contract

Extend the existing workload response rather than creating a second widget-specific endpoint.

Recommended response shape:

```ts
interface DeveloperWorkload {
  developer: Developer;
  activeDefects: number;
  dueToday: number;
  blocked: number;
  score: number;
  level: "light" | "medium" | "heavy";

  currentCount: 0 | 1;
  plannedCount: number;
  assignedTodayCount: number;
  completedTodayCount: number;
  droppedTodayCount: number;
  trackerStatus?: TrackerDeveloperStatus;
  isTrackerStale?: boolean;

  capacityUnits?: number;
  capacityUsed?: number;
  capacityRemaining?: number;
  capacityUtilization?: number;

  signals?: {
    noCurrentItem: boolean;
    overCapacity: boolean;
    backlogTrackerMismatch: boolean;
  };
}
```

Recommended request behavior:

- `GET /api/team/workload`
- optional query param: `date=YYYY-MM-DD`
- default date: today

This keeps the contract aligned with the Team Tracker day model.

---

## 9. Recommendation Logic

### 9.1 Keep Suggestion Logic Explainable

Assignment recommendations should sort using transparent rules rather than an opaque composite score.

Recommended ranking order:

1. exclude blocked developers from first-rank suggestions
2. prefer developers below capacity
3. sort by lowest `capacityUtilization`
4. break ties by lowest Jira `score`
5. break remaining ties by lowest `activeDefects`

Fallback when capacity is not set:

1. lowest `assignedTodayCount`
2. lowest Jira `score`
3. lowest `activeDefects`

### 9.2 Useful Derived Signals

Add compact warning signals when:

- `score` is high but `assignedTodayCount` is `0`
- `assignedTodayCount` is high but no current item exists
- `capacityUtilization > 1`
- tracker is stale and backlog is non-trivial

These are operationally more useful than another score layer.

---

## 10. Implementation Phases

### Phase 1: Tracker Counts

Ship without capacity editing first.

Scope:

- extend workload response with tracker counts
- update collapsed pill to show assigned count
- update expanded card to show assigned/done in addition to Jira metrics
- keep existing score unchanged

Outcome:

- immediate clarity with low implementation risk

### Phase 2: Daily Capacity

Add a simple per-day capacity value on Team Tracker.

Scope:

- schema change for `capacityUnits`
- simple UI control in Team Tracker day or drawer
- workload widget shows `assigned / capacity`
- suggestion logic uses utilization

Outcome:

- real same-day planning signal

### Phase 3: Smart Signals

Add mismatch and overload indicators.

Scope:

- `overCapacity`
- `noCurrentItem`
- `backlogTrackerMismatch`
- subtle warning states in widget and assignment suggestions

Outcome:

- faster intervention for the lead

---

## 11. Minimal UI Acceptance Criteria

The refreshed widget should satisfy all of the following:

- a lead can identify overloaded developers in under 5 seconds
- a lead can identify who has available day capacity in under 5 seconds
- the collapsed bar remains scannable on laptop-width screens
- the expanded state does not require paragraph text to explain the numbers
- counts use consistent monospaced numerals
- exception colors appear only for abnormal states
- clicking a developer still filters the defect table exactly as today

---

## 12. Engineering Acceptance Criteria

- current Jira-based `score` remains backward-compatible
- tracker counts are date-aware
- missing capacity does not break the UI
- missing tracker data falls back cleanly to Jira-only behavior
- workload sorting remains deterministic
- API payload stays compact

---

## 13. Open Decisions

These should be resolved before Phase 2:

1. Should `capacityUnits` represent task slots only, or a generic unit that may later map to effort?
2. Should capacity be editable only from Team Tracker, or also from the dashboard?
3. Should blocked developers count against capacity the same as normal planned items?
4. Should done items reduce used capacity during the same day, or remain counted as assigned work for that day?

Recommended defaults:

- use task slots, not hours
- edit capacity only in Team Tracker
- blocked current work still counts as used capacity
- completed items remain part of the day record, but `capacityUsed` should reflect current + planned, not completed

---

## 14. Final Recommendation

Implement this feature as a **clarity upgrade**, not a data-heavy redesign.

The right direction is:

- keep the Jira score
- add Team Tracker counts immediately
- add optional daily capacity next
- keep the widget visually restrained

The success condition is not “more metrics.” The success condition is that the lead can make a better assignment decision with one quick glance.
