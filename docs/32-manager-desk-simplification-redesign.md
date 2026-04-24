# Manager Desk Simplification Redesign

**Date:** April 24, 2026  
**Status:** Draft for implementation planning  
**Audience:** Product, frontend implementation, backend implementation, QA  
**Related docs:** `docs/15-manager-desk-requirements.md`, `docs/16-manager-desk-frontend-handoff.md`, `docs/31-manager-desk-persistent-workspace-proposal.md`

---

## 1. Executive Summary

Manager Desk has the right functional foundation, but the current screen feels heavier than the workflow it is meant to support.

The page currently exposes many separate visible areas:

- Focus
- Waiting
- Meetings
- Inbox
- Completed
- left-side rail
- top metrics
- filter chips
- quick capture

Each area is individually understandable, but together they create too much interpretation work. A manager opening the page should not first need to decide which block to inspect. The page should immediately answer:

**What is still on my plate, and what needs attention now?**

This redesign proposal keeps the existing capabilities but changes the information architecture. Manager Desk should move from a multi-section dashboard into a calmer operating list.

The recommended model is:

**One persistent Manager Desk work list, with status/type indicators and optional lenses.**

---

## 2. Product Diagnosis

### 2.1 Current Problem

The current UI makes Manager Desk feel like another dashboard instead of a daily working surface.

The manager sees many compartments at once:

- planned work in Focus
- blocked work in Waiting
- time-bound conversations in Meetings
- fresh captures in Inbox
- finished work in Completed
- repeated item titles in the side rail and main content

This creates resistance because the manager has to spend mental energy on navigation before doing useful work.

### 2.2 Root Cause

The screen currently turns several different dimensions into separate panels:

| Dimension | Examples | Current UI Risk |
|---|---|---|
| Status | inbox, planned, active, waiting, done | Becomes separate sections |
| Type | meeting, task, follow-up, defect, decision | Becomes separate sections |
| Workflow stage | captured, triaged, working, closed | Competes with status |
| Attention level | overdue, waiting too long, high priority | Buried among sections |

These dimensions are useful, but they should not all become permanent layout blocks.

### 2.3 Desired Product Feeling

Manager Desk should feel like:

- a working notebook
- an active desk
- a lightweight command list
- a place where open work remains visible until resolved

It should not feel like:

- a dashboard of many widgets
- a project management board
- a daily reset checklist
- a page that requires re-learning every morning

---

## 3. Redesign Principle

The main design principle is:

**One list, many signals.**

Instead of showing separate blocks for Focus, Waiting, Meetings, Inbox, and Completed, the page should show one primary work list where each item carries the signals needed to understand it.

Examples of row-level signals:

- status: `Inbox`, `Planned`, `Active`, `Waiting`, `Done`
- type: `Task`, `Meeting`, `Follow-up`, `Defect`, `Decision`
- person: linked developer or counterpart
- date signal: `Today`, `Overdue`, `Waiting 2d`, `Due Fri`
- source: Jira issue, manual capture, meeting note
- priority: only when it changes the manager's decision

This keeps the workflow power while lowering visual complexity.

---

## 4. Proposed Information Architecture

### 4.1 Top Command Bar

The top area should orient the manager without becoming a dashboard.

Recommended content:

- page title: `Manager Desk`
- selected date
- live/today state
- primary counts only:
  - open
  - active
  - overdue or needs attention
- `Capture` action
- search/filter entry point

Avoid a large metric strip unless each metric directly changes what the manager should do next.

### 4.2 Primary Work List

The main body should be one unified list named something like:

- `Today's Desk`
- `Open Work`
- `Manager Work`

Recommended default scope:

- unresolved manager-owned work
- tasks continuing from previous days
- work created today
- waiting items still unresolved
- meetings or time-bound items relevant to the selected day
- completed items only as a collapsed summary

Recommended default sorting:

1. overdue items
2. active items
3. waiting items that require follow-up
4. meetings or time-bound items for the day
5. planned work
6. inbox items

The list should answer the manager's next-action question before it answers reporting questions.

### 4.3 Lenses Instead Of Permanent Sections

The current sections should become optional lenses or filters.

Recommended lenses:

- `All`
- `Needs attention`
- `Waiting`
- `Meetings`
- `Inbox`
- `Done`

These lenses let the manager narrow the view without forcing all categories onto the screen at once.

### 4.4 Detail Panel

The list should stay compact. Deeper editing should move into a selected-item detail panel.

The detail panel should support:

- title
- status
- type/kind
- category
- priority
- linked Jira issues
- linked developers
- counterpart or meeting participants
- context note
- next action
- follow-up date
- outcome
- delete/drop/archive actions where allowed

This prevents every row from becoming a large form.

### 4.5 Completed Work

Completed work should not be a large default section.

Recommended default treatment:

```text
Done today: 3
```

The manager can expand this if needed, but completed work should not compete visually with open work.

### 4.6 Side Rail

The current side rail should be removed or repurposed.

Preferred options:

1. Remove it entirely and give more width to the work list and detail panel.
2. Convert it into a compact lens navigation area.

Avoid showing the same task titles in both the rail and the main list.

---

## 5. Proposed Workflow

### 5.1 Capture

The manager should be able to capture quickly without choosing every field.

Default behavior:

```text
Manager enters title
  -> item appears in the work list as Inbox
  -> manager can clarify later
```

### 5.2 Clarify

The manager should be able to convert an inbox item into structured work from the detail panel or inline controls.

Clarification includes:

- type
- status
- owner/counterpart
- linked issue
- follow-up date
- next action

### 5.3 Work

The manager should be able to update state directly from the row or detail panel:

