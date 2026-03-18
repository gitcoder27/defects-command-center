# Delegated Task Lifecycle Sync Frontend Prompt

You are implementing the frontend for review item 1 from:

- `docs/28-manager-workflow-review.md`
- `docs/30-manager-workflow-follow-up-top-5.md`

Specifically:

- `Synchronize delegated task lifecycle across Manager Desk, Team Tracker, and My Day`

This slice is **frontend-only**. The backend changes for this slice are already implemented.

Read these first:

- `docs/28-manager-workflow-review.md`
- `docs/30-manager-workflow-follow-up-top-5.md`
- `client/src/hooks/useManagerDesk.ts`
- `client/src/hooks/useTeamTrackerMutations.ts`
- `client/src/hooks/useMyDay.ts`
- `client/src/components/manager-desk/ManagerDeskPage.tsx`
- `client/src/components/manager-desk/ItemDetailDrawer.tsx`
- `client/src/components/team-tracker/TrackerTaskDetailDrawer.tsx`
- `client/src/components/team-tracker/TrackerTaskExecutionPanel.tsx`
- `client/src/components/my-day/MyDayPage.tsx`
- `client/src/types/manager-desk.ts`
- `agent/skills/frontend-design/SKILL.md`

## Goal

Make delegated work feel like one coherent object across:

- Manager Desk
- Team Tracker
- My Day

The backend now supports a **parallel-state** lifecycle model:

- Manager Desk remains the manager-owned follow-up record.
- Team Tracker / My Day remain the developer execution record.
- The frontend must show both clearly instead of pretending there is only one status.

## Backend Changes Already Completed

### 1. Manager Desk items now expose delegated execution state

Backend responses that return `ManagerDeskItem` may now include:

```ts
interface ManagerDeskDelegatedExecution {
  trackerItemId: number;
  state: 'planned' | 'in_progress' | 'done' | 'dropped';
  note?: string;
  completedAt?: string;
  updatedAt: string;
}
```

And:

```ts
interface ManagerDeskItem {
  // existing fields...
  delegatedExecution?: ManagerDeskDelegatedExecution;
}
```

This field is present when the Manager Desk item is linked to a live Team Tracker item.

It is now returned from Manager Desk APIs including:

- `GET /api/manager-desk?date=YYYY-MM-DD`
- `POST /api/manager-desk/items`
- `PATCH /api/manager-desk/items/:itemId`
- `GET /api/manager-desk/items/:itemId/detail`
- `GET /api/manager-desk/tracker-items/:trackerItemId/detail`
- `POST /api/manager-desk/tracker-items/:trackerItemId/promote`

### 2. Team Tracker / My Day execution changes now back-sync to Manager Desk

If a linked delegated task changes in Team Tracker or My Day:

- `planned`
- `in_progress`
- `done`
- `dropped`
- execution note changes

Manager Desk now reflects that through `delegatedExecution`.

Important: the backend does **not** auto-overwrite Manager Desk `status`.

That is intentional.

### 3. Ownership is now enforced by the backend

For linked delegated tasks (`managerDeskItemId != null`):

- Team Tracker and My Day may still change:
  - execution `state`
  - execution `note`
  - ordering / current-item behavior
- Team Tracker and My Day may **not** change:
  - `title`
  - manager-owned lifecycle meaning

New backend error behavior:

#### Linked title edit rejection

These routes now return `409` for linked delegated tasks if the frontend tries to rename them:

- `PATCH /api/team-tracker/items/:itemId`
- `PATCH /api/my-day/items/:itemId`

Error message:

```txt
Linked delegated tasks must be renamed from Manager Desk
```

#### Linked delete rejection

These routes now return `409` for linked delegated tasks if the frontend tries to delete them:

- `DELETE /api/team-tracker/items/:itemId`
- `DELETE /api/my-day/items/:itemId`

Error message:

```txt
Linked delegated tasks cannot be deleted; mark them dropped instead
```

## Product Semantics You Must Preserve

### Ownership model

#### Manager-owned fields

Manager Desk owns:

- title
- assignee
- priority
- category / kind
- links
- manager status (`inbox`, `planned`, `in_progress`, `waiting`, `done`, `cancelled`)
- context note
- next action
- outcome
- planned/follow-up schedule fields

