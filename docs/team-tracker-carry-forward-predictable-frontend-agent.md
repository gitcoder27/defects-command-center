# Frontend Task: Make Team Tracker Carry-Forward Behavior Predictable

Implement the frontend side of requirement 2 from:

- `docs/team-tracker-manager-review.md`
- `docs/team-tracker-manager-implementation-checklist.md`

## Product decision

Carry-forward now includes unfinished Team Tracker work regardless of backing source:

- tracker-only Team Tracker tasks
- Manager Desk-linked Team Tracker tasks

Managers should no longer experience the old behavior where manager-assigned follow-up work is silently excluded from the Team Tracker carry-forward flow.

## Backend behavior now available

### Preview

`GET /api/team-tracker/carry-forward-preview?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD`

Response shape is unchanged:

- `{ carryable: number }`

Behavior change:

- `carryable` now counts unfinished linked tasks as well as tracker-only tasks
- dedupe still applies, so items already represented on the target day are not counted again

### Execute

`POST /api/team-tracker/carry-forward`

Request body is unchanged:

- `fromDate`
- `toDate`

Response shape is unchanged:

- `{ carried: number }`

Behavior change:

- tracker-only items are copied forward as planned tracker items
- Manager Desk-linked items are carried forward through Manager Desk cloning, then mirrored back into Team Tracker for the target day
- linked items on the new day stay `manager_desk_linked` and point to the newly created Manager Desk item

## What the frontend should implement

- Review Team Tracker carry-forward copy in `client/src/components/team-tracker/TeamTrackerPage.tsx`.
- Update wording so it matches the new behavior:
  - the prompt/action now includes manager-assigned linked work
  - do not imply tracker-only scope
- Keep the existing count-only prompt for this item.
  Selective preview by developer/task is still out of scope here and belongs to requirement 9.
- Keep existing hook shapes in `client/src/hooks/useTeamTracker.ts` and `client/src/hooks/useTeamTrackerMutations.ts` unless a small type cleanup is helpful.
- Add or update frontend tests so the Team Tracker page behavior is covered when the preview/carried count reflects mixed task sources.

## Suggested file targets

- `client/src/components/team-tracker/TeamTrackerPage.tsx`
- `client/src/hooks/useTeamTracker.ts`
- `client/src/hooks/useTeamTrackerMutations.ts`
- `client/src/test/TeamTracker.test.tsx`

## Acceptance criteria

- Team Tracker carry-forward copy does not imply that manager-linked work is excluded.
- The first-visit carry-forward prompt still appears based on `carryable > 0`, but that count now represents all unfinished Team Tracker work.
- Carry-forward success flows remain intact when the backend carries a mixed set of tracker-only and linked tasks.
- Frontend tests cover the mixed-source carry-forward behavior at the UI level.

## Constraints

- Do not implement selective carry-forward preview here. That belongs to requirement 9.
- Do not change Manager Desk carry-forward UI in this task.
- Do not introduce a new Team Tracker preview payload unless you discover a real UI blocker; item 2 is intentionally backend-compatible with the existing count-based contract.
