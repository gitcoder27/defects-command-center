# Frontend Task: Replace Team Tracker Split Status/Check-In Flow With One Unified Action

Implement the frontend side of requirement 3 from:

- `docs/team-tracker-manager-review.md`
- `docs/team-tracker-manager-implementation-checklist.md`

## Product decision

Status changes in the Team Tracker manager drawer should no longer be split across:

- instant status-pill writes
- a separate freeform check-in composer

Use one manager action for status updates that can capture, in a single submission:

- status
- short rationale
- optional note
- optional next follow-up datetime

## Backend contract now available

### New route

`POST /api/team-tracker/:accountId/status-update`

Request body:

- `date: string` in `YYYY-MM-DD`
- `status: "on_track" | "at_risk" | "blocked" | "waiting" | "done_for_today"`
- `rationale?: string`
- `summary?: string`
- `nextFollowUpAt?: string | null`
  - must be an ISO datetime with offset when present

Validation:

- `blocked` requires `rationale`
- `at_risk` requires `rationale`
- `waiting`, `on_track`, and `done_for_today` do not require `rationale`

Response:

- returns the updated `TrackerDeveloperDay`
- route status is `201`

### Route semantics

Submitting `POST /status-update` now:

- records one Team Tracker check-in event
- updates the developer day status
- updates `lastCheckInAt`
- updates `statusUpdatedAt` when the status actually changed
- sets `nextFollowUpAt` on the day
- clears `nextFollowUpAt` when the submitted value is omitted/blank on the frontend and sent as `null`

### Follow-up clearing behavior

Any later Team Tracker check-in clears the active day-level `nextFollowUpAt` marker.

That includes:

- manager note-only check-ins through the existing manager route
- developer check-ins through `/api/my-day/checkins`

### Existing general check-in route still exists

`POST /api/team-tracker/:accountId/checkins`

- still supports note-only manager check-ins
- now correctly records manager authorship with `authorAccountId`

Use this for pure note-only updates if you keep a separate generic note composer.
Do not use it for status changes in the new UI flow.

## Data shape updates now available

### `TrackerCheckIn`

Backend payloads now include optional fields:

- `status?: TrackerDeveloperStatus`
- `rationale?: string`
- `nextFollowUpAt?: string`
- existing `authorType` and `authorAccountId` remain present

Interpretation:

- a check-in with `status` is a structured status-update event
- `summary` is the optional manager note when provided, otherwise backend fallback text
- `rationale` is the structured reason for risk states

### `TrackerDeveloperDay`

Backend payload now includes:

- `nextFollowUpAt?: string`

Use this as the current scheduled follow-up marker for the selected developer.

## Required frontend behavior

- In `DeveloperTrackerDrawer`, remove direct status-pill mutations that call `PATCH /api/team-tracker/:accountId/day` for status changes.
- Replace them with a single `Update Status` action entry point.
- The action UI can be a sheet, modal, inline panel, or similar, but it must submit the new unified route.
- The form must include:
  - status selector
  - rationale input
  - optional note input
  - optional next follow-up datetime input
- Enforce client-side validation so `blocked` and `at_risk` cannot be submitted without rationale.
- For non-risk statuses, rationale should be optional.
- After submit succeeds:
  - refresh Team Tracker board data
  - keep the drawer open
  - show updated status/check-in state immediately from the refreshed query
- If you keep the existing freeform check-in input, it should remain note-only and should not also expose status.
- Prefer rendering or at least preserving access to the new structured check-in metadata:
  - `status`
  - `rationale`
  - `nextFollowUpAt`

## Suggested file targets

- `client/src/components/team-tracker/DeveloperTrackerDrawer.tsx`
- `client/src/hooks/useTeamTrackerMutations.ts`
- `client/src/hooks/useTeamTracker.ts` if you need small query-type cleanup
- `client/src/types/index.ts`
- `client/src/test/TeamTracker.test.tsx`

## Acceptance criteria

- Status changes no longer fire immediately from drawer pills.
- Managers can submit one unified status update with rationale, optional note, and optional next follow-up datetime.
- `blocked` and `at_risk` are blocked client-side until rationale is entered.
- Successful submit updates the Team Tracker drawer/board through the new backend route.
- Generic note-only check-ins, if still present, remain separate from status changes.
- Frontend tests cover:
  - required rationale for `blocked`
  - required rationale for `at_risk`
  - successful submit for a structured status update
  - refresh behavior after submit

## Constraints

- Do not implement check-in authorship display polish here beyond what is needed for the new flow. That is covered more directly by requirement 4.
- Do not add new backend endpoints. The backend contract for this item is already available.
- Do not fold Manager Desk follow-up creation into this action. This task is only about Team Tracker status/check-in unification.
