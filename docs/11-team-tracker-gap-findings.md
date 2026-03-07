# Team Tracker Gap Findings

Date: 2026-03-07

## Scope

This note captures the Team Tracker gaps identified by comparing:

- `docs/07-team-tracker-prd.md`
- `docs/08-team-tracker-implementation-plan.md`

against the current implementation in `client/`, `server/`, and `shared/`.

This is not a statement that the feature is broken overall. The implemented Team Tracker flows are present and broadly working. This document records the identified gaps and, where applicable, notes items that have since been fixed.

## Summary

The Team Tracker MVP is implemented and the gaps identified in this review are now closed:

Fixed on 2026-03-07:

1. Planned-item reordering in the drawer is implemented, including drag-and-drop.
2. Jira-linked items now show priority and due-date context.
3. Item notes are now editable in the UI.
4. The single-current-item rule is now enforced through service logic.
5. Date navigation now has quick prev/next day arrow controls.
6. Drag-and-drop reordering replaces simple up/down controls in the drawer.
7. Carry-forward correctly uses the selected date, not a hardcoded yesterday.
8. Per-item title editing is now supported via click-to-edit in the drawer.
9. Jira-linked item validation now requires a valid synced Jira key.
10. Frontend and route-level coverage now cover the tracker flows called out in the implementation plan.
11. Carry-forward now auto-prompts on first visit to a new day when prior unfinished work exists.

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

- The drawer now supports full drag-and-drop reordering of planned items using framer-motion's `Reorder` API.
- A grip handle on each planned item provides a clear affordance for drag interaction.
- Reorder actions persist through `PATCH /api/team-tracker/items/:itemId`.
- The service normalizes sibling positions when a move occurs so the queue remains stable.
- Drag-and-drop replaces the earlier up/down arrow buttons, providing a more natural and efficient reordering experience.

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

### Fixed: Jira-linked item validation now matches the intended contract

Affected requirements:

- `docs/08-team-tracker-implementation-plan.md`

Affected code:

- `server/src/routes/team-tracker.ts`
- `server/src/services/team-tracker.service.ts`
- `server/tests/team-tracker.service.test.ts`
- `server/tests/team-tracker.routes.test.ts`

Status:

- Fixed on 2026-03-07.

Implementation notes:

- Route validation now requires `jiraKey` when `itemType = 'jira'` and rejects stray Jira keys on custom items.
- Service logic now verifies that a Jira-linked tracker item references an issue present in the synced local `issues` table.
- Invalid Jira-linked item requests now fail with a `400` instead of silently creating incomplete tracker data.
- Service and route tests cover both the missing-key and unknown-key cases.

### Fixed: Carry-forward correctly uses the selected date

Affected requirements:

- `docs/07-team-tracker-prd.md`
- `docs/08-team-tracker-implementation-plan.md`

Affected code:

- `client/src/components/team-tracker/TeamTrackerPage.tsx`
- `client/src/hooks/useTeamTrackerMutations.ts`
- `server/src/services/team-tracker.service.ts`

Status:

- Fixed on 2026-03-07.

Implementation notes:

- `handleCarryForward` uses the selected `date` state: `{ fromDate: date, toDate: shiftIsoDate(date, 1) }`.
- This correctly carries forward from the viewed date to the next day, regardless of which date the user is viewing.
- A frontend test confirms the carry-forward submits the selected date pair rather than a hardcoded yesterday.
- The original finding that carry-forward always submitted `yesterday -> today` is no longer accurate.

### Fixed: Per-item title editing is now supported in the drawer

Affected requirements:

- `docs/07-team-tracker-prd.md`
- `docs/08-team-tracker-implementation-plan.md`

Affected code:

- `client/src/components/team-tracker/TrackerItemRow.tsx`
- `client/src/components/team-tracker/DeveloperTrackerDrawer.tsx`
- `client/src/components/team-tracker/TeamTrackerPage.tsx`

Status:

- Fixed on 2026-03-07.

Implementation notes:

- Item titles in the drawer are now click-to-edit for non-completed items.
- Clicking a title opens an inline text input with save (Enter or checkmark) and cancel (Escape or X button) controls.
- Title edits persist through the existing `PATCH /api/team-tracker/items/:itemId` endpoint.
- Both the current item and planned items support title editing.
- Frontend tests cover click-to-edit save via button, save via Enter, and cancel via Escape.

### Fixed: Date navigation now has quick prev/next day controls

Affected requirements:

- `docs/07-team-tracker-prd.md`

Affected code:

- `client/src/components/team-tracker/TeamTrackerPage.tsx`

Status:

- Fixed on 2026-03-07.

Implementation notes:

- ChevronLeft and ChevronRight arrow buttons now flank the date picker input.
- The left arrow navigates to the previous day; the right arrow navigates to the next day.
- The next-day button is disabled when already viewing today, preventing navigation into the future.
- The arrows, date picker, and Today button are grouped in a single cohesive control strip.
- Frontend tests cover previous-day navigation, next-day navigation, and the disabled state.

### Fixed: Team Tracker coverage now includes route-level and broader frontend flows

Affected requirements:

- `docs/08-team-tracker-implementation-plan.md`

Affected code:

- `server/tests/team-tracker.service.test.ts`
- `server/tests/team-tracker.routes.test.ts`
- `client/src/test/TeamTracker.test.tsx`
- `client/src/components/team-tracker/TeamTrackerPage.tsx`

Status:

- Fixed on 2026-03-07.

Implementation notes:

- Backend coverage now includes dedicated Team Tracker route tests for board loading, active-developer filtering, Jira item validation failures, and carry-forward preview responses.
- Frontend coverage now includes the carry-forward prompt flow and Jira-linked add-item flow in addition to the previously added drawer-edit and navigation tests.
- Service coverage also now explicitly exercises invalid Jira-linked item rejection and carry-forward preview behavior.

### Fixed: Carry-forward now auto-prompts on first visit to a new day

Affected requirements:

- `docs/07-team-tracker-prd.md`
- `docs/08-team-tracker-implementation-plan.md`

Affected code:

- `client/src/components/team-tracker/TeamTrackerPage.tsx`
- `client/src/hooks/useTeamTracker.ts`
- `server/src/routes/team-tracker.ts`
- `server/src/services/team-tracker.service.ts`
- `client/src/test/TeamTracker.test.tsx`
- `server/tests/team-tracker.routes.test.ts`

Status:

- Fixed on 2026-03-07.

Implementation notes:

- The tracker now uses a dedicated carry-forward preview endpoint that reports how many unfinished items from the previous day are still eligible to be carried into the viewed date.
- On first visit to a date, the page shows a carry-forward prompt when prior unfinished work exists and has not already been carried into that date.
- Dismissing the prompt is remembered per viewed date for the current browser session, while the existing manual carry-forward action remains available for explicit day-to-next-day moves.
- The preview path is read-only and avoids fetching prior-day boards in a way that would create tracker day rows as a side effect.

## Recommended Follow-Up

1. Monitor whether the carry-forward prompt should eventually persist dismissal across browser sessions instead of the current session-only behavior.
2. Consider extracting the lightweight route test `invoke()` helper if more route modules adopt the same pattern.