#### Developer-owned execution fields

Team Tracker / My Day own:

- execution state (`planned`, `in_progress`, `done`, `dropped`)
- execution note
- which item is current
- queue ordering

### Important UX implication

A delegated task can now look like:

- Manager Desk status: `planned` or `waiting`
- Delegated execution state: `done`

That is valid.

It means:

- the developer finished execution
- the manager still has follow-up or closure work

Do not collapse that distinction in the UI.

## What The Frontend Should Implement

### 1. Show delegated execution state anywhere Manager Desk linked work is rendered

At minimum, update Manager Desk surfaces so linked delegated items show:

- the execution state
- whether execution is done/dropped/in progress
- the latest execution note when useful in detail views

Recommended surfaces:

- Manager Desk main list/cards/rows
- shared task detail drawer
- any status pills or metadata zones that currently imply the desk status is the whole story

You do not need to redesign the whole page, but delegated work must become visibly different from manager-only desk items.

### 2. Update the shared task detail experience to show two layers

In the shared detail flow, render:

- manager-owned status and desk metadata
- developer execution state and execution note

The user should be able to understand:

- what the manager thinks is still open
- what the developer has actually done

Suggested interaction:

- keep `TrackerTaskExecutionPanel` as the execution control area
- add a clear visual summary near the top of `ItemDetailDrawer` or above the manager fields for:
  - `Manager Desk status`
  - `Developer execution`

### 3. Handle new 409 errors correctly in Team Tracker and My Day

Current frontend may still allow interactions that are now rejected by the backend.

Update the UX so linked delegated tasks do not feel broken:

- if a row/detail editor currently allows renaming linked delegated tasks from Team Tracker or My Day, stop doing that
- if a delete affordance exists for linked delegated tasks in Team Tracker or My Day, replace it with a non-destructive execution action such as `Drop`
- if any stale path still reaches the mutation and gets `409`, show the backend message in a clear toast

Preferred UX:

- hide or disable rename/delete affordances for linked delegated tasks before the error happens
- keep tracker-only tasks unchanged

### 4. Keep manager and developer language distinct

Avoid language that implies the manager item and execution item are the same field.

Use labels that make the distinction obvious, for example:

- `Manager Status`
- `Execution`
- `Developer Note`
- `Manager Follow-Up`

Do not reuse a single ambiguous `Status` label for both meanings in the shared detail UI.

### 5. Preserve existing mutation behavior for execution work

Do not change the execution flows themselves:

- Set Current
- Mark Done
- Drop
- Reopen to Planned
- Save execution note

Those still work and now drive `delegatedExecution` on the backend.

## Likely Files To Touch

- `client/src/types/manager-desk.ts`
- `client/src/hooks/useManagerDesk.ts`
- `client/src/hooks/useTeamTrackerMutations.ts`
- `client/src/hooks/useMyDay.ts`
- `client/src/components/manager-desk/ManagerDeskPage.tsx`
- `client/src/components/manager-desk/ItemDetailDrawer.tsx`
- `client/src/components/team-tracker/TrackerTaskDetailDrawer.tsx`
- `client/src/components/team-tracker/TrackerTaskExecutionPanel.tsx`
- `client/src/components/my-day/*`
- `client/src/test/TrackerTaskDetailDrawer.test.tsx`
- `client/src/test/ManagerDesk.test.tsx`
- `client/src/test/MyDayPage.test.tsx`
- `client/src/test/TeamTracker.test.tsx`

You may add one or two small presentation components if needed. Do not let `ManagerDeskPage.tsx` or `TrackerTaskDetailDrawer.tsx` become oversized.

## Acceptance Criteria

- Linked Manager Desk items visibly show delegated execution state.
- Shared task detail clearly separates manager-owned status from developer execution.
- A manager can see when developer execution is done but the Manager Desk item remains open.
- Team Tracker and My Day no longer present linked delegated tasks as if they are freely renameable/deletable tracker-native items.
- Linked rename/delete attempts no longer feel like broken UX.
- Tracker-only tasks still preserve their current editing behavior.
