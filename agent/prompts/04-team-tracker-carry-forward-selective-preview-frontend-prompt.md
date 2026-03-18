# Team Tracker Carry-Forward Selective Preview Frontend Prompt

You are implementing the frontend for Team Tracker manager item 9: "Improve Carry-Forward UX With Selective Preview by Developer/Task".

Read these first:

- `docs/team-tracker-manager-review.md`
- `docs/team-tracker-manager-implementation-checklist.md`
- `client/src/components/team-tracker/TeamTrackerPage.tsx`
- `client/src/hooks/useTeamTracker.ts`
- `client/src/hooks/useTeamTrackerMutations.ts`
- `client/src/test/TeamTracker.test.tsx`
- `agent/skills/frontend-design/SKILL.md`

## Goal

Replace the current Team Tracker carry-forward UX that is count-only and all-or-nothing with a selective preview flow that lets a manager inspect and adjust carry-forward by developer and by task before executing it.

This is a Team Tracker manager workflow improvement. Do not redesign Manager Desk carry-forward in this task.

## Scope

Apply the new selective preview flow to both existing Team Tracker entry points:

- the day-start carry-forward prompt for previous-day unfinished work
- the header `Carry Forward` action used when viewing a past date

Both entry points should route through the same reusable selective preview UI.

## Backend Changes Already Completed

### 1. Team Tracker preview API now returns detailed grouped data

Endpoint:

- `GET /api/team-tracker/carry-forward-preview?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD`

Response:

```ts
interface TrackerCarryForwardPreviewResponse {
  carryable: number;
  developers: Array<{
    developer: Developer;
    items: TrackerWorkItem[];
  }>;
}
```

New shared types were added in `shared/types.ts`:

```ts
interface TrackerCarryForwardPreviewGroup {
  developer: Developer;
  items: TrackerWorkItem[];
}

interface TrackerCarryForwardPreviewResponse {
  carryable: number;
  developers: TrackerCarryForwardPreviewGroup[];
}
```

Behavior:

- `carryable` is still present for compatibility
- `developers` is now the detailed preview the frontend should use
- only items that would actually carry right now are included
- preview includes both:
  - tracker-only Team Tracker tasks
  - Manager Desk-linked Team Tracker tasks
- preview excludes work already represented on the target day
- groups are sorted by developer name
- items inside each developer group are sorted by tracker position

Each preview item is a normal `TrackerWorkItem`, so the frontend can use:

- `id`
- `title`
- `lifecycle`
- `jiraKey`
- `jiraSummary`
- `jiraPriorityName`
- `jiraDueDate`
- `state`
- `note`

### 2. Team Tracker carry-forward execute API now supports partial selection

Endpoint:

- `POST /api/team-tracker/carry-forward`

Request body:

```ts
{
  fromDate: string;
  toDate: string;
  itemIds?: number[];
}
```

Response:

```ts
{ carried: number }
```

Behavior:

- if `itemIds` is omitted, backend preserves the existing carry-all behavior
- if `itemIds` is present, backend carries only those selected Team Tracker source item ids
- the ids are Team Tracker item ids from the preview payload, not Manager Desk item ids
- tracker-only items are copied forward as planned Team Tracker tasks
- Manager Desk-linked items are carried through Manager Desk cloning and remain linked on the new day
- duplicate `itemIds` are rejected by the backend
- if the frontend somehow submits ids that are not valid source-day Team Tracker items, backend rejects the request
- if a previously previewed item becomes unnecessary because it is already represented on the target day by the time the mutation runs, backend safely skips it

## What The Frontend Should Implement

### 1. Replace the count-only carry-forward flow with a selective dialog or sheet

Current Team Tracker behavior is still a direct carry-forward action with count-only text.

Change that so both Team Tracker entry points open the same selective carry-forward UI:

- fetch preview data using `fromDate` and `toDate`
- show grouped unfinished work by developer
- allow selection at two levels:
  - developer-level bulk toggle
  - individual task toggle
- default all previewed tasks to selected
- show a clear selected count
- block confirm when zero tasks are selected

The UI should feel operational and fast, not like a generic form modal.

### 2. Use developer grouping for the UX, but submit task ids

The backend intentionally keeps selection at task id granularity.

Frontend responsibilities:

- render the preview grouped by developer
- provide per-developer select all / deselect all behavior by toggling that group’s task ids
- provide per-task toggles within each developer group
- when confirming:
  - omit `itemIds` if every previewed task remains selected
  - send `itemIds` only when the manager selected a proper subset

### 3. Update Team Tracker hooks to use the richer preview contract

Current frontend code still treats preview as a single number.

Update the Team Tracker data layer so preview returns the new object shape instead of only `carryable`.

Suggested direction:

- change the preview query type in `client/src/hooks/useTeamTracker.ts`
- keep the hook name if that is still the cleanest API
- update callers in `TeamTrackerPage.tsx` to consume grouped preview data

### 4. Keep the existing page-level behavior coherent

Preserve these existing behaviors unless there is a concrete reason to improve them inside this task:

- the first-visit day-start prompt behavior
- session-storage dismissal per viewed date
- existing query invalidation after carry-forward
- existing toast/error handling patterns

What changes:

- the prompt/header action should no longer execute blind carry-forward immediately
- both should open the selective preview flow first
- prompt/header copy should describe selection, not only raw count

### 5. Mixed-source work must feel explicit, not confusing

Managers should be able to tell what each carried task is.

Use the existing task metadata to distinguish:

- tracker-only work
- Manager Desk-linked work
- Jira-linked tasks where Jira metadata is present

Do not introduce a new backend dependency for this. The data is already in the preview response.

## Interaction Requirements

- The selective carry-forward UI must work on desktop and narrow widths.
- Task toggles must not accidentally close the dialog.
- The confirm button text should reflect selection count.
- Developer groups should make it easy to scan who will receive carried work.
- If preview returns zero carryable tasks, the UI should not open an empty selection flow. Instead:
  - suppress the day-start prompt
  - disable or short-circuit the header action with appropriate UX

## Suggested File Targets

- `client/src/hooks/useTeamTracker.ts`
- `client/src/hooks/useTeamTrackerMutations.ts`
- `client/src/components/team-tracker/TeamTrackerPage.tsx`
- `client/src/test/TeamTracker.test.tsx`

You may introduce one or two small Team Tracker-specific components if needed for the selection UI. Do not let `TeamTrackerPage.tsx` grow into an oversized monolith.

## Acceptance Criteria

- Managers can preview carry-forward grouped by developer with task-level detail.
- Managers can deselect an entire developer group.
- Managers can deselect individual tasks inside a developer group.
- Both Team Tracker carry-forward entry points use the same selective preview flow.
- Confirming with all items selected preserves current behavior.
- Confirming with a subset sends only the selected Team Tracker `itemIds`.
- Mixed tracker-only and Manager Desk-linked work is displayed clearly and still carries successfully.
- Zero-selection confirm is impossible in the UI.
- Frontend tests cover:
  - preview rendering
  - developer-level selection
  - task-level selection
  - both entry points opening the same flow
  - subset mutation payloads

## Constraints

- Do not change Manager Desk carry-forward UI in this task.
- Do not add a new Team Tracker backend endpoint.
- Do not send Manager Desk item ids to Team Tracker carry-forward.
- Do not remove the compatibility `carryable` handling from the backend contract; just stop treating it as the only preview signal in the UI.
