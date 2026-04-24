# Team Tracker Developer Drawer Redesign

**Date:** April 24, 2026  
**Status:** Draft for implementation  
**Audience:** Product, frontend implementation, QA  
**Related docs:** `docs/33-team-tracker-simplification-redesign.md`, `docs/07-team-tracker-prd.md`, `docs/26-team-tracker-manager-review-and-enhancement-roadmap.md`

---

## 1. Summary

The Team Tracker main screen is now simpler, but the developer detail drawer still feels cluttered. It shows useful information, but too much of it has the same visual weight.

The drawer should become a calm daily-use workspace for one developer.

Primary question:

**What is this developer doing now, what is next, and what manager action is needed?**

The redesign should keep existing behavior and data flows, but simplify the layout, reduce badge noise, and make the task queue easier to use.

---

## 2. Current Issues

- status controls are shown as large colored pills
- load, done, dropped, capacity, stale, and overdue signals compete for attention
- current work, planned work, manager follow-up, notes, and history all feel equally important
- the Manager Desk card uses too much space for repeated explanatory copy
- completed work is visible by default even though it is lower-priority history
- the drawer has useful actions, but the visual hierarchy does not guide the manager through the workflow

Root issue:

**The drawer exposes every capability at once instead of prioritizing the daily manager workflow.**

---

## 3. Design Principle

Use progressive disclosure inside the drawer.

The first visible area should focus on:

1. developer identity and current status
2. current work
3. planned queue
4. manager follow-up action

Lower-frequency information should be smaller or collapsed:

- completed work
- dropped work
- long manager notes
- secondary status metadata

---

## 4. Target Drawer Structure

Recommended order:

```text
Header
Identity, status, key metrics, close/inactive action

Current Work
Primary active task card

Planned Queue
Compact draggable task rows + Add task

Manager Follow-Up
Small capture row

Manager Notes
Quiet editable notes area

Completed / Dropped
Collapsed history sections
```

---

## 5. Section Requirements

### 5.1 Header

The header should be compact and stable.

Show:

- initials/avatar
- developer name
- current status
- key metrics: load, done count, stale/overdue signals when present
- mark inactive icon
- close button

Avoid:

- large vertical spacing
- repeated status pills
- oversized colored controls

Example:

```text
HN  Harsha Nallaiahgari        [mark inactive] [close]
    On track · Load 4 · Done 1 · Stale · 1 overdue Jira
```

### 5.2 Status And Capacity

Replace the large status pill row with a quieter control.

Preferred options:

- compact segmented control with smaller buttons
- or a `Status` dropdown if space is tight

Capacity should be inline and simple:

```text
Capacity: 4 / -
```

Rules:

- keep status editing available
- avoid full-width colored pill rows
- keep active status clearly visible
- keep save behavior for capacity changes

### 5.3 Current Work

Current work is the drawer's primary focus.

Show:

- task title
- Jira key when present
- priority/due date when present
- hover actions: edit, done/drop as applicable

Design:

- use one subtle accent treatment
- avoid heavy glow
- keep the card compact
- preserve click/open task detail behavior

Example:

```text
Current work

test this
AM-21313 · Low · Due Mar 13
```

### 5.4 Planned Queue

Planned work should feel like an ordered queue.

Show:

- section title and count
- small `Add` action
- compact task rows
- drag handle or index
- title
- Jira key when present
- hover actions: edit, start

Example:

```text
Planned · 3                                      + Add
1  New built-in task
2  jira                                         AM-37008
3  harsha task
```

Rules:

- keep rows dense and scannable
- keep hover actions horizontal
- preserve drag/reorder behavior
- preserve set-current behavior
- preserve title edit behavior

### 5.5 Manager Follow-Up

The Manager Desk follow-up area should be useful but smaller.

Current large explanation card should become a compact action row.

Example:

```text
Manager follow-up                         Capture
Private follow-up linked to Harsha · Current context: AM-21313
```

Rules:

- keep capture behavior
- keep developer link context
- keep current tracker context when available
- remove repeated long explanatory text from default view

### 5.6 Manager Notes

Notes should stay available but quieter.

Example:

```text
Notes                                      Edit
No notes yet.
```

Rules:

- preserve edit/save/cancel behavior
- keep empty state short
- do not let notes visually compete with current/planned work

### 5.7 Completed And Dropped Work

Completed and dropped work should be collapsed by default.

Example:

```text
Completed · 1                              Show
Dropped · 0
```

Rules:

- show counts
- allow expand/collapse
- keep rows compact when expanded
- preserve read-only display in historical mode

---

## 6. Interaction Model

### Primary Interactions

- row click opens task detail where supported
- hover over current task shows horizontal actions
- hover over planned task shows horizontal actions
- add task remains available near planned queue
- mark inactive remains in drawer header
- status/capacity edits remain in the top area

### Read-Only History Mode

When viewing historical dates:

- mutating actions must be hidden or disabled
- status/capacity controls should not be editable
- add task should be hidden
- task action hover buttons should be hidden
- completed/planned/current sections should remain readable

---

## 7. Visual Direction

The drawer should feel:

