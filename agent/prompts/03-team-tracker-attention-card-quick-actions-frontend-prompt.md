# Team Tracker Attention Cards Quick Actions Frontend Prompt

You are implementing the frontend for Team Tracker manager item 8: "Add Quick Actions to Attention Cards".

Read these first:

- `docs/team-tracker-manager-review.md`
- `docs/team-tracker-manager-implementation-checklist.md`
- `client/src/components/team-tracker/AttentionQueue.tsx`
- `client/src/components/team-tracker/AttentionCard.tsx`
- `client/src/components/team-tracker/TeamTrackerPage.tsx`
- `client/src/hooks/useTeamTracker.ts`
- `client/src/hooks/useTeamTrackerMutations.ts`
- `client/src/hooks/useManagerDesk.ts`
- `client/src/components/manager-desk/ManagerDeskCaptureDialog.tsx`
- `agent/skills/frontend-design/SKILL.md`

## Goal

Make each Team Tracker attention card actionable enough for fast manager triage so the manager does not need to open the drawer for routine follow-up actions.

This is not a full workflow redesign. It is a compact, high-value operational slice that adds quick actions directly on the attention cards while preserving the existing "open drawer" path for deep work.

## Scope Chosen For This Slice

Implement these quick actions on each attention card when available:

- `Update Status`
- `Set Current`
- `Mark Inactive`
- `Capture Follow-Up`

Do not implement these in this slice:

- `Request Update`
- `Snooze`
- `Acknowledge`

Those were deliberately deferred because the backend does not persist any attention-card snooze/acknowledgement state yet, and request-update has no dedicated backend action contract yet.

## Backend Changes Already Completed

The backend now makes the attention queue action-aware.

### Updated attention queue contract

`GET /api/team-tracker?date=YYYY-MM-DD`

Each `attentionQueue[]` item now includes:

- `nextFollowUpAt?: string`
- `availableQuickActions: TrackerAttentionQuickAction[]`
- `setCurrentCandidates: TrackerAttentionActionItem[]`

New shared types added:

```ts
type TrackerAttentionQuickAction =
  | 'update_status'
  | 'set_current'
  | 'mark_inactive'
  | 'capture_follow_up';

interface TrackerAttentionActionItem {
  id: number;
  title: string;
  jiraKey?: string;
  lifecycle: 'tracker_only' | 'manager_desk_linked';
}
```

`TrackerAttentionItem` now effectively contains:

```ts
interface TrackerAttentionItem {
  developer: Developer;
  status: TrackerDeveloperStatus;
  reasons: TrackerAttentionReason[];
  lastCheckInAt?: string;
  nextFollowUpAt?: string;
  isStale: boolean;
  signals: TrackerDeveloperSignals;
  hasCurrentItem: boolean;
  plannedCount: number;
  availableQuickActions: TrackerAttentionQuickAction[];
  setCurrentCandidates: TrackerAttentionActionItem[];
}
```

### Backend availability rules

Backend now decides action availability so the frontend should not re-derive it from scratch.

Current rules:

- `update_status` is always included
- `mark_inactive` is always included
- `capture_follow_up` is always included
- `set_current` is included only when:
  - the developer has no current item
  - the developer has at least one planned item

`setCurrentCandidates` is only populated when `set_current` is available. It is already ordered by tracker item position, so use the array as-is.

### No new write endpoints were added

This slice intentionally reuses existing backend mutations.

Use these existing endpoints:

- Status update:
  - `POST /api/team-tracker/:accountId/status-update`
- Mark inactive:
  - `PATCH /api/team-tracker/:accountId/availability`
- Set current:
  - `POST /api/team-tracker/items/:itemId/set-current`
- Capture follow-up:
  - `POST /api/manager-desk/items`

## Required Frontend Behavior

### 1. Attention cards must expose quick actions inline

Update the attention card UI so each card still supports opening the drawer, but also exposes quick actions directly on the card.

Recommended interaction model:

- keep the card itself clickable for opening the drawer
- add a compact quick-actions strip or compact action area inside the card
- action controls must stop event propagation so clicking them does not open the drawer
- on narrow widths, collapse lower-priority actions into an overflow menu if needed

The result should feel fast and intentional, not cluttered.

### 2. Use backend-provided action availability

Only render actions listed in `item.availableQuickActions`.

Do not show `Set Current` unless `set_current` is present.

When `set_current` is present:

