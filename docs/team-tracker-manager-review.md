# Team Tracker Manager Review

Date: 2026-03-17

## Scope

This review covers the current Team Tracker manager experience implemented in:

- `client/src/components/team-tracker/*`
- `client/src/hooks/useTeamTracker.ts`
- `client/src/hooks/useTeamTrackerMutations.ts`
- `server/src/services/team-tracker.service.ts`
- `server/src/services/manager-desk.service.ts`

This is a code-based product review from the manager's perspective. It is not a live usability test, so findings below combine direct implementation facts with workflow-level inference.

## Executive Summary

The Team Tracker already has a strong core shape for a manager workflow:

- a fast top-of-page scan with summary chips
- a ranked attention queue
- a card board for the team
- a deep developer drawer for follow-up
- cross-linking into Manager Desk for manager-owned work

The biggest gaps are not visual polish problems. They are workflow clarity problems:

1. Team Tracker task creation is not conceptually clean. In practice, Team Tracker "Add Task" creates Manager Desk-backed work, and opening tracker task detail can silently create a Manager Desk item.
2. The status/check-in workflow is split in a way that makes the "Needs follow-up" signal easy to create but awkward to resolve.
3. The page does not scale well for larger teams because it lacks search, sorting, grouping, and richer quick actions.
4. Carry-forward is useful but too coarse: it is all-or-nothing, preview is count-only, and Manager Desk-linked tracker work is excluded.
5. The data model is ahead of the UI in several places: check-in authorship exists in the model, assignment lookup exists in the platform, direct tracker item creation exists in hooks, but the Team Tracker UI does not expose these capabilities well.

## Current Manager Workflows

### 1. Daily scan and prioritization

Current flow:

- Manager lands on Team Tracker and sees summary chips, attention queue, inactive tray, and developer cards.
- Summary chips filter the board by one condition at a time.
- Attention queue ranks follow-ups from the current board state.

What works:

- The information hierarchy is good. The screen answers "what needs me now?" before "show me everyone."
- Attention and board views complement each other well.
- The inactive tray reduces noise on the active board.

What is missing:

- No search by developer name, Jira key, or note.
- No board sort controls.
- No grouping by status, risk, capacity, or stale state.
- No saved manager views such as "Morning triage", "Blocked only", or "No current work".

Manager impact:

- This works for a small team.
- It will become scan-heavy and mentally expensive as the team grows.

### 2. Date navigation and day rollover

Current flow:

- Manager can move backward/forward by day, jump to today, refresh, and carry unfinished work forward.
- The page can prompt to carry forward unfinished work from the previous day.

What works:

- Historical review is simple and obvious.
- The carry-forward prompt is a good day-start guardrail.

What is missing:

- Carry-forward preview is count-only, not item-level.
- Carry-forward is all-or-nothing.
- There is no selective carry-forward by developer or task.
- Dismissing the prompt is stored in session storage only.

Manager impact:

- The workflow is useful, but not safe enough for nuanced day planning.

### 3. Developer drill-in and follow-up

Current flow:

- Clicking a card opens a right-side drawer with status, capacity, current/planned/completed/dropped work, manager notes, and check-ins.
- Manager can change status, adjust capacity, add notes, reorder planned work, set current work, mark work done, drop work, and capture a Manager Desk follow-up.

What works:

- The drawer gives a strong per-developer control center.
- Capacity, signals, notes, and execution state are all close together.
- The manager follow-up capture is a good separation of "team work" vs "my work".

What is missing:

- Check-ins show content and relative time, but not who authored them.
- There is no unified "status update + rationale + follow-up" action.
- There is no return date/expected end when marking someone inactive.

Manager impact:

- The drawer is useful, but it does not yet feel like a full management console.

### 4. Task assignment and execution control

Current flow:

- Managers can quick-add work from cards and add work from the drawer.
- They can link a synced Jira issue, set current work, mark done, drop work, and open task detail.

What works:

- Quick task assignment is lightweight.
- Set current / done / drop controls are appropriate for daily management.
- Undo on "mark done" is a good safety feature.

What is missing:

- No visible assignment-conflict check when choosing a Jira issue in Team Tracker.
- No explicit delete/remove action in the normal drawer flow.
- No clear distinction between a tracker-only task and a Manager Desk-backed task.

Manager impact:

- The workflow is functional, but the underlying task model is too implicit.

## Strengths Worth Preserving

- The overall page structure is correct for a manager dashboard.
- The ranked attention queue is stronger than a flat "alerts" list.
- Signal design combines freshness, risk, capacity, and overdue linked work well.
- The inactive tray is a good noise-reduction pattern.
- The drawer keeps the manager in context instead of forcing route changes.

## Key Gaps and Enhancements

### High Priority

#### 1. Team Tracker task creation has hidden cross-system behavior

Observed:

- Team Tracker page uses `useCreateManagerDeskItem` for task creation instead of `useAddTrackerItem`.
- Both card quick-add and drawer add-task route through `handleCreateTask`, which creates a Manager Desk item and lets sync place it into Team Tracker.
- Opening tracker task detail can auto-create a Manager Desk item if the tracker item is not already linked.

Why this is a problem:

- The manager thinks they are adding or inspecting Team Tracker work.
- Under the hood, they may be creating Manager Desk artifacts without being told.
- This makes ownership, lifecycle, and carry-forward behavior difficult to reason about.

Recommended enhancement:

- Make the model explicit and consistent.
- Pick one of these designs:
  - All Team Tracker tasks are always Manager Desk-backed. If so, state this clearly in UI copy and make carry-forward/support behavior consistent.
  - Team Tracker tasks can remain tracker-local. If so, opening detail should not silently promote them into Manager Desk. Add an explicit "Promote to Manager Follow-Up" action instead.

Evidence:

- `client/src/components/team-tracker/TeamTrackerPage.tsx:5`
- `client/src/components/team-tracker/TeamTrackerPage.tsx:176`
- `client/src/hooks/useTeamTrackerMutations.ts:61`
- `server/src/services/manager-desk.service.ts:639`
- `server/src/services/manager-desk.service.ts:1080`

#### 2. Carry-forward excludes Manager Desk-backed tracker work

Observed:

- Carry-forward preview and carry-forward both exclude unfinished items where `managerDeskItemId` is present.

Why this is a problem:

- From a manager perspective, tasks they assigned through Team Tracker should be the most important work to carry over.
- In the current implementation, the tasks created from Team Tracker UI are typically Manager Desk-backed, so carry-forward behavior becomes inconsistent and surprising.

Recommended enhancement:

- Carry forward open Team Tracker assignments regardless of backing source, or explicitly split the action:
  - "Carry forward developer queue"
  - "Carry forward manager-assigned work"
- If exclusion remains intentional, the preview must explain what is excluded and why.

Evidence:

- `server/src/services/team-tracker.service.ts:856`
- `server/src/services/team-tracker.service.ts:904`

#### 3. Status workflow makes "Needs follow-up" easy to create but awkward to resolve

Observed:

- Status can be changed immediately from pills in the drawer.
- Check-in API supports status updates together with the note.
- Drawer check-in UI only accepts text and does not expose status.
- Backend explicitly tracks "status changed without follow-up."

Why this is a problem:

- The system identifies a good management smell, but the UI does not give the manager a clean way to resolve it in one move.
- A manager marking someone `blocked` or `at_risk` should usually capture reason, next action, and owner immediately.

Recommended enhancement:

- Replace free-floating status pills with a compact "Update Status" action sheet:
  - status
  - short rationale
  - optional next follow-up date/time
  - optional check-in note
- For risk statuses, require at least a short rationale.

Evidence:

- `client/src/components/team-tracker/DeveloperTrackerDrawer.tsx:113`
- `client/src/components/team-tracker/DeveloperTrackerDrawer.tsx:211`
- `client/src/components/team-tracker/DeveloperTrackerDrawer.tsx:520`
- `client/src/hooks/useTeamTrackerMutations.ts:138`
- `server/src/services/team-tracker.service.ts:54`
- `server/src/services/team-tracker.service.ts:611`

