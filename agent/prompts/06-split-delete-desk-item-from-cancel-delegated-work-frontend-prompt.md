# Split Delete Desk Item From Cancel Delegated Work Frontend Prompt

You are implementing the frontend for review item 2 from:

- `docs/28-manager-workflow-review.md`
- `docs/30-manager-workflow-follow-up-top-5.md`

Specifically:

- `Split "delete desk item" from "cancel delegated work"`

This slice is **frontend-only**. The backend changes for this slice are already implemented.

Read these first:

- `docs/28-manager-workflow-review.md`
- `docs/30-manager-workflow-follow-up-top-5.md`
- `client/src/hooks/useManagerDesk.ts`
- `client/src/components/manager-desk/ItemDetailDrawer.tsx`
- `client/src/components/manager-desk/DrawerHeader.tsx`
- `client/src/components/team-tracker/TrackerTaskDetailDrawer.tsx`
- `client/src/types/manager-desk.ts`
- `agent/skills/frontend-design/SKILL.md`

## Goal

Managers must no longer be able to accidentally delete developer-facing execution work when they only mean to remove a task from Manager Desk.

The UI must split the old single destructive path into two explicit actions:

- `Remove from my desk`
- `Cancel delegated task`

These are not interchangeable anymore.

## Backend Changes Already Completed

### 1. `DELETE /api/manager-desk/items/:itemId` changed meaning

This route now means:

- remove the Manager Desk item only
- preserve any linked Team Tracker / My Day execution item
- unlink that tracker item by clearing its `managerDeskItemId`

What is preserved on the tracker item:

- title
- Jira key / item type
- state
- note
- ordering
- timestamps except for `updatedAt`
- developer/day ownership

What is removed:

- the Manager Desk item
- the Manager Desk links
- the linkage from tracker back to Manager Desk

This is now the backend path for `Remove from my desk`.

### 2. New explicit cancellation endpoint

New route:

- `POST /api/manager-desk/items/:itemId/cancel-delegated-task`

This route means:

- delete the linked Team Tracker/My Day execution item
- keep the Manager Desk item
- set the Manager Desk item status to `cancelled`
- set `completedAt` if needed
- keep manager-side metadata like context, links, schedule fields, and assignee for history/audit

Response shape:

- returns the updated `ManagerDeskItem`

After this call:

- `delegatedExecution` will usually be absent
- the Manager Desk item still exists
- Team Tracker detail for that linked item no longer exists because the tracker item is gone

### 3. New backend protection on linked delegated items

For a linked delegated Manager Desk item, the backend now rejects two implicit flows.

#### A. Generic `status = cancelled` patch is rejected

Route:

- `PATCH /api/manager-desk/items/:itemId`

If the item still has linked delegated tracker work and the frontend sends:

```ts
{ status: 'cancelled' }
```

The backend returns:

- status: `409`
- error:

```txt
Linked delegated tasks must be cancelled with the dedicated cancel action
```

#### B. Clearing assignee is rejected

Route:

- `PATCH /api/manager-desk/items/:itemId`

If the item still has linked delegated tracker work and the frontend sends:

```ts
{ assigneeDeveloperAccountId: null }
```

The backend returns:

- status: `409`
- error:

```txt
Linked delegated tasks must be removed from your desk or cancelled explicitly
```

This means the frontend must stop using assignee-clearing as a shorthand for cancellation or unlinking.

## Product Semantics You Must Preserve

### `Remove from my desk`

Meaning:

- manager no longer wants the task on Manager Desk
- developer execution should keep going
- developer notes/history must survive

Backend path:

- `DELETE /api/manager-desk/items/:itemId`

Expected frontend confirmation copy should clearly say:

- this removes the item from Manager Desk only
- developer work will remain in Team Tracker / My Day

This should use lighter confirmation than cancellation.

### `Cancel delegated task`

Meaning:

- manager is intentionally cancelling the developer-facing execution item
- this is destructive to active tracker work
- manager-side record remains, but developer execution is removed

Backend path:

- `POST /api/manager-desk/items/:itemId/cancel-delegated-task`

Expected frontend confirmation copy should clearly say:

- developer-facing execution will be deleted
- Team Tracker / My Day notes and execution history on that live task will no longer remain accessible as active work
- the Manager Desk item will stay behind as a cancelled record

This should use stronger confirmation than desk removal.

## What The Frontend Must Change

### 1. Split the shared destructive action in Manager Desk and shared detail UI

Current problem:

- shared detail flows still assume one delete action
- `TrackerTaskDetailDrawer.tsx` currently routes the shared delete action to the old Manager Desk delete mutation