- use `item.setCurrentCandidates`
- if there is exactly one candidate, a single direct button is acceptable
- if there are multiple candidates, provide a compact chooser/popover/menu using that candidate list

Do not guess the candidate task from unrelated board state when `setCurrentCandidates` is present.

### 3. Map each action to the correct existing mutation

#### Update Status

Use the unified Team Tracker status flow, not the old split status/check-in behavior.

Existing backend endpoint:

- `POST /api/team-tracker/:accountId/status-update`

Use the existing or newly-created frontend mutation wrapper that calls that endpoint.

The quick action can open a compact status sheet/popover/dialog. It should support:

- status
- rationale where required
- optional note
- optional next follow-up datetime

For `blocked` and `at_risk`, rationale is required because the backend enforces it.

#### Mark Inactive

Use:

- `PATCH /api/team-tracker/:accountId/availability`

Existing frontend hook:

- `useUpdateAvailability(date)`

For this quick action, a lightweight confirmation or small dialog is acceptable. Include optional note capture if it fits cleanly.

#### Set Current

Use:

- `POST /api/team-tracker/items/:itemId/set-current`

Existing frontend hook:

- `useSetCurrentItem(date)`

If multiple candidates exist, let the manager choose from `item.setCurrentCandidates`.

After success, rely on query invalidation/refetch so the attention queue and board update naturally.

#### Capture Follow-Up

Use the existing Manager Desk creation path, not a new Team Tracker endpoint.

Use:

- `POST /api/manager-desk/items`

Existing frontend pieces:

- `useCreateManagerDeskItem(date)` or the existing capture dialog flow
- `ManagerDeskCaptureDialog`

The quick action should prefill the follow-up capture with:

- developer link:
  - `links: [{ linkType: 'developer', developerAccountId: item.developer.accountId }]`
- initial title:
  - something like `Follow up with {developer}`
- context:
  - if current tracker/Jira context is already available from surrounding page state, include it
  - otherwise it is acceptable to create a developer-linked follow-up without extra issue context

## UI/Interaction Requirements

### Loading and disabled states

- Each action should show a local pending state.
- Pending action controls must be disabled while their own mutation is in flight.
- A pending quick action must not block the whole page.

### Error handling

- Surface failures with the existing toast/error patterns used in Team Tracker and Manager Desk.
- Do not silently fail.

### Success behavior

- Keep the manager on the Team Tracker page.
- Do not force-open the drawer after a quick action succeeds.
- Let existing query invalidation refresh the attention queue and cards.

### Drawer interaction

- Preserve the existing card click -> drawer open behavior.
- Quick action buttons must not trigger drawer open accidentally.

## Files Most Likely To Change

You do not have to limit yourself to these, but start here:

- `client/src/components/team-tracker/AttentionCard.tsx`
- `client/src/components/team-tracker/AttentionQueue.tsx`
- `client/src/components/team-tracker/TeamTrackerPage.tsx`
- `client/src/hooks/useTeamTrackerMutations.ts`

Potential supporting files:

- a new compact quick-actions component under `client/src/components/team-tracker/`
- reuse or adapt `ManagerDeskCaptureDialog`
- any small state helpers needed for action popovers/dialogs

## Design Direction

This is a manager triage surface, not a generic CRUD strip.

The quick actions should feel:

- compact
- legible at a glance
- fast under pressure
- visually subordinate to the attention reason chips, but still easy to use

Avoid:

- bloated full-width button bars
- generic modal-heavy interaction for every action
- interactions that feel like a second full drawer embedded in the card

Use the frontend design skill to make the controls intentional and polished.

## Tests To Add Or Update

Add/update frontend tests around Team Tracker attention cards for:

- quick actions render only when listed in `availableQuickActions`
- `Set Current` is hidden when not available
- `Set Current` uses `setCurrentCandidates`
- action click does not open the drawer
- successful status update path
- blocked/at-risk status update requires rationale in the UI before submit
- successful mark-inactive path
- successful capture-follow-up path
- error toast/path for failed mutations

## Acceptance Criteria

- A manager can resolve common attention-card actions without opening the drawer.
- Attention card actions are driven by backend-provided availability.
- `Set Current` works from the candidate list returned by the backend.
- Status updates use the unified status endpoint.
- Follow-up capture uses the existing Manager Desk creation flow.
- The card remains readable and functional on both desktop and narrower layouts.
