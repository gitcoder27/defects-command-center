# Team Tracker Gap Findings

Date: 2026-03-07

## Scope

This note captures the remaining Team Tracker gaps identified by comparing:

- `docs/07-team-tracker-prd.md`
- `docs/08-team-tracker-implementation-plan.md`

against the current implementation in `client/`, `server/`, and `shared/`.

This is not a statement that the feature is broken overall. The implemented Team Tracker flows are present and broadly working. This document only records the missing or partial items that still separate the current build from the intended MVP.

## Summary

The Team Tracker MVP is largely implemented, but eleven meaningful gaps remain:

1. Planned-item reordering is not implemented.
2. Jira-linked items do not show the required Jira context.
3. Item notes exist in the model but are not editable in the UI.
4. The single-current-item rule is only partially enforced.
5. Jira-linked item validation is weaker than the design expects.
6. Carry-forward UX is partially implemented and uses brittle date logic.
7. Frontend and route-level coverage do not yet match the implementation plan.
8. Per-item inline editing is not supported in the drawer.
9. Date navigation lacks quick prev/next day controls.
10. Carry-forward does not auto-prompt on first visit to a new day.
11. Reorder UX should plan for drag-and-drop beyond simple up/down controls.

## Findings

### P1: Planned-item reordering is missing from the drawer workflow

Affected requirements:

- `docs/07-team-tracker-prd.md`
- `docs/08-team-tracker-implementation-plan.md`

Affected code:

- `client/src/components/team-tracker/DeveloperTrackerDrawer.tsx`
- `client/src/components/team-tracker/TrackerItemRow.tsx`
- `client/src/hooks/useTeamTrackerMutations.ts`

Analysis:

- The PRD requires the lead to reorder next-up items when priorities change.
- The implementation plan explicitly calls out reorder support in the detail drawer, with simple up/down controls acceptable for MVP.
- The current drawer renders planned items, but there are no reorder controls and no UI that updates `position`.
- The mutation layer does support updating `position`, but nothing in the frontend uses it.

User-visible impact:

- The lead cannot reprioritize a developer's planned queue from the dashboard.
- Midday follow-up and interruption/replanning workflows are incomplete.

Likely remediation:

- Add explicit reorder controls in the drawer.
- Persist order changes through `PATCH /api/team-tracker/items/:itemId`.
- For MVP, up/down arrow buttons are sufficient; plan for drag-and-drop as a follow-up enhancement using a library such as `@dnd-kit/sortable` to provide tactile reorder semantics and reduce click count during busy triage sessions.

### P2: Jira-linked items do not show priority or due-date context

Affected requirements:

- `docs/07-team-tracker-prd.md`
- `docs/08-team-tracker-implementation-plan.md`

Affected code:

- `shared/types.ts`
- `server/src/services/team-tracker.service.ts`
- `client/src/components/team-tracker/TrackerItemRow.tsx`
- `client/src/components/team-tracker/AddTrackerItemForm.tsx`

Analysis:

- The PRD says Jira-linked items should show issue key, title, priority, and due-date context.
- The current tracker data model only carries `jiraKey` and `title` for Jira-linked items.
- The backend does not resolve or snapshot Jira metadata from the synced issues table.
- The frontend therefore renders only key and title.

User-visible impact:

- Jira-linked work lacks the operational context that distinguishes one issue from another.
- The tracker does not fully deliver the intended “Jira-linked but manager-owned” view.

Likely remediation:

- Extend tracker item data to include snapshot Jira metadata such as priority and effective due date.
- Populate those values when creating Jira-linked items and render them on cards and in the drawer.

### P2: Item notes are modeled but not exposed as an editable UI flow

Affected requirements:

- `docs/08-team-tracker-implementation-plan.md`

Affected code:

- `shared/types.ts`
- `server/src/routes/team-tracker.ts`
- `server/src/services/team-tracker.service.ts`
- `client/src/components/team-tracker/AddTrackerItemForm.tsx`

Analysis:

- The API and persistence model support an optional per-item `note`.
- The row component can display a note if one exists.
- The current add-item and edit flows do not provide any input for item notes.
- This leaves the feature only partially usable from the UI.

User-visible impact:

- Leads cannot capture short item-specific context when creating or updating work items.
- Some “why is this in the queue?” context has to be pushed into manager notes instead of staying attached to the item.

Likely remediation:

- Add optional note input when creating Jira/custom items.
- Add a small edit affordance for updating notes on existing items.

### P1: The single-current-item rule is only partially enforced

Affected requirements:

- `docs/07-team-tracker-prd.md`
- `docs/08-team-tracker-implementation-plan.md`

Affected code:

- `server/src/services/team-tracker.service.ts`
- `server/src/routes/team-tracker.ts`

Analysis:

- The intended rule is that exactly one item per developer/day can be `in_progress`.
- `setCurrentItem()` correctly resets any existing `in_progress` item before setting the new current item.
- `updateItem()` also allows direct updates to `state: "in_progress"` without resetting sibling items.
- That means the rule is enforced by one path, but not by service logic globally.

User-visible impact:

- The current UI may behave correctly, but the API contract is weaker than the requirement.
- Any future UI change or external use of the patch endpoint can create invalid tracker state.

Likely remediation:

