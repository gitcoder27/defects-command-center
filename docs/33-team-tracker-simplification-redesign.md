# Team Tracker Simplification Redesign

**Date:** April 24, 2026  
**Status:** Implemented in frontend redesign pass  
**Audience:** Product, frontend implementation, QA  
**Related docs:** `docs/07-team-tracker-prd.md`, `docs/08-team-tracker-implementation-plan.md`, `docs/26-team-tracker-manager-review-and-enhancement-roadmap.md`

---

## 1. Summary

Team Tracker has the right workflow foundation, but the current screen is visually overloaded. It exposes too many filters, signals, badges, actions, card borders, and repeated status labels at the same time.

The page should be redesigned around one manager question:

**Who needs my attention right now, and what is each person working on?**

The redesign should keep the existing backend behavior and drawer workflows, but simplify the default screen. The page should feel like a calm team operating list, not an alarm dashboard.

Recommended direction:

- make `Needs attention` the first default focus
- replace the busy card grid with a scannable team roster
- show fewer actions by default
- move secondary work into drawers and menus
- reduce color, borders, badge density, and repeated labels

---

## 2. Current Diagnosis

### 2.1 Main Problems

The current screen creates friction because:

- the top area has too many status filter pills, including zero-count states
- attention signals repeat across the summary strip, attention cards, developer cards, badges, and metrics
- each developer card exposes multiple buttons before the manager has chosen a person
- red, yellow, cyan, green, glowing borders, and badge fills all compete for attention
- the card grid is hard to compare horizontally when the team has several active signals
- helpful features exist, but they are all visible at once

### 2.2 Root Cause

The screen currently turns every useful signal into a permanent visible object.

| Signal | Current Treatment | Redesign Treatment |
|---|---|---|
| Status | top filter pill, status pill, card styling | one small row status |
| Attention | full section plus badges | focused attention queue |
| Staleness | badges, color, metrics | one compact freshness label |
| Workload | card metadata | simple load column |
| Quick actions | visible on cards | contextual primary action, secondary actions in drawer |
| Sort/group/views | separate controls | combined controls menu |

The capability set is valuable. The visual exposure is the problem.

---

## 3. Product Principle

The core principle is:

**Progressive disclosure, not permanent exposure.**

The first screen should show only what helps a manager decide where to look next. Details, editing, and lower-frequency actions should live behind row selection, hover actions, or the existing detail drawer.

The page should optimize for:

- fast scan
- low learning effort
- calm visual hierarchy
- quick manager intervention
- easy comparison across developers

It should not optimize for showing every possible state at the same time.

---

## 4. Proposed Information Architecture

### 4.1 Top Command Area

Keep the top area short and stable.

Recommended visible elements:

- page title: `Team Tracker`
- selected date
- refresh control
- search field
- view switcher: `Attention`, `Team`, `Inactive`
- compact controls menu for sort, group, and saved views

Recommended summary copy:

```text
4 need attention · 3 no current work · 3 overdue Jira · 1 inactive
```

Only show non-zero summary signals. Do not show a long row of filter pills with zero counts.

### 4.2 View Switcher

Use three primary lenses:

| Lens | Purpose |
|---|---|
| `Attention` | default manager triage view |
| `Team` | full roster of developer work state |
| `Inactive` | hidden/restorable developers |

The current filters can remain as secondary filters, but they should not dominate the page header.

### 4.3 Attention View

The default screen should open with a compact attention queue.

Each attention row should answer:

- who
- why they need attention
- current work title, or `No current work`
- last check-in
- planned count/load
- one recommended action

Example row:

```text
Deepak Singh Bhainsora        No current work · 1 overdue Jira
Last check-in: none           Planned: 2
[Set current]
```

Rules:

- show at most the top 5 attention items by default
- use a small severity marker, not a glowing card
- combine related reasons into one readable line
- expose one primary action per row
- row click opens the existing developer drawer

### 4.4 Team View

The full board should become a roster-style list instead of a default card grid.

Recommended columns:

| Column | Content |
|---|---|
| Developer | name, initials, small status |
| Current work | current item title or `No current work` |
| Next | planned count or next item summary |
| Load | assigned/capacity or assigned count |
| Freshness | last check-in or stale state |
| Risk | overdue/blocker/over-capacity summary |
| Action | one contextual action |

Example:

