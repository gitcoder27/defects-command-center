# Team Tracker Gap Findings

Date: 2026-03-07

## Scope

This note captures the Team Tracker gaps identified by comparing:

- `docs/07-team-tracker-prd.md`
- `docs/08-team-tracker-implementation-plan.md`

against the current implementation in `client/`, `server/`, and `shared/`.

This is not a statement that the feature is broken overall. The implemented Team Tracker flows are present and broadly working. This document records the identified gaps and, where applicable, notes items that have since been fixed.

## Summary

The Team Tracker MVP is largely implemented. Seven meaningful gaps remain, and four originally identified items are now fixed:

Fixed on 2026-03-07:

1. Planned-item reordering in the drawer is implemented.
2. Jira-linked items now show priority and due-date context.
3. Item notes are now editable in the UI.
4. The single-current-item rule is now enforced through service logic.

Still open:

5. Jira-linked item validation is weaker than the design expects.
6. Carry-forward UX is partially implemented and uses brittle date logic.
7. Frontend and route-level coverage do not yet match the implementation plan.
8. Per-item title editing is not supported in the drawer.
9. Date navigation lacks quick prev/next day controls.
10. Carry-forward does not auto-prompt on first visit to a new day.
11. Reorder UX should plan for drag-and-drop beyond simple up/down controls.

## Findings

### Fixed: Planned-item reordering is available in the drawer workflow

Affected requirements:

- `docs/07-team-tracker-prd.md`
- `docs/08-team-tracker-implementation-plan.md`

Affected code:

- `client/src/components/team-tracker/DeveloperTrackerDrawer.tsx`
- `client/src/components/team-tracker/TrackerItemRow.tsx`
- `client/src/components/team-tracker/TeamTrackerPage.tsx`
- `server/src/services/team-tracker.service.ts`

Status:

- Fixed on 2026-03-07.

Implementation notes:

- The drawer now exposes explicit up/down controls for planned items.
- Reorder actions persist through `PATCH /api/team-tracker/items/:itemId`.
- The service now normalizes sibling positions when a move occurs so the queue remains stable.
- This satisfies the MVP expectation for simple reorder controls while leaving drag-and-drop as a future enhancement.

### Fixed: Jira-linked items show priority and due-date context

Affected requirements:

- `docs/07-team-tracker-prd.md`
- `docs/08-team-tracker-implementation-plan.md`

Affected code:

- `shared/types.ts`
- `server/src/services/team-tracker.service.ts`
- `client/src/components/team-tracker/TrackerItemRow.tsx`
- `client/src/components/team-tracker/AddTrackerItemForm.tsx`
- `client/src/types/index.ts`

Status:

- Fixed on 2026-03-07.

Implementation notes:

- Tracker item types now carry Jira priority and effective due-date fields.
- The backend enriches Jira-linked tracker items from the synced local `issues` table.
- The frontend now renders that context on tracker rows and in the Jira item picker.
- Due-date context uses the existing effective-date rule of `developmentDueDate ?? dueDate`.

### Fixed: Item notes are editable during create and update flows

Affected requirements:

- `docs/08-team-tracker-implementation-plan.md`

Affected code:

- `client/src/components/team-tracker/AddTrackerItemForm.tsx`
- `client/src/components/team-tracker/DeveloperTrackerDrawer.tsx`
- `client/src/components/team-tracker/TrackerItemRow.tsx`
- `client/src/components/team-tracker/TeamTrackerPage.tsx`

Status:

- Fixed on 2026-03-07.

Implementation notes:

- The add-item flow now accepts an optional note for both custom and Jira-linked items.
- Existing items now expose a small inline note editor in the drawer.
- Note edits are persisted through the existing `PATCH /api/team-tracker/items/:itemId` endpoint.

### Fixed: The single-current-item rule is enforced through service logic

Affected requirements:

- `docs/07-team-tracker-prd.md`
- `docs/08-team-tracker-implementation-plan.md`

Affected code:

- `server/src/services/team-tracker.service.ts`

Status:

- Fixed on 2026-03-07.

Implementation notes:

- `updateItem()` now uses the same single-current enforcement path as `setCurrentItem()` when a direct state update sets an item to `in_progress`.
- This closes the API-level gap where multiple items on the same developer/day could previously be marked current through the patch endpoint.

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

### P2: Per-item title editing is not supported in the drawer

Affected requirements:

- `docs/07-team-tracker-prd.md`
- `docs/08-team-tracker-implementation-plan.md`

Affected code:

- `client/src/components/team-tracker/DeveloperTrackerDrawer.tsx`
- `client/src/components/team-tracker/TrackerItemRow.tsx`
- `client/src/hooks/useTeamTrackerMutations.ts`

Analysis:

- The drawer now supports note editing, but title text still cannot be edited after creation.
- The API supports `PATCH` updates to title, note, and state on existing items, but the frontend still does not expose title editing.
- During triage the lead may still need to refine an item title without deleting and recreating the item.

User-visible impact:

- To correct a typo or update the scope of a work item the lead must still drop and re-add the item, losing position and creation timestamp.
- Note-only editing helps, but full item refinement is still incomplete.

Likely remediation:

- Add click-to-edit for item titles in the drawer.
- Wire title edits to the existing `useUpdateTrackerItem` mutation.

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