- Centralize `in_progress` enforcement inside service logic so every write path respects the rule.
- Consider rejecting direct `state: "in_progress"` updates unless they go through the current-item helper.

### P2: Jira-linked item validation is weaker than the design expects

Affected requirements:

- `docs/08-team-tracker-implementation-plan.md`

Affected code:

- `server/src/routes/team-tracker.ts`
- `server/src/services/team-tracker.service.ts`

Analysis:

- The implementation plan says `jiraKey` should be required when `itemType = 'jira'`.
- The current route schema allows Jira items without a `jiraKey`.
- The backend also does not verify that the selected Jira issue exists in the synced local issue set.

User-visible impact:

- The tracker can accept incomplete or invalid Jira-linked items.
- This weakens one of the core distinctions between Jira-linked and custom work.

Likely remediation:

- Tighten request validation so Jira items require a `jiraKey`.
- Validate that the key exists in synced issues before creating the item.

### P2: Carry-forward is only partially implemented in the UI

Affected requirements:

- `docs/07-team-tracker-prd.md`
- `docs/08-team-tracker-implementation-plan.md`

Affected code:

- `client/src/components/team-tracker/TeamTrackerPage.tsx`
- `client/src/hooks/useTeamTrackerMutations.ts`
- `server/src/services/team-tracker.service.ts`

Analysis:

- The backend provides a generic carry-forward endpoint with `{ fromDate, toDate }`.
- The UI only shows the button when viewing a non-today date.
- When clicked, it always submits `yesterday -> today`, regardless of the selected date.
- This means the UX does not cleanly map to the backend contract or the requirement to carry unfinished planned work across days.

User-visible impact:

- The feature can behave unexpectedly when validating non-today dates.
- It is easy to misunderstand what will be carried and from which day.

Likely remediation:

- Make carry-forward operate on the selected date pair explicitly.
- Surface the source and destination dates in the UI so the action is unambiguous.
- Auto-prompt carry-forward when the lead first opens the tracker on a new day and there are unfinished items from the previous working day, rather than relying on a manual button discovery.

### P2: Per-item inline editing is not supported in the drawer

Affected requirements:

- `docs/07-team-tracker-prd.md`
- `docs/08-team-tracker-implementation-plan.md`

Affected code:

- `client/src/components/team-tracker/DeveloperTrackerDrawer.tsx`
- `client/src/components/team-tracker/TrackerItemRow.tsx`
- `client/src/hooks/useTeamTrackerMutations.ts`

Analysis:

- The drawer shows items in read-only form. Title and note text cannot be edited after creation.
- The API supports `PATCH` updates to title, note, and state on existing items, but the frontend does not expose these fields for editing.
- During triage the lead frequently needs to refine a title or amend an item-level note without deleting and recreating the item.

User-visible impact:

- To correct a typo or update the scope of a work item the lead must drop and re-add the item, losing position and creation timestamp.
- Quick annotation of items during a follow-up conversation is not possible.

Likely remediation:

- Add click-to-edit on the item title and an inline note input in `TrackerItemRow` or the drawer item list.
- Wire edits to the existing `useUpdateTrackerItem` mutation.

### P3: Date navigation lacks quick prev/next day controls

Affected requirements:

- `docs/07-team-tracker-prd.md`

Affected code:

- `client/src/components/team-tracker/TeamTrackerPage.tsx`

Analysis:

- The page header includes a native date input and a "Today" button, but no single-click controls to move one day forward or backward.
- Reviewing yesterday's board or planning tomorrow's queue requires manual date picker interaction, which is slower than necessary for a daily-cadence tool.

User-visible impact:

- Navigating between adjacent days takes more clicks than expected, slowing the morning review and EOD wrap-up workflows.

Likely remediation:

- Add left/right arrow buttons flanking the date display to decrement/increment by one day.
- Optionally skip weekends when advancing/going back.

### P3: Test coverage is thinner than the implementation plan intended

Affected requirements:

- `docs/08-team-tracker-implementation-plan.md`

Affected code:

- `server/tests/team-tracker.service.test.ts`
- `client/src/test/TeamTracker.test.tsx`

Analysis:

- Current backend tests cover core service behavior and currently pass.
- Current frontend tests cover rendering, summary filtering, basic status display, and drawer opening.
- The implementation plan called for deeper coverage, including app-shell navigation, mutation behavior, add-item flows, and broader visual-state assertions.
- No dedicated route-level integration tests were identified for the Team Tracker API.

User-visible impact:

- The current build is testable, but some regressions could slip through more easily than intended.
- The uncovered areas align with several of the remaining product gaps.

Likely remediation:

- Add frontend tests for view switching, add-item flows, check-ins, carry-forward, and mutation-driven state refresh.
- Add backend route tests and a test that explicitly confirms inactive developers are excluded from the board.

## Recommended Follow-Up

1. Implement planned-item reordering in the drawer and wire it to `position`; plan for drag-and-drop after MVP.
2. Extend Jira-linked item snapshots to include priority and due-date context.
3. Add item-note create/edit UI.
4. Enforce the single-current-item rule in one backend write path.
5. Tighten Jira item validation.
6. Fix carry-forward UX to use explicit selected dates and auto-prompt on new day.
7. Expand automated coverage around the remaining gaps.
8. Add per-item inline editing for title and notes in the drawer.
9. Add prev/next day navigation arrows to the date header.
