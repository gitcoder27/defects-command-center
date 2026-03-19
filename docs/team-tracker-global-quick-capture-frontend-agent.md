# Frontend Task: Global Quick Capture For Manager Desk And Team Tracker

Implement a new manager-facing global capture workflow that makes the existing header `Capture` action useful from anywhere, including fast task capture into Team Tracker.

## Product outcome

The manager should be able to capture work from anywhere in the manager workspace without navigating to Team Tracker, scrolling to a developer card, and clicking `Add Task`.

This flow is specifically for moments like meetings, standups, and quick decisions where the manager wants to immediately record:

- a personal manager task in Manager Desk
- or a developer task in Team Tracker

The experience should feel fast, deliberate, and keyboard-friendly.

## Confirmed product decisions

Use these decisions as fixed:

- Keep a single global capture entry point in the top header.
- The header capture must be available to managers on:
  - dashboard
  - Team Tracker
  - Manager Desk
- The new capture flow is unified:
  - the manager chooses whether the capture is for `Manager Desk` or `Team Tracker`
- Team Tracker quick capture creates a normal tracker task only.
  - It must **not** create or link a Manager Desk item.
  - It must remain `tracker_only`.
- Team Tracker quick capture always targets **today** in this version.
- Developer selection should open with an immediate roster, not an empty state that forces typing first.

## Backend contract now available

### 1. Team Tracker create route

Use the existing route for developer-task capture:

`POST /api/team-tracker/:accountId/items`

Body:

```json
{
  "date": "YYYY-MM-DD",
  "title": "string",
  "jiraKey": "OPTIONAL-123",
  "note": "optional text"
}
```

Behavior:

- manager-only route
- creates a Team Tracker item directly
- created item is `tracker_only`
- created item starts in `planned`
- duplicate Jira-linked descriptive tasks are still allowed
- Jira key is optional

### 2. Developer roster / lookup route

Use this route for the Team Tracker quick-capture assignee picker:

`GET /api/manager-desk/lookups/developers?q=<query>&date=YYYY-MM-DD`

Important new behavior:

- `q` may be blank
- when `q` is blank, the route returns the active developer roster for quick capture
- when `date` is supplied, results include availability metadata when relevant
- unavailable developers are sorted after available developers
- inactive developer records (`isActive = 0`) are excluded

Response shape:

```json
{
  "items": [
    {
      "accountId": "dev-1",
      "displayName": "Alice Smith",
      "email": "alice@example.com",
      "avatarUrl": "https://example.com/avatar.png",
      "availability": {
        "state": "inactive",
        "startDate": "2026-03-19",
        "endDate": "2026-03-21",
        "note": "PTO"
      }
    }
  ]
}
```

### 3. Issue lookup route

If the Team Tracker capture UI supports optional Jira linking, use the existing manager lookup route:

`GET /api/manager-desk/lookups/issues?q=<query>`

Response:

```json
{
  "items": [
    {
      "jiraKey": "PROJ-321",
      "summary": "Issue summary",
      "priorityName": "Medium",
      "statusName": "To Do",
      "assigneeName": "Alice Smith"
    }
  ]
}
```

### 4. Manager Desk capture route

Preserve the existing Manager Desk quick-capture behavior via:

`POST /api/manager-desk/items`

Do not regress the current flow while introducing unified capture.

## Required frontend behavior

### Global header entry

- Keep one manager-only `Capture` action in the header.
- Show it on Manager Desk too. The current “hidden on manager desk” behavior should be removed.
- Clicking it opens a new unified capture surface.

### Unified capture surface

Design the interaction, but the content model must support two capture targets:

- `Manager Desk`
- `Team Tracker`

Recommended interaction model:

- segmented control, tab switcher, or equivalent at the top
- persist last-used target locally for speed
- first-time default can remain `Manager Desk` to preserve current expectation

### Manager Desk mode

