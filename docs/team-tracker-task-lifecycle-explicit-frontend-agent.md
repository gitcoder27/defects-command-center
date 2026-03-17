# Frontend Task: Make the Team Tracker Task Lifecycle Explicit

Implement the frontend side of requirement 1 from:

- `docs/team-tracker-manager-review.md`
- `docs/team-tracker-manager-implementation-checklist.md`

## Product decision

Use the confirmed model: Team Tracker items are tracker-local first. They stay tracker-local unless the manager explicitly promotes one into Manager Desk. Opening Team Tracker task detail must not silently create Manager Desk data.

## Backend contract now available

### Team Tracker items

Backend `TrackerWorkItem` now includes:

- `managerDeskItemId?: number`
- `lifecycle: "tracker_only" | "manager_desk_linked"`

Interpretation:

- `tracker_only`: normal Team Tracker task with no Manager Desk backing yet
- `manager_desk_linked`: explicit shared task linked to a Manager Desk item

### Tracker detail route

`GET /api/manager-desk/tracker-items/:trackerItemId/detail`

- read-only
- no side effects
- returns:
  - `date`
  - `developer`
  - `trackerItem`
  - `lifecycle`
  - `managerDeskItem` only when the tracker item is already linked

### Explicit promote route

`POST /api/manager-desk/tracker-items/:trackerItemId/promote`

- manager-only
- idempotent
- returns the same detail payload shape
- after promotion the response includes:
  - `lifecycle: "manager_desk_linked"`
  - `managerDeskItem`

## Required frontend behavior

- Stop creating Team Tracker tasks through `useCreateManagerDeskItem` in `client/src/components/team-tracker/TeamTrackerPage.tsx`.
- Switch Team Tracker add-task flows to `useAddTrackerItem`.
  This applies to quick-add and drawer add-task flows.
- Opening Team Tracker task detail must only load detail.
  It must not create Manager Desk data.
- In Team Tracker task detail:
  - if `lifecycle === "tracker_only"`:
    - show it clearly as tracker-only
    - render Team Tracker detail and execution content without Manager Desk editing controls
    - show an explicit CTA: `Promote to Manager Follow-Up`
  - if `lifecycle === "manager_desk_linked"`:
    - render the existing shared detail experience using `managerDeskItem`
- Add a frontend mutation for `POST /api/manager-desk/tracker-items/:trackerItemId/promote`.
- After promotion succeeds:
  - refresh Team Tracker board data
  - refresh task detail data
  - refresh Manager Desk queries
  - keep the task detail drawer open and transition it into the linked/shared state
- Update visible copy so managers can distinguish:
  - tracker-only task
  - Manager Desk-linked follow-up

## Suggested file targets

- `client/src/components/team-tracker/TeamTrackerPage.tsx`
- `client/src/components/team-tracker/TrackerTaskDetailDrawer.tsx`
- `client/src/hooks/useManagerDesk.ts`
- `client/src/hooks/useTeamTrackerMutations.ts`
- `client/src/types/index.ts`
- `client/src/types/manager-desk.ts`
- relevant tests in `client/src/test/TeamTracker.test.tsx`
- relevant tests in `client/src/test/TrackerTaskDetailDrawer.test.tsx`

## Constraints

- Do not implement carry-forward changes here. That is requirement 2.
- Do not implement the unified status/check-in flow here. That is requirement 3.
- Preserve existing Manager Desk-linked task behavior. The change here is removing silent promotion and making lifecycle explicit.

## Acceptance criteria

- Adding a Team Tracker task creates only a Team Tracker item.
- Opening Team Tracker task detail for an unlinked task does not create a Manager Desk item.
- An unlinked task clearly shows as tracker-only and offers explicit promotion.
- Clicking promote creates the Manager Desk item exactly once and updates the UI into the linked state.
- Linked tasks still open in the shared detail experience.
- Tests cover unlinked detail, explicit promotion, and tracker-only task creation.