- focused
- dense but calm
- manager-friendly
- easy to scan repeatedly

Use:

- small labels
- clear section hierarchy
- subtle borders/dividers
- one accent treatment for current work
- red/amber only for meaningful risk signals

Avoid:

- big badge clusters
- large explanatory cards
- repeated colored pills
- strong glow effects
- sections with equal visual weight

---

## 8. Component Notes

### `DeveloperTrackerDrawer.tsx`

Main redesign target.

Expected changes:

- compact header
- quiet status/capacity summary
- reordered section hierarchy
- smaller Manager Desk follow-up section
- collapsed completed/dropped sections

If the file grows too large, split smaller presentational components:

- `DeveloperDrawerHeader`
- `DeveloperDrawerStatusSummary`
- `DeveloperDrawerTaskSections`
- `DeveloperDrawerFollowUp`
- `DeveloperDrawerHistorySection`

### `TrackerItemRow.tsx`

Keep the row behavior, but ensure it supports:

- compact queue styling
- horizontal hover actions
- current-work visual variant
- clean read-only display

### `TrackerItemRowActions.tsx`

Already improved to show horizontal hover actions. Preserve that direction.

### `ManagerDeskCaptureDialog.tsx`

No major redesign required for this pass. The drawer should only change the entry point to the capture flow.

---

## 9. Suggested Implementation Sequence

1. Refactor drawer header into a compact layout.
2. Replace large status pill row with a quieter status/capacity area.
3. Redesign current work as the primary compact task card.
4. Redesign planned queue with dense rows and inline add action.
5. Replace Manager Desk card with compact follow-up row.
6. Simplify Manager Notes section.
7. Collapse Completed and Dropped sections by default.
8. Verify historical read-only behavior.
9. Update tests for drawer interactions and read-only states.

---

## 10. Acceptance Criteria

- manager can identify current work within 2 seconds of opening the drawer
- planned queue is readable without scanning through large spacing
- status and risk signals are visible but not visually dominant
- Manager Desk follow-up entry takes minimal space
- completed/dropped history does not dominate the default drawer view
- hover task actions remain horizontal and easy to click
- mark inactive remains discoverable in the header
- read-only history mode hides mutating actions
- drawer remains usable at common laptop heights without excessive scrolling

---

## 11. Implementation Checklist

### Layout

- [ ] Compact the drawer header height.
- [ ] Keep developer name, initials, status, inactive icon, and close button visible.
- [ ] Move key metrics into one quiet summary line.
- [ ] Reduce top padding and repeated separators.
- [ ] Reorder drawer sections around current work and planned queue.

### Status And Signals

- [ ] Replace large status pill row with compact status controls.
- [ ] Preserve status update behavior.
- [ ] Preserve capacity edit/save behavior.
- [ ] Show stale/overdue signals as small inline chips or text.
- [ ] Avoid repeated status display in multiple nearby places.

### Current Work

- [ ] Make current work the most prominent drawer section.
- [ ] Show title, Jira key, priority, and due date when present.
- [ ] Use subtle accent styling without heavy glow.
- [ ] Preserve task detail opening.
- [ ] Preserve edit title behavior.
- [ ] Preserve done/drop behavior.
- [ ] Keep hover actions horizontal.

### Planned Queue

- [ ] Render planned items as a compact ordered queue.
- [ ] Keep count visible in the section heading.
- [ ] Move Add task action into the planned heading area.
- [ ] Preserve add task behavior.
- [ ] Preserve drag/reorder behavior.
- [ ] Preserve set-current behavior.
- [ ] Preserve edit title behavior.
- [ ] Keep hover actions horizontal and easy to click.

### Manager Follow-Up

- [ ] Replace large explanatory card with compact follow-up row.
- [ ] Preserve capture follow-up behavior.
- [ ] Preserve current tracker context.
- [ ] Keep Manager Desk link/capture copy short.

### Notes

- [ ] Keep manager notes available.
- [ ] Preserve edit/save/cancel behavior.
- [ ] Use a short empty state.
- [ ] Keep notes visually secondary to current/planned work.

### History Sections

- [ ] Collapse Completed section by default.
- [ ] Collapse Dropped section by default when present.
- [ ] Show counts while collapsed.
- [ ] Preserve compact row display when expanded.
- [ ] Preserve historical read-only display.

### Read-Only Mode

- [ ] Hide add task action.
- [ ] Hide mutating task hover actions.
- [ ] Disable status/capacity edits.
- [ ] Hide mark inactive action.
- [ ] Keep current/planned/completed/dropped information readable.

### Testing And Validation

- [ ] Update drawer tests for compact status/header behavior.
- [ ] Update tests for planned queue add action placement.
- [ ] Add/adjust tests for collapsed completed/dropped sections.
- [ ] Verify current task edit/done/drop still works.
- [ ] Verify planned task edit/start/reorder still works.
- [ ] Verify Manager Desk capture still opens with correct context.
- [ ] Verify historical read-only mode hides mutating actions.
- [ ] Run `npm run test --workspace=client -- TeamTracker.test.tsx`.
- [ ] Run `npm run typecheck`.
- [ ] Manually review drawer at common desktop and laptop heights.