Required change:

- replace the single delete affordance with two explicit actions when `item.assigneeDeveloperAccountId` or linked delegated context indicates manager-linked delegated work
- recommended labels:
  - `Remove from my desk`
  - `Cancel delegated task`

For manager-only desk items with no linked delegated work, you can keep a single remove/delete action.

### 2. Add a dedicated frontend mutation for cancellation

Update `client/src/hooks/useManagerDesk.ts`:

- keep the existing delete mutation, but treat it as `remove from desk`
- add a new mutation for:
  - `POST /manager-desk/items/:itemId/cancel-delegated-task`

Recommended hook name:

- `useCancelDelegatedManagerDeskTask`

On success, invalidate:

- `['manager-desk', date]`
- `['manager-desk', 'task-detail']`
- `['team-tracker']`
- `['workload']`

If the cancellation flow returns the updated item, use that to refresh any currently open shared detail state if convenient.

### 3. Stop using generic `status = cancelled` for linked delegated work

Current backend behavior now rejects that.

Frontend requirements:

- if a linked delegated item is open in `ItemDetailDrawer` / `DrawerHeader`, do not send `onUpdate(item.id, { status: 'cancelled' })`
- replace that button/action with the dedicated cancel flow
- leave `status = cancelled` available only for manager-only desk items that are not linked to active delegated tracker work

### 4. Stop using `assigneeDeveloperAccountId = null` as an implicit unlink/cancel path

Current backend behavior now rejects that for linked delegated work.

Frontend requirements:

- if the item is linked delegated work, do not allow a plain assignee-clear action to hit the patch endpoint
- if the user tries to remove assignment from linked delegated work, route them into one of the explicit choices instead:
  - remove from desk
  - cancel delegated task

For non-linked desk items, existing assignee clearing can stay as-is.

### 5. Update confirmation UX

At minimum:

- `Remove from my desk`
  - explain that Team Tracker/My Day work will remain
  - confirm with a lighter confirmation

- `Cancel delegated task`
  - explain that developer-facing execution will be deleted
  - explain that this is the destructive path
  - require stronger confirmation than the remove-from-desk path

Recommended distinction:

- remove-from-desk can be a normal confirm dialog
- cancel-delegated should use higher-friction copy and destructive styling

### 6. Update Team Tracker shared-detail behavior

`client/src/components/team-tracker/TrackerTaskDetailDrawer.tsx` currently uses the shared `ItemDetailDrawer` and wires its delete action straight into the Manager Desk delete mutation.

Required change:

- when the detail is `manager_desk_linked`, the drawer must expose the split action model
- deleting from this drawer must no longer silently remove active developer work unless the manager explicitly chooses cancellation

This is one of the key review findings, so do not leave any fallback path that still maps the generic drawer delete to destructive cancellation.

## Backend Files Changed

These backend files were changed for this slice:

- `server/src/services/manager-desk.service.ts`
- `server/src/services/team-tracker.service.ts`
- `server/src/routes/manager-desk.ts`

Behavior implemented there:

- explicit unlink-on-delete
- explicit cancel endpoint
- `409` rejections for implicit linked cancellation/unassignment

## Suggested Acceptance Scenarios

Your frontend implementation should make these flows work clearly:

1. Linked delegated task, manager chooses `Remove from my desk`

- Manager Desk item disappears from desk
- developer task stays visible in Team Tracker/My Day
- no destructive warning text claims it will delete developer work

2. Linked delegated task, manager chooses `Cancel delegated task`

- manager sees strong destructive confirmation
- after confirm, Team Tracker/My Day execution item is gone
- Manager Desk item remains and shows `cancelled`

3. Linked delegated task, manager clicks old-style cancel/status control

- frontend should no longer issue `PATCH { status: 'cancelled' }`
- it should route to dedicated cancellation instead

4. Linked delegated task, manager tries to clear assignee

- frontend should not send `PATCH { assigneeDeveloperAccountId: null }`
- it should redirect to explicit action choice instead

5. Manager-only desk item with no linked delegated work

- existing manager-only delete/cancel patterns can remain simple
- no delegated-task warning copy should appear

## Implementation Notes

- Preserve the existing visual language of Manager Desk and Team Tracker; do not introduce a generic modal stack that feels bolted on.
- Make the difference between the two actions obvious in wording, tone, and destructive emphasis.
- Keep the shared detail drawer understandable on both desktop and mobile.
- If you add new local types in `client/src/types/manager-desk.ts`, keep them aligned with the existing API contract and avoid inventing backend-only fields that do not exist.