#### 4. Task title editing is effectively disabled in the live Team Tracker drawer

Observed:

- Drawer rows pass both `onOpen` and `onUpdateTitle`.
- `TrackerItemRow` only allows title editing when `onOpen` is not active.

Why this is a problem:

- The code suggests inline title editing is intended.
- In the actual Team Tracker drawer, task rows are clickable to open detail, so title edit mode is never reachable.

Recommended enhancement:

- Separate row-open behavior from title edit behavior.
- Good patterns:
  - make only the title/body open detail and keep an explicit edit icon
  - or use a dedicated kebab/menu for open/edit/delete

Evidence:

- `client/src/components/team-tracker/DeveloperTrackerDrawer.tsx:297`
- `client/src/components/team-tracker/DeveloperTrackerDrawer.tsx:343`
- `client/src/components/team-tracker/TrackerItemRow.tsx:76`
- `client/src/components/team-tracker/TrackerItemRow.tsx:77`

#### 5. Check-in history hides authorship even though the model stores it

Observed:

- Check-in data includes `authorType` and `authorAccountId`.
- Drawer renders only the summary and relative time.

Why this is a problem:

- Managers need to know whether an update came from the developer or from another manager action.
- Without authorship, "last check-in" has less operational meaning.

Recommended enhancement:

- Show author badges like `Developer`, `Manager`, or display name.
- Add absolute timestamp on hover or inline secondary text.
- Highlight the latest developer-authored check-in separately from manager notes.

Evidence:

- `server/src/services/team-tracker.service.ts:156`
- `client/src/components/team-tracker/DeveloperTrackerDrawer.tsx:496`

### Medium Priority

#### 6. The board does not scale operationally for larger teams

Observed:

- Board filtering is limited to a single set of fixed summary chips.
- Active developer ordering in the backend is not explicitly sorted.

Why this is a problem:

- Managers need search, sorting, and grouping before they need more visual density.
- Unclear ordering increases scan cost because the eye cannot build stable habits.

Recommended enhancement:

- Add:
  - search by developer/Jira key/task title
  - sort by attention, name, stale age, load, blocked first
  - grouping by status or attention state
  - saved views for recurring manager routines

Evidence:

- `client/src/components/team-tracker/TrackerSummaryStrip.tsx:5`
- `server/src/services/team-tracker.service.ts:271`

#### 7. Attention queue is informative but not actionable enough

Observed:

- Attention cards show reasons and metrics, but the only action is to open the drawer.

Why this is a problem:

- The manager's top queue should support low-friction resolution.
- Opening the drawer is appropriate for deep work, but too heavy for repetitive triage.

Recommended enhancement:

- Add inline quick actions on each attention card:
  - request update
  - set current work
  - mark inactive
  - capture follow-up
  - snooze / acknowledge for a period

Evidence:

- `client/src/components/team-tracker/AttentionCard.tsx:69`

#### 8. Assignment-conflict intelligence exists, but Team Tracker does not use it

Observed:

- Platform has issue assignment lookup for a Jira key on a date.
- Team Tracker add-task forms only provide local Jira search/selection.
- Assignment visibility is used in Triage, not in Team Tracker.

Why this is a problem:

- Managers can accidentally assign the same Jira issue multiple times without seeing current ownership in the Team Tracker flow itself.

Recommended enhancement:

- When a Jira issue is selected inside Team Tracker:
  - show who already has it planned/current
  - warn on duplicate assignment
  - offer "reassign", "also assign", or "open existing assignment"

Evidence:

- `client/src/hooks/useTeamTracker.ts:36`
- `client/src/components/team-tracker/QuickAddTaskModal.tsx:241`
- `client/src/components/team-tracker/AddTrackerItemForm.tsx:111`
- `server/src/services/team-tracker.service.ts:684`