```text
Ayan Saha       system             12 next   13 load   No check-in   3 overdue   Open
Deepak Singh    No current work     2 next    2 load    No check-in   1 overdue   Set current
Harsha N.       No current work     5 next    5 load    No check-in   2 overdue   Set current
Shubham N.      No current work     1 next    1 load    No check-in   -           Set current
```

The row should stay compact. Detailed planned work, completed work, dropped work, notes, and check-ins should remain in the drawer.

### 4.5 Inactive View

Inactive developers should not take up a large section in the default flow.

Recommended treatment:

- show inactive count in the top summary if non-zero
- provide a dedicated `Inactive` lens
- list inactive developers with restore action
- keep notes visible only when present

### 4.6 Detail Drawer

The existing drawer should become the main place for detail and editing.

Keep these actions in the drawer:

- add task
- mark inactive
- update status
- add check-in
- set current from planned items
- mark done/drop
- reorder planned work
- edit notes
- open task detail
- capture Manager Desk follow-up

The list row should not become a mini-form.

---

## 5. Visual Design Direction

### 5.1 General Feel

The redesigned page should feel:

- quiet
- structured
- fast to scan
- confident
- manager-focused

Avoid:

- glowing cards
- large colored borders
- many filled badges
- multiple competing accent colors
- oversized pill filters
- repeated explanatory text

### 5.2 Color

Use color sparingly.

Recommended approach:

- neutral background and surfaces
- one primary accent for selected navigation and primary actions
- red only for true blocking/overdue danger
- amber only for stale/no-current warnings
- green only for done/on-track confirmation
- no full-card red/yellow/cyan glow

### 5.3 Typography

Use typography for hierarchy before using color.

Recommended approach:

- developer name: strongest row text
- current work: second strongest
- metadata: smaller muted text
- risk labels: short and direct
- no all-caps section labels unless very small and rare

### 5.4 Density

The screen should be denser than a marketing page but calmer than the current dashboard.

Recommended row height:

- attention row: medium height, 2 lines max
- team row: compact, 1 to 2 lines
- drawer: full detail

The manager should see more people with less scrolling.

---

## 6. Interaction Model

### 6.1 Primary Action Rule

Each row should show one obvious action based on state.

| State | Visible Action |
|---|---|
| no current work | `Set current` |
| stale/no check-in | `Follow up` |
| blocked/at risk | `Open` |
| normal | no button or subtle `Open` |
| read-only history | no mutating action |

Secondary actions move to the drawer or an overflow menu.

### 6.2 Row Behavior

Rows should be clickable and keyboard-accessible.

Expected behavior:

- click row: open developer drawer
- click current/planned item: open task detail drawer
- click primary action: perform or open the relevant flow
- keyboard focus must be visible
- hover should reveal secondary affordance lightly, not change layout

### 6.3 Loading And Empty States

Replace the spinner-only loading state with skeleton rows that match the final layout.

Empty states should be short:

- no attention: `No one needs attention right now.`
- no team matches search: `No developers match this search.`
- no inactive developers: `No inactive developers.`

---

## 7. Component-Level Implementation Notes

### 7.1 `TeamTrackerPage.tsx`

Change the page layout from:

```text
header
summary filter strip
toolbar
mode banner
attention section
inactive tray
card board
```

to:

```text
header command area
compact summary
view switcher / controls
selected view content
drawers and dialogs
```

The live/history mode banner should not be a permanent large block. Use a small historical notice only when viewing a past date.

### 7.2 `TrackerSummaryStrip.tsx`

Replace the long filter strip with compact summary text/chips.

Rules:

- hide zero-count signals
- keep `All` out of the visual summary unless it is a selected filter
- do not show more than 4 summary chips before collapsing to `More`
- summary chips should be quiet, not large buttons

### 7.3 `TrackerBoardToolbar.tsx`

Simplify toolbar controls.

Recommended:

- keep search visible
- collapse sort, group, and saved views into a single `View options` menu
- show active sort/group as small text only when non-default
- keep saved views available but not visually dominant

### 7.4 `AttentionQueue.tsx` and `AttentionCard.tsx`

Convert attention cards into compact rows.

Rules:

- no rank box unless rank is truly useful
- no glowing danger shadows
- no repeated metric grid
- show one reason line
- show one recommended action
- row click opens developer drawer

### 7.5 `TrackerBoard.tsx`

Add a roster/list rendering mode as the default `Team` view.

The existing card grid may remain as an optional saved/view mode only if needed, but it should not be the default.

### 7.6 `DeveloperTrackerCard.tsx`

If cards remain available, simplify them:

- no full-card glow
- fewer badges
- one primary action
- no always-visible `Inactive` and `Add task` buttons
- compact current work and planned count

### 7.7 `InactiveDeveloperTray.tsx`

Move inactive developers behind the `Inactive` lens.

The default page should only show a small inactive count when there are inactive developers.

---

## 8. Suggested Implementation Sequence

1. Add local view state for `Attention`, `Team`, and `Inactive`.
2. Replace the summary strip with compact non-zero summary chips.
3. Simplify the toolbar and collapse sort/group/views.
4. Redesign attention cards as compact attention rows.
5. Build the roster-style team view.
6. Move inactive developers into the inactive lens.
7. Reduce card/badge/color styling across remaining components.
8. Add skeleton rows and concise empty states.
9. Update tests for the new default view and core actions.

---

## 9. Acceptance Criteria

The redesign is successful when:

- a new manager can identify who needs attention within 5 seconds
- the page no longer shows zero-count filter pills by default
- the default screen exposes no more than one visible action per developer row
- attention rows are readable without scanning multiple badge clusters
- team state can be compared horizontally across developers
- secondary actions are still available in drawers or menus
- history mode is clearly read-only without consuming a large permanent banner
- mobile layout remains usable without horizontal overflow

---

## 10. Implementation Checklist

### Product And UX

- [x] Confirm default lens should be `Attention` for live/today view.
- [x] Confirm past-date/history view default lens behavior.
- [x] Define exact non-zero summary signals shown in the compact summary.
- [x] Define row priority rules for the single visible action.
- [ ] Decide whether the existing card grid remains as an optional view.

### Header And Controls

- [x] Keep page title, date selector, refresh, and search visible.
- [x] Add view switcher: `Attention`, `Team`, `Inactive`.
- [x] Replace long summary filter strip with compact summary chips/text.
- [x] Hide zero-count summary items.
- [x] Collapse sort, group, and saved views into a quieter controls menu.
- [x] Replace the live-mode explanatory banner with a smaller treatment.
- [x] Keep history/read-only state visible on past dates.

### Attention View

- [x] Convert attention cards into compact rows.
- [x] Show developer name, reason line, freshness, load/planned count, and one action.
- [x] Show the active current task title directly in the row when current work exists.
- [x] Remove rank boxes unless explicitly retained.
- [x] Remove glowing danger/warning card styles.
- [x] Combine repeated reason badges into one readable sentence.
- [x] Limit default attention list to a manageable count or make it visually compact.
- [x] Ensure row click opens the developer drawer.
- [x] Ensure primary action does not also trigger row open.

### Team View

- [x] Implement roster/list layout as the default full-team view.
- [x] Include developer, current work, next/planned, load, freshness, risk, and action columns.
- [x] Keep rows compact and comparable.
- [x] Move detailed planned/completed/dropped work into the drawer.
- [x] Show `No current work` clearly without overusing warning color.
- [x] Support search, sort, grouping, and saved views in the roster layout.
- [x] Preserve task detail opening from current/planned items.

### Inactive View

- [x] Move inactive developers out of the main default flow.
- [x] Show inactive count only when non-zero.
- [x] Provide restore/reactivate action in the inactive lens.
- [x] Preserve inactive notes where available.

### Drawer And Actions

- [x] Keep add task in the developer drawer or contextual menu.
- [x] Keep mark inactive in the drawer or overflow menu.
- [x] Keep status update and check-in flows in the drawer.
- [x] Keep set-current, done, drop, reorder, and note editing flows intact.
- [x] Preserve Manager Desk follow-up capture.
- [x] Ensure read-only history disables mutating actions.

### Visual Polish

- [x] Remove full-card neon/glow treatment.
- [x] Reduce badge count and badge saturation.
- [x] Use one primary accent for navigation and primary actions.
- [x] Use red/amber/green only for semantic states.
- [x] Use typography and spacing for hierarchy before color.
- [x] Check desktop and mobile spacing for overflow or cramped controls.

### Testing And Validation

- [x] Update frontend tests for new default lens/rendering.
- [x] Add tests for switching between `Attention`, `Team`, and `Inactive`.
- [x] Add tests for single primary row action behavior.
- [x] Verify drawer opening still works from attention rows and team rows.
- [x] Verify read-only history mode hides or disables mutating actions.
- [x] Run `npm run test --workspace=client`.
- [x] Run `npm run typecheck`.
- [ ] Capture before/after screenshots for PR review.
