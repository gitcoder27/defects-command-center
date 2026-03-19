# Manager Desk Carry-Forward Continuity Frontend Prompt

You are implementing the frontend for review item 3 from:

- `docs/28-manager-workflow-review.md`
- `docs/30-manager-workflow-follow-up-top-5.md`

Specifically:

- `Finish Manager Desk carry-forward continuity`

This slice is **frontend-only**. The backend changes for this slice are already implemented.

Read these first:

- `docs/28-manager-workflow-review.md`
- `docs/30-manager-workflow-follow-up-top-5.md`
- `client/src/components/manager-desk/ManagerDeskPage.tsx`
- `client/src/components/manager-desk/CarryForwardDialog.tsx`
- `client/src/hooks/useManagerDesk.ts`
- `client/src/types/manager-desk.ts`
- `client/src/test/ManagerDesk.test.tsx`
- `agent/skills/frontend-design/SKILL.md`

## Goal

Manager Desk must stop feeling like a same-day-only surface.

The UI should now support two continuity behaviors:

- a first-visit prompt that tells the manager when yesterday still has unfinished Manager Desk work that can be carried into the viewed date
- a carry-forward dialog that explains and previews the backend’s new automatic time rebasing behavior and warns when carried items would already arrive overdue

Do not redesign Team Tracker in this task. This is specifically the Manager Desk continuity pass.

## Backend Changes Already Completed

### 1. New Manager Desk preview endpoint

New route:

- `GET /api/manager-desk/carry-forward-preview?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD`

Response:

```ts
type ManagerDeskCarryForwardTimeMode = 'rebase_to_target_date';

type ManagerDeskCarryForwardWarningCode =
  | 'follow_up_overdue_on_arrival'
  | 'planned_end_overdue_on_arrival';

interface ManagerDeskCarryForwardPreviewItem {
  item: ManagerDeskItem;
  rebasedPlannedStartAt?: string;
  rebasedPlannedEndAt?: string;
  rebasedFollowUpAt?: string;
  warningCodes: ManagerDeskCarryForwardWarningCode[];
}

interface ManagerDeskCarryForwardPreviewResponse {
  fromDate: string;
  toDate: string;
  carryable: number;
  overdueOnArrivalCount: number;
  timeMode: ManagerDeskCarryForwardTimeMode;
  items: ManagerDeskCarryForwardPreviewItem[];
}
```

Semantics:

- `items` contains only source-day Manager Desk items that would actually carry right now
- closed items are excluded
- items already carried to the target day are excluded
- `item.id` is the source Manager Desk item id and is the id the frontend must submit back on carry-forward execute
- `timeMode` is currently always `'rebase_to_target_date'`
- `overdueOnArrivalCount` counts items that have at least one warning code

### 2. Existing carry-forward execute route is still the write path

Route:

- `POST /api/manager-desk/carry-forward`

Request:

```ts
{
  fromDate: string;
  toDate: string;
  itemIds?: number[];
}
```

Response:

```ts
{ created: number }
```

Semantics:

- if `itemIds` is omitted, backend carries all currently eligible source-day items
- if `itemIds` is present, backend carries only those selected source Manager Desk item ids
- execute and preview now share the same filtering rules
- if something becomes non-carryable after preview, backend safely skips it and returns the actual `created` count

### 3. Time fields are now automatically rebased

This is the new default carry-forward rule:

- `plannedStartAt`
- `plannedEndAt`
- `followUpAt`

are automatically shifted to the target day during carry-forward.

What is preserved:

- original time-of-day
- original offset suffix (`Z`, `+05:30`, etc.)
- relative day offset from the source desk date

That means overnight spans are preserved correctly.

Examples:

- `2026-03-08T15:00:00.000Z` carried to `2026-03-09` becomes `2026-03-09T15:00:00.000Z`
- if a source item ends after midnight relative to the source day, the carried item still ends after midnight relative to the target day

The frontend should present this as a fixed behavior, not a user choice.

### 4. Preview now reports overdue-on-arrival warnings

Warning codes:

- `follow_up_overdue_on_arrival`
- `planned_end_overdue_on_arrival`

These warnings are added when the rebased timestamp would already be earlier than the current server time at preview time.

Important:

- `plannedStartAt` by itself does **not** create an overdue-on-arrival warning
- warnings are informational only
- the execute route does not block if an item is warned

## What The Frontend Must Change

### 1. Add a first-visit previous-day continuity prompt to Manager Desk

Manager Desk should mirror the Team Tracker pattern:

- when viewing a date, check the previous date
- fetch preview from `previousDate -> viewedDate`
- if `carryable > 0`, show a prompt near the page header on first visit for that viewed date
- allow:
  - `Review & Carry`
  - dismiss

Dismissal should be session-scoped just like Team Tracker.

Recommended storage key:

- `manager-desk:carry-forward-prompt:${date}`

Do not persist dismissal server-side.

### 2. Use preview data for both Manager Desk carry-forward entry points

Both flows should use the new preview contract:

- the first-visit prompt flow: `previousDate -> current viewed date`
- the existing header/dialog flow: `viewed date -> chosen future date`

Do not keep the old blind dialog behavior that only reads local `day.items`.

The dialog should render preview items from the backend response so it can show:

- rebased times
- warning state
- true carryable count after duplicate filtering

### 3. Update the carry-forward dialog copy and content

The dialog must explicitly explain the backend behavior:

- carried schedule fields are automatically rebased to the target day
- the original time-of-day is preserved

The dialog should display, per selected item where relevant:

- source title and current status/kind
- rebased planned window if present
- rebased follow-up time if present
- warning badges/messages when `warningCodes` is non-empty

Recommended warning copy direction:

- `follow_up_overdue_on_arrival`: this follow-up will already be overdue on the target day
- `planned_end_overdue_on_arrival`: this meeting/task window will already have ended on the target day

### 4. Keep selection behavior simple and deterministic

Use Manager Desk source item ids from the preview payload.

Selection rules:

- default all previewed items to selected
- allow per-item toggles
- keep the existing “all selected” optimization:
  - if every preview item is selected, omit `itemIds`
  - if only a subset is selected, send `itemIds`
- zero-selection confirm must be impossible

### 5. Short-circuit empty preview states

If preview returns zero carryable items:

- do not show the first-visit prompt
- do not open an empty carry-forward selection dialog
- header carry-forward should either stay disabled or no-op with clear UX

Do not render an empty modal just because the manager clicked the button.

### 6. Update client-side Manager Desk types to match the backend

The client currently keeps its own Manager Desk types in:

- `client/src/types/manager-desk.ts`

Add matching types there for:

- `ManagerDeskCarryForwardTimeMode`
- `ManagerDeskCarryForwardWarningCode`
- `ManagerDeskCarryForwardPreviewItem`
- `ManagerDeskCarryForwardPreviewResponse`

Also add a preview query hook in `client/src/hooks/useManagerDesk.ts`.

Suggested hook name:

- `useManagerDeskCarryForwardPreview`

## Interaction Requirements

- The first-visit prompt should feel like a continuity reminder, not an error banner.
- The carry-forward dialog should make the time-rebasing rule obvious without becoming verbose.
- Warning styling should distinguish “informational risk” from destructive confirmation.
- Mobile and narrow-width behavior must still work.
- Target date changes in the dialog should refresh preview data for the new `toDate`.

## Suggested File Targets

- `client/src/hooks/useManagerDesk.ts`
- `client/src/types/manager-desk.ts`
- `client/src/components/manager-desk/ManagerDeskPage.tsx`
- `client/src/components/manager-desk/CarryForwardDialog.tsx`
- `client/src/test/ManagerDesk.test.tsx`

You may introduce one or two small Manager Desk-specific components or helpers if needed. Do not let `ManagerDeskPage.tsx` become a large catch-all file.

## Acceptance Criteria

- Manager Desk shows a first-visit previous-day carry-forward prompt when eligible previous-day work exists.
- Dismissing that prompt is remembered per viewed date for the current browser session.
- The Manager Desk carry-forward dialog uses backend preview data instead of only same-day local items.
- The dialog clearly states that times are rebased to the target day.
- Rebased times are visible in the selection UI when an item has time fields.
- Items with overdue-on-arrival warning codes are visibly flagged before confirm.
- Confirming with all items selected preserves the existing carry-all request shape.
- Confirming with a subset sends only the selected source Manager Desk item ids.
- The UI does not open an empty selection dialog when preview has zero items.
- Frontend tests cover:
  - first-visit prompt appearance
  - prompt dismissal storage
  - preview-driven dialog rendering
  - warning rendering
  - subset carry-forward payloads

## Constraints

- Do not add another backend endpoint.
- Do not turn time rebasing into a frontend-only transformation; the backend is authoritative.
- Do not invent new warning codes.
- Do not send Team Tracker item ids in this flow; Manager Desk carry-forward still uses source Manager Desk item ids.
