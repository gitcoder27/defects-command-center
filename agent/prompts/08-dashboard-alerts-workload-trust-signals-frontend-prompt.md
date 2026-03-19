# Dashboard Alerts And Workload Trust Signals Frontend Prompt

You are implementing the frontend for review item 4 from:

- `docs/28-manager-workflow-review.md`
- `docs/30-manager-workflow-follow-up-top-5.md`

Specifically:

- `Clean up dashboard alerts and workload trust signals`

This slice is **frontend-only**. The backend changes for this slice are already implemented.

Read these first:

- `docs/28-manager-workflow-review.md`
- `docs/30-manager-workflow-follow-up-top-5.md`
- `client/src/components/alerts/AlertBanner.tsx`
- `client/src/components/alerts/AlertList.tsx`
- `client/src/components/workload/WorkloadBar.tsx`
- `client/src/components/workload/DeveloperCard.tsx`
- `client/src/components/triage/SuggestionBar.tsx`
- `client/src/hooks/useAlerts.ts`
- `client/src/hooks/useWorkload.ts`
- `client/src/hooks/useSuggestions.ts`
- `client/src/lib/utils.ts`
- `client/src/types/index.ts`
- `client/src/test/WorkloadBar.test.tsx`
- `client/src/test/TriagePanel.test.tsx`
- `agent/skills/frontend-design/SKILL.md`

## Goal

The dashboard must stop presenting the workload bar, alert banner, and assignee suggestion copy as if Jira backlog alone is the whole truth.

The frontend should now make three things obvious:

- issue alerts only represent active in-team work
- `idle developer` means no current or planned tracker work today, not just zero Jira defects
- assignment guidance is a two-signal model:
  - Jira backlog pressure
  - today’s tracker load / capacity state

Do not redesign Team Tracker or Manager Desk in this task. This is specifically the manager dashboard trust-signal cleanup.

## Backend Changes Already Completed

### 1. Issue alerts are now filtered to active in-team issues only

Backend file changed:

- `server/src/services/alert.service.ts`

Issue-based alerts now skip any issue that is:

- done
- explicitly excluded
- out of team scope
- sync inactive / inaccessible

That filtering now applies before generating:

- `overdue`
- `stale`
- `blocked`
- `high_priority_not_started`

Frontend implication:

- you do not need to explain exclusions in the alert UI
- an alert row can now be treated as “this belongs in the live command view”

### 2. Idle-developer semantics changed

Backend files changed:

- `server/src/services/workload.service.ts`
- `server/src/services/alert.service.ts`

New backend meaning of idle:

- `assignedTodayCount === 0`
- and tracker status is not `done_for_today`
- inactive developers are already excluded from workload before this point

Important meaning changes:

- a developer with no active Jira defects but with planned tracker work is **not idle**
- a developer with Jira backlog but no current/planned tracker work **can still be idle**
- a developer marked `done_for_today` with no assignments is **not idle**

Idle alert copy now says:

- `{developerName} has no current or planned work today.`

### 3. Workload payload gained an explicit idle signal

Shared backend contract changed in `shared/types.ts`.

`DeveloperWorkload.signals` now includes:

```ts
signals?: {
  idle: boolean;
  noCurrentItem: boolean;
  overCapacity: boolean;
  backlogTrackerMismatch: boolean;
}
```

Semantics:

- `idle`: no current or planned work today, excluding `done_for_today`
- `noCurrentItem`: there is assigned work today, but nothing is actively in progress
- `overCapacity`: planned/current count exceeds explicit capacity
- `backlogTrackerMismatch`: active Jira backlog exists, but there is no current/planned tracker work

This means the frontend no longer needs to derive idle from `activeDefects === 0`.

### 4. Assignment suggestions now include structured workload data

Shared backend contract changed in `shared/types.ts`.

`AssignmentSuggestion` is now:

```ts
interface AssignmentSuggestion {
  developer: Developer;
  score: number;
  reason: string;
  workload: DeveloperWorkload;
}
```

This is additive. The summary string still exists, but the frontend should prefer the structured `workload` object for rendering meaningful load context.

The backend suggestion reason now always includes both dimensions:

- today load
- backlog score / active Jira issue count

Examples:

- `2/5 planned today, backlog score 3 across 1 active Jira issue`
- `0 planned today, backlog score 1 across 1 active Jira issue`
- `0 planned today, backlog score 0 across 0 active Jira issues, marked done for today`

### 5. Suggestion ranking is now intentionally tracker-aware

Backend ranking order now prefers:

1. active tracker statuses / no special restriction
2. `done_for_today`
3. `blocked`
4. below-capacity before over-capacity
5. lower `capacityUtilization` when available
6. lower `assignedTodayCount`
7. lower Jira `score`
8. lower `activeDefects`

Frontend implication:

- the top suggestion is now more trustworthy for same-day delegation
- you should not display it as if it came from one opaque numeric score

## API Shapes You Must Use

Backend endpoint paths did **not** change.

### `GET /api/team/workload`

Response is still:

```ts
{
  developers: DeveloperWorkload[];
}
```

### `GET /api/alerts`

Response is still:

```ts
{
  alerts: Alert[];
}
```

Important:

- if the current hook assumes `/api/alerts` returns `Alert[]` directly, fix the hook to unwrap `{ alerts }`

### `GET /api/suggestions/assignee/:key`

Response is still:

```ts
{
  issueKey: string;
  suggestions: AssignmentSuggestion[];
}
```

Important:

- if the current hook assumes this endpoint returns `AssignmentSuggestion[]` directly, fix the hook to unwrap `{ suggestions }`

## What The Frontend Must Change

### 1. Update client-side types to match the backend

Update `client/src/types/index.ts` so it mirrors the new backend additions:

- `DeveloperWorkload.signals.idle`
- `AssignmentSuggestion.workload`

Do not invent separate ad hoc local shapes for this.

### 2. Fix the alert hook contract if needed

Update `client/src/hooks/useAlerts.ts` so it consumes the actual backend response wrapper:

```ts
type AlertsResponse = {
  alerts: Alert[];
};
```

Return the unwrapped `alerts` array to components.

### 3. Fix the suggestion hook contract if needed

Update `client/src/hooks/useSuggestions.ts` so the assignee suggestion query consumes:

```ts
type AssigneeSuggestionResponse = {
  issueKey: string;
  suggestions: AssignmentSuggestion[];
};
```

Return the unwrapped `suggestions` array to consumers.

### 4. Update alert presentation copy and semantics

Alert UI should now reflect the refined backend meaning.

Requirements:

- continue showing the alert banner only when alerts exist
- keep grouped summary behavior, but ensure labels remain legible and operational
- treat `idle_developer` as a staffing / attention signal, not as “no Jira work exists”
- when rendering idle alerts, do not contradict the backend with old “no active defects” wording anywhere

Recommended copy direction:

- use “no current or planned work today”
- avoid “unassigned” or “no defects” language for this alert type

### 5. Update workload-bar idle and warning treatment

The workload widget should stop deriving calm/idle state from `activeDefects === 0`.

Instead:

- use `signals.idle` for true idle styling
- keep `signals.overCapacity` as the strongest overload state
- keep `signals.noCurrentItem` as an attention/warning state
- keep `signals.backlogTrackerMismatch` visible as a distinct trust-gap signal

Recommended UI direction:

- calm neutral / muted treatment for `signals.idle`
- warning treatment for `backlogTrackerMismatch`
- warning treatment for `noCurrentItem`
- danger treatment for `overCapacity`, tracker blocked state, or blocked Jira count

Do not collapse all of those into the same generic “low load” color.

### 6. Make suggestion rendering show both signals explicitly

Update the triage suggestion UI so the assignee suggestion is not just:

- developer name
- one opaque reason string

Use the new `workload` object to show compact structured context, for example:

- today load: assigned count or assigned/capacity
- backlog score
- optionally active Jira count
- special status note if `done_for_today` or `blocked`

The current `reason` string can still be shown as secondary/help text, but the primary rendering should become more obviously two-dimensional.

### 7. Keep the interaction model lightweight

This task is about trust and interpretability, not extra clicks.

Requirements:

- no extra modal or drill-in is required to understand basic workload state
- collapsed workload state should stay scannable
- assignee suggestion should remain one-line or compact two-line information
- alert banner should remain lightweight and not become a full dashboard widget

## Suggested UI Behavior

### Workload bar / developer cards

Each developer card should make both of these visible:

- backlog pressure: score and/or active Jira count
- today load: assigned/planned, capacity when present

Examples of useful compact combinations:

- `2/5 today · S3`
- `0 today · S1`
- `0 today · S1` with a mismatch badge when `backlogTrackerMismatch === true`

Suggested signal emphasis:

- `idle`: muted
- `backlogTrackerMismatch`: amber badge or accent
- `noCurrentItem`: amber accent
- `overCapacity`: red
- `blocked`: red

### Suggestion bar

The top assignee suggestion should read as:

- “this person has the lightest effective load right now”

not:

- “this person has the lowest Jira score”

Recommended display pattern:

- primary: developer name
- secondary micro-metrics:
  - today load
  - backlog score
  - active Jira count
- tertiary: existing reason text if needed

### Alert banner / alert list

Keep the banner concise, but reflect the updated meaning in the list items.

Examples:

- issue alerts remain issue-centric
- idle alerts are explicitly about missing same-day work, not missing Jira assignments

## Suggested File Targets

- `client/src/types/index.ts`
- `client/src/hooks/useAlerts.ts`
- `client/src/hooks/useSuggestions.ts`
- `client/src/components/alerts/AlertBanner.tsx`
- `client/src/components/alerts/AlertList.tsx`
- `client/src/components/workload/WorkloadBar.tsx`
- `client/src/components/workload/DeveloperCard.tsx`
- `client/src/components/triage/SuggestionBar.tsx`
- `client/src/lib/utils.ts`
- `client/src/test/WorkloadBar.test.tsx`
- `client/src/test/TriagePanel.test.tsx`

## Acceptance Criteria

1. Dashboard idle state is driven by `signals.idle`, not by `activeDefects === 0`.
2. A developer with tracker work but zero Jira defects is not rendered as idle.
3. A developer with Jira backlog but no tracker plan can be rendered as idle plus mismatch.
4. Idle alert copy matches backend meaning: `no current or planned work today`.
5. Assignee suggestions render both tracker-load and backlog context without parsing the `reason` string.
6. Frontend hooks correctly unwrap the existing `/api/alerts` and `/api/suggestions/assignee/:key` response wrappers.
7. Existing dashboard interaction flow remains lightweight and fast to scan.
