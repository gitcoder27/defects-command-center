# Frontend Prompt: Team Tracker Search, Sorting, Grouping, and Saved Views

Implement the Team Tracker manager UI for review item 7: add search, sorting, grouping, and saved views to the manager Team Tracker page.

This prompt is for frontend-only work. The backend for this feature is already implemented.

## Goal

Make Team Tracker scale better for larger teams without changing the core workflow:

- keep the summary strip
- keep the attention queue
- keep the inactive tray
- keep the developer card board and drawer flow

Add manager-facing controls so the board can be searched, sorted, grouped, and saved into reusable named views.

## Product Decisions Already Locked

- saved views are private per manager
- backend is the source of truth for search, sorting, and grouping
- default board sort is alphabetical by developer name
- saved views store only:
  - search query
  - summary filter
  - sort choice
  - group choice
- no shared views, favorite views, or default-view pinning in v1

## Existing UI Context

Current Team Tracker already has:

- date navigation
- summary-chip filtering
- attention queue
- inactive developer tray
- flat developer card grid
- developer drawer

Routing is still handled in `client/src/App.tsx` without React Router.

## Backend Endpoints

### 1. Team Tracker board query

`GET /api/team-tracker?date=YYYY-MM-DD[&q=...&summaryFilter=...&sortBy=...&groupBy=...&viewId=...]`

Supported query params:

- `date` required
- `q` optional string, max 200
- `summaryFilter` optional enum:
  - `all`
  - `stale`
  - `blocked`
  - `at_risk`
  - `waiting`
  - `overdue_linked`
  - `over_capacity`
  - `status_follow_up`
  - `no_current`
  - `done_for_today`
- `sortBy` optional enum:
  - `name`
  - `attention`
  - `stale_age`
  - `load`
  - `blocked_first`
- `groupBy` optional enum:
  - `none`
  - `status`
  - `attention_state`
- `viewId` optional positive integer

Saved-view precedence:

- if `viewId` is provided, backend loads that saved view first
- explicit query params override the saved-view values
- example: `viewId=5&sortBy=name` means use view 5, but force sort to `name`

### 2. Saved views list

`GET /api/team-tracker/views`

Response:

```ts
{
  views: TeamTrackerSavedView[];
}
```

### 3. Create saved view

`POST /api/team-tracker/views`

Request body:

```ts
{
  name: string;
  q?: string;
  summaryFilter?: TrackerBoardSummaryFilter;
  sortBy?: TeamTrackerBoardSort;
  groupBy?: TeamTrackerBoardGroupBy;
}
```

Response: saved view object

### 4. Update saved view

`PATCH /api/team-tracker/views/:viewId`

Request body can include any subset of:

```ts
{
  name?: string;
  q?: string;
  summaryFilter?: TrackerBoardSummaryFilter;
  sortBy?: TeamTrackerBoardSort;
  groupBy?: TeamTrackerBoardGroupBy;
}
```

Notes:

- sending `q: ""` clears the saved search
- at least one field is required

Response: updated saved view object

### 5. Delete saved view

`DELETE /api/team-tracker/views/:viewId`

Response:

```ts
{ deleted: true }
```

## Backend Response Additions

`TeamTrackerBoardResponse` now includes these extra fields:

```ts
interface TeamTrackerBoardResponse {
  date: string;
  developers: TrackerDeveloperDay[];
  inactiveDevelopers: InactiveDeveloperListItem[];
  summary: TrackerBoardSummary;
  visibleSummary: TrackerBoardSummary;
  groups: TrackerDeveloperGroup[];
  query: TeamTrackerBoardResolvedQuery;
  attentionQueue: TrackerAttentionItem[];
}
```

### `summary`

This is still the full active-board summary for the selected date before search/filter/grouping.

Use this if you want the top summary strip to keep showing global team totals.

### `visibleSummary`

This is the summary for the currently visible board after search + summary filter.

Use this anywhere you want “current view” counts.

### `query`

This is the resolved query that backend actually applied.

```ts
interface TeamTrackerBoardResolvedQuery {
  q: string;
  summaryFilter: TrackerBoardSummaryFilter;
  sortBy: TeamTrackerBoardSort;
  groupBy: TeamTrackerBoardGroupBy;
  viewId?: number;
}
```

Use this to hydrate control state from the server response instead of assuming local state is canonical.

### `groups`

Grouped board payload:

```ts
interface TrackerDeveloperGroup {
  key: string;
  label: string;
  count: number;
  developers: TrackerDeveloperDay[];
}
```

Grouping behavior:

- `none`
  - backend returns one group:
    - `key: "all"`
    - `label: "All Developers"`