- start
- plan
- mark waiting
- mark done
- drop

### 5.4 Continue

Unresolved work should remain visible automatically.

The product should not require a daily carry-forward action. A new date changes the lens, not the task's existence.

Recommended copy:

```text
5 open items continued from earlier days
```

This gives useful continuity without making the manager perform a daily ritual.

---

## 6. Visual Direction

Manager Desk should use a quiet operational interface.

Recommended qualities:

- dense enough for daily work
- fewer boxes
- strong row scanning
- restrained color
- state shown through small chips, icons, and date signals
- clear selected state
- detail on demand

Avoid:

- many equal-weight panels
- decorative dashboard cards
- large empty states for every category
- repeated task lists
- too many accent colors
- making meetings/waiting/inbox look like separate products

---

## 7. Implementation Phases

### Phase 1: Information Architecture

Goal: replace the multi-section mental model with a unified desk model.

Scope:

- define the primary unified list
- convert Focus, Waiting, Meetings, Inbox, and Completed into item signals and lenses
- decide default sorting for attention-first use
- decide how historical, today, and future date lenses behave
- remove or repurpose duplicate side-rail behavior

Expected outcome:

The manager sees one main place where open work lives.

### Phase 2: Row Design

Goal: make each task row highly scannable without becoming visually heavy.

Scope:

- design compact item rows
- show status, type, person, date signal, priority, and source where relevant
- support quick status actions
- support selected/hover/focus states
- keep row height stable across common item types
- make overdue and waiting signals visible but not noisy

Expected outcome:

The manager can scan the desk in seconds and understand what each item is.

### Phase 3: Detail Panel

Goal: move deeper editing and context out of the main list.

Scope:

- add selected-item detail panel, drawer, or split-view editor
- support full item editing from the detail panel
- support linked issues and developers
- support context, next action, follow-up date, and outcome
- handle empty selection gracefully
- preserve keyboard and accessibility behavior

Expected outcome:

The main list stays clean while full item management remains available.

### Phase 4: Attention Lens

Goal: make the default view actively helpful.

Scope:

- add `Needs attention` logic
- surface overdue, active, waiting-due, and untriaged items first
- show continuation context for unresolved previous-day work
- keep completed work collapsed by default
- make filters/lenses predictable and easy to reset

Expected outcome:

Manager Desk opens to the work that matters most, not just a neutral inventory.

---

## 8. Development Checklist

Use this checklist to track implementation progress. Update it as work is completed.

### Phase 1: Information Architecture

- [x] Confirm final unified list name and page copy
- [x] Define item dimensions used by the list: status, type/kind, category, priority, person, date signal, source
- [x] Define default list scope for today's view
- [x] Define default list scope for past date views
- [x] Define default list scope for future date views
- [x] Define attention-first sorting rules
- [x] Replace permanent Focus/Waiting/Meetings/Inbox sections with lenses or filters
- [x] Decide whether to remove or repurpose the left rail
- [x] Ensure unresolved work persists across date changes without manual carry-forward

### Phase 2: Row Design

- [x] Design compact row layout for desktop
- [x] Design compact row layout for mobile or narrow screens
- [x] Add status chip treatment
- [x] Add type/kind indicator treatment
- [x] Add person/counterpart display
- [x] Add Jira/manual source display
- [x] Add date signals for today, overdue, waiting duration, and future follow-up
- [x] Add quick row actions for start, waiting, done, and drop where appropriate
- [x] Add selected, hover, keyboard focus, loading, and mutation states
- [x] Verify row text truncation and wrapping behavior

### Phase 3: Detail Panel

- [x] Define detail panel layout
- [x] Support editing title
- [x] Support editing status
- [x] Support editing type/kind and category
- [x] Support editing priority
- [x] Support editing follow-up date or planned date
- [x] Support editing context note
- [x] Support editing next action
- [x] Support editing outcome
- [x] Support linked Jira issues
- [x] Support linked developers
- [x] Support counterpart or participant text
- [x] Support delete/drop/archive actions according to existing permissions
- [x] Add empty selection state
- [x] Add save, error, and optimistic update behavior

### Phase 4: Attention Lens

- [x] Define `Needs attention` rules
- [x] Add `All` lens
- [x] Add `Needs attention` lens
- [x] Add `Waiting` lens
- [x] Add `Meetings` lens
- [x] Add `Inbox` lens
- [x] Add `Done` lens
- [x] Keep completed work collapsed by default
- [x] Show continuation count for unresolved previous-day work
- [x] Ensure filter reset behavior is obvious
- [x] Add empty states for filtered views without showing large empty panels

### Validation

- [ ] Manager can capture a task quickly
- [ ] Manager can find all open work in one list
- [ ] Manager can distinguish task, meeting, waiting, inbox, and done items without separate sections
- [ ] Manager can update status without opening a heavy form
- [ ] Manager can open full details when needed
- [ ] Manager can see unresolved older work without manual carry-forward
- [ ] Manager can expand completed work when needed
- [ ] Page remains understandable within 10 seconds of opening
- [ ] No duplicate task list appears in both rail and main content
- [ ] Frontend tests updated for view logic and interactions
- [ ] Backend or shared contract changes tested if needed
- [ ] `npm run typecheck` passes
- [ ] `npm run build:check` passes

---

## 9. Success Criteria

The redesign should be considered successful when:

- the first visible decision is what to work on, not where to look
- open manager work is visible in one primary place
- meetings, waiting, inbox, and completed work are represented without creating competing panels
- unfinished work naturally continues across days
- the page feels useful even when only a few items exist
- the manager can use the screen during a busy day without feeling like they must maintain the tool itself