- Reuse as much of the existing Manager Desk capture behavior as practical.
- Do not remove capabilities already available in the current Manager Desk capture dialog.
- The manager should still be able to:
  - enter title
  - set kind/category if exposed
  - save quickly into today’s Manager Desk

### Team Tracker mode

This is the new workflow.

Required fields:

- developer selection
- task title

Optional fields:

- linked Jira issue
- note / handoff context

Behavior:

- developer picker should load the roster immediately on open using blank-query developer lookup
- search should refine that roster client-side and/or with server calls as needed
- unavailable developers should still be visible, but clearly marked as unavailable
- the capture should show that the task is being created for **today**
- submit should call `POST /api/team-tracker/:accountId/items`
- success should not create any Manager Desk linkage

### Workflow expectations

From dashboard:

- manager can open capture
- choose `Team Tracker`
- choose developer
- enter title
- optionally attach Jira and note
- save without navigating away

From Team Tracker:

- manager can use the same global capture instead of scrolling to a developer card
- after save, Team Tracker queries should refresh so the new task appears

From Manager Desk:

- manager can still capture Manager Desk work
- manager can also switch to `Team Tracker` and assign a developer task from the same entry point

## Query invalidation and UI refresh

On successful Team Tracker capture:

- invalidate Team Tracker queries
- invalidate workload queries
- invalidate issue-assignment queries if a Jira issue was linked

On successful Manager Desk capture:

- preserve current Manager Desk refresh behavior

If the capture remains open after submit for rapid entry, ensure the correct target’s relevant fields are reset cleanly.

## UX and interaction guidance

You own the visual design, but optimize for speed and low-friction manager usage.

Recommended qualities:

- strong keyboard flow
- title field reachable immediately
- fast developer switching
- minimal pointer travel
- clear distinction between “capture for me” and “capture for a developer”
- visible confirmation after save

Useful patterns are acceptable if they help speed:

- command-style dialog
- compact modal with richer secondary fields
- split first step for target selection, then target-specific form
- sticky last-used developer or recent developer shortcuts if implemented carefully

## Constraints

- Do not change the product model: Team Tracker quick capture creates `tracker_only` work only.
- Do not auto-promote Team Tracker quick-captured tasks into Manager Desk.
- Do not add a date picker for Team Tracker capture in this task.
- Do not remove the existing Manager Desk page-local quick capture unless you intentionally replace it with something clearly better and non-redundant.
- Preserve current manager-only and developer-only route expectations.

## Suggested file targets

- `client/src/components/layout/Header.tsx`
- `client/src/components/manager-desk/ManagerDeskCaptureDialog.tsx`
- `client/src/components/team-tracker/QuickAddTaskModal.tsx`
- `client/src/hooks/useTeamTrackerMutations.ts`
- `client/src/hooks/useManagerDesk.ts`
- `client/src/lib/api.ts`
- relevant shared client types if needed
- relevant tests in:
  - `client/src/test/Header.test.tsx`
  - `client/src/test/TeamTracker.test.tsx`
  - `client/src/test/ManagerDesk.test.tsx`

You may create a new shared capture component if that is cleaner than forcing both workflows into the existing Manager Desk dialog.

## Acceptance criteria

- Manager sees one header `Capture` entry on dashboard, Team Tracker, and Manager Desk.
- Header capture opens a unified flow with both `Manager Desk` and `Team Tracker` targets.
- Team Tracker capture can create a task for a developer without opening Team Tracker card-level add-task UI.
- Team Tracker capture opens with a usable developer roster immediately.
- Team Tracker capture creates only a Team Tracker item and no Manager Desk item.
- Manager Desk capture behavior still works.
- Team Tracker and Manager Desk screens refresh appropriately after capture.
- Frontend tests cover:
  - header capture visibility on Manager Desk
  - unified target switching
  - blank-query developer roster loading
  - successful Team Tracker task capture
  - no regression in Manager Desk capture