- `status`
  - groups returned in this order when non-empty:
    - `blocked`
    - `at_risk`
    - `waiting`
    - `on_track`
    - `done_for_today`
- `attention_state`
  - groups returned in this order when non-empty:
    - `needs_attention`
    - `stable`

`developers` is still returned as the flat visible list, already filtered and sorted.

## Search Behavior Already Implemented in Backend

Search is case-insensitive substring match across:

- developer display name
- manager notes
- check-in summaries
- tracker item title
- tracker item Jira key
- tracker item Jira summary
- tracker item note

Inactive developers are also searched by:

- developer display name
- availability note

## Sorting Behavior Already Implemented in Backend

### `name`

Alphabetical by developer display name.

### `attention`

Uses the same attention priority logic as the attention queue.

### `stale_age`

Oldest last activity first.

### `load`

Sorts by:

1. highest capacity delta first
2. highest open work count next
3. name as tie-breaker

### `blocked_first`

Status order:

1. `blocked`
2. `at_risk`
3. `waiting`
4. `on_track`
5. `done_for_today`

Then backend applies attention tie-breaks and name.

## What To Build on the Frontend

### 1. Query state plumbing

Update Team Tracker data fetching so React Query keys include the board query state:

- `date`
- `q`
- `summaryFilter`
- `sortBy`
- `groupBy`
- `viewId`

The board request should send all active query fields to the backend.

### 2. Search UI

Add a search input for Team Tracker manager page.

Requirements:

- search should update the board query
- debounce is acceptable and likely preferable
- placeholder should clearly indicate what is searchable, for example developer/task/Jira
- support clearing the search quickly

### 3. Sort control

Add a sort control for:

- `name`
- `attention`
- `stale_age`
- `load`
- `blocked_first`

Use backend `query.sortBy` as the source of truth for the selected value after load.

### 4. Grouping control

Add a grouping control for:

- `none`
- `status`
- `attention_state`

Render the board from `groups` when grouping is active.

Recommended behavior:

- if `groupBy === "none"`, you can either render the single `groups[0]` section or keep using flat `developers`
- if grouped, render clear group headers with counts

### 5. Saved views UI

Add saved-view management for managers:

- list saved views
- apply a saved view
- create a new saved view from the current query
- update an existing saved view
- delete a saved view

Backend model:

```ts
interface TeamTrackerSavedView {
  id: number;
  name: string;
  q: string;
  summaryFilter: TrackerBoardSummaryFilter;
  sortBy: TeamTrackerBoardSort;
  groupBy: TeamTrackerBoardGroupBy;
  createdAt: string;
  updatedAt: string;
}
```

Important behavior:

- applying a saved view should request the board with `viewId`
- if the user then changes search/sort/group/filter, the board query should include `viewId` plus the explicit override fields
- the UI should make it clear when the current board differs from the saved view that was loaded

### 6. Summary strip behavior

The existing summary strip already acts like a summary filter.

You need to decide how to integrate it with the new query model, but the backend expectation is:

- summary-chip selection should map to `summaryFilter`
- use `query.summaryFilter` as the selected state

Keep using the current summary chips as the main quick filter entry point unless you have a clearly better design that still preserves scan speed.

### 7. Board rendering behavior

Use:

- `developers` for the flat visible board
- `groups` for grouped rendering
- `summary` for full-board counts
- `visibleSummary` for “current results” messaging if you choose to show it

The backend already returns the visible list sorted and grouped consistently. Do not reimplement search/sort/group logic locally.

## Suggested Frontend Hooks Work

Likely updates:

- extend `client/src/hooks/useTeamTracker.ts`
- add saved-view hooks or queries/mutations in the Team Tracker hook layer
- keep API access in hooks / `client/src/lib/api.ts`, not inside components

Recommended additions:

- `useTeamTracker(date, query)`
- `useTeamTrackerViews()`
- `useCreateTeamTrackerView()`
- `useUpdateTeamTrackerView()`
- `useDeleteTeamTrackerView()`

## Acceptance Criteria

The frontend implementation is complete when all of these are true:

- manager can search Team Tracker by developer/task/Jira text
- manager can change sort order
- manager can group the board
- manager can save the current board configuration as a named view
- manager can reopen and apply a saved view
- manager can update or delete a saved view
- summary chips still work and map cleanly onto backend `summaryFilter`
- grouped rendering uses backend `groups`
- board state is preserved through React Query keys and refetches cleanly when date/query changes
- no direct `fetch` calls are added inside components

## Notes for Implementation

- do not add React Router
- preserve the current Team Tracker page structure and workflow hierarchy
- use the backend response as the source of truth for resolved query state
- avoid recomputing search, sort, or group rules on the client
- design freedom is high for the controls and layout, but operational clarity matters more than decorative density