#### 9. Signal system is smart, but not explained in the UI

Observed:

- Backend computes stale, no-current, status-follow-up, overdue-linked, and over-capacity signals with configurable thresholds.
- UI shows concise labels only.

Why this is a problem:

- Managers may not trust or correctly interpret signal badges without knowing the threshold and current elapsed time.

Recommended enhancement:

- Add hover or inline detail:
  - "Stale: no check-in for 6.5h (threshold 4h)"
  - "Needs follow-up: status changed 3.2h ago with no newer check-in"

Evidence:

- `server/src/services/team-tracker.service.ts:54`
- `client/src/components/team-tracker/AttentionCard.tsx:113`

#### 10. Inactive workflow is too binary for real team operations

Observed:

- Managers can mark someone inactive with an optional note and later reactivate them.
- Inactive developers are hidden from the active board and shown in a tray.

Why this is a problem:

- Manager reality includes half-days, training, holidays, OOO ranges, and expected return dates.
- A binary inactive state is too coarse for planning and coverage decisions.

Recommended enhancement:

- Support:
  - inactive ranges
  - expected return date
  - reason presets
  - optional inline "Away today" lane on the board

Evidence:

- `client/src/components/team-tracker/AvailabilityDialog.tsx:1`
- `client/src/components/team-tracker/InactiveDeveloperTray.tsx:1`

### Lower Priority

#### 11. Relative time is not enough for management history

Observed:

- Card footer, attention queue, and check-ins rely on relative time.

Recommended enhancement:

- Show absolute timestamp on hover or in secondary text for auditability.

Evidence:

- `client/src/components/team-tracker/DeveloperTrackerCard.tsx`
- `client/src/components/team-tracker/AttentionCard.tsx:74`
- `client/src/components/team-tracker/DeveloperTrackerDrawer.tsx:511`

#### 12. Narrow-layout responsiveness may get cramped in the attention queue

Observed:

- Attention card metrics use a fixed `minWidth: 220` block.

Recommended enhancement:

- Collapse metrics under the card body at narrower widths and promote one primary KPI instead of showing all of them side-by-side.

Evidence:

- `client/src/components/team-tracker/AttentionCard.tsx:130`

## System / Performance Risks Affecting UX

### 13. The main board uses a sequential per-developer build path

Observed:

- `getBoard()` loads active developers and then builds each developer day in a loop.
- The page polls every 30 seconds.

Why this matters:

- This is the main manager screen.
- As team size grows, sequential day construction plus polling will make the experience feel slower and less stable.

Recommended enhancement:

- Batch-load days, items, check-ins, and issue context in one board query path.
- Keep the polling interval only if the server path is optimized; otherwise consider adaptive refresh or event-based refresh.

Evidence:

- `server/src/services/team-tracker.service.ts:271`
- `client/src/hooks/useTeamTracker.ts:13`

## Recommended Roadmap

### Phase 1: Fix workflow clarity

- Make Team Tracker task lifecycle explicit.
- Remove write-on-open behavior for task detail, or make promotion to Manager Desk explicit.
- Combine status update and follow-up capture into one action.
- Show check-in authorship and absolute timestamps.
- Fix inline title editing in the drawer.

### Phase 2: Improve manager throughput

- Add search, sort, and grouping.
- Add inline quick actions to attention cards.
- Add assignment conflict visibility in Team Tracker task creation.
- Add selective carry-forward preview.

### Phase 3: Expand operational depth

- Add richer availability states and date ranges.
- Expose signal explanations and thresholds.
- Optimize board loading for larger teams.

## Final Assessment

The Team Tracker already has the right skeleton for a high-value manager screen. The next step is not "more widgets." The next step is making the workflow model more legible and operationally trustworthy.

If this screen becomes the manager's true daily command center, the top priorities should be:

1. remove hidden cross-system behavior
2. tighten status/check-in/follow-up flow
3. make board triage scale beyond a small team
4. make carry-forward and assignment ownership fully predictable
