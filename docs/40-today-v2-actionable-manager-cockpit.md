# Today V2: Actionable Manager Cockpit

Date: 2026-05-03

## Purpose

The current Today page already has the right foundation: attention count, work signals, team pulse, follow-ups, standup prompts, and quick actions. Today V2 should not replace that foundation. It should turn Today from a useful summary screen into the manager's daily action cockpit.

The core shift:

> Today should not only tell the manager what area needs attention. It should show the exact person, issue, desk item, meeting, or promise that needs action, then make the next action obvious.

This document describes the product behavior, design direction, architecture, implementation phases, and testing plan for Today V2.

## Goals

- Let a manager run the first 10-15 minutes of their day from Today.
- Show the few most important actionable items, not every possible signal.
- Reduce navigation hops by opening exact people, issues, desk items, follow-ups, and meeting items.
- Add safe inline actions for common workflows: check-in, snooze, mark done, assign, capture follow-up, carry forward, and open exact item.
- Preserve the existing visual quality: sleek, minimal, dense but calm, with very little explanatory copy.
- Keep Today fast and trustworthy by using structured contracts and clear freshness states.

## Non-Goals

- Do not build a new project management system inside Today.
- Do not duplicate the full Work, Team, Desk, Follow-ups, or Meetings pages.
- Do not make a card-heavy dashboard mosaic.
- Do not add long instructional copy, marketing text, or explanations of how to use the UI.
- Do not add AI-generated suggestions until the underlying action model is structured and reliable.
- Do not introduce React Router or a global state framework for this work.

## Current State

Current implementation:

- `client/src/components/today/TodayPage.tsx`
- `client/src/hooks/useManagerAttention.ts`
- `client/src/lib/manager-attention.ts`

Current strengths:

- Strong first version of the manager home screen.
- Good summary strip and visual hierarchy.
- Team Pulse already shows stale/check-in signals.
- Standup brief already exists.
- Manual work from Desk and Team Tracker is included.
- Follow-ups due are already visible.

Current gaps:

- Rows mostly open broad destinations such as Team, Desk, or Work.
- Attention items are aggregate rows instead of exact action targets.
- Team Pulse does not yet open a specific developer drawer or prefilled check-in/follow-up flow.
- Follow-ups do not yet support row-level snooze/reschedule from Today.
- Desk items do not yet expose quick status transitions from Today.
- Standup kit is a brief, not a guided workflow.
- The attention model is client-derived from multiple hooks, which is good for v1 but will become hard to trust once Today owns write actions.

## Product Principle

Today V2 should follow this hierarchy:

1. **One current priority**: the strongest signal the manager should handle first.
2. **Short action queue**: 5-8 exact items, ranked by impact and urgency.
3. **People pulse**: compact roster of people needing manager attention.
4. **Promises and rhythm**: due follow-ups, meeting actions, and standup prompts.
5. **Fast escape hatches**: open full Team, Work, Desk, Follow-ups, or Meetings when needed.

The manager should be able to scan the page in under 10 seconds and know what to do.

## Visual Thesis

Calm command-center interface: dark, precise, thin-lined, list-first, with cyan as the primary action accent and amber/red reserved only for true urgency.

The page should feel more like a professional operating console than a dashboard. Use restrained rows, dividers, compact chips, and one dominant action area. Avoid stacking decorative cards.

## Content Plan

Top viewport:

- Compact day/rhythm header.
- Summary metrics kept to a small number.
- One highlighted current priority.
- Action queue and people pulse visible without scrolling on common desktop sizes.

Main body:

- Left: prioritized action queue.
- Right: people pulse plus promises/rhythm.
- Bottom: slim command bar for capture and fast navigation.

Detail surfaces:

- Use drawers, popovers, or existing page drawers for exact-item work.
- Today should not expand into a full editing page.

## Interaction Thesis

- Rows should feel like precise commands: hover reveals the primary action and a small secondary action menu.
- Inline actions should update optimistically where safe, then show a compact toast.
- Detail should open in place when possible, using drawers or existing feature surfaces instead of losing the user's place.

Motion should be subtle:

- Fast row hover reveal for actions.
- Drawer/panel entrance with short Framer Motion transitions.
- Smooth optimistic removal or status change for completed/snoozed rows.

## UX Rules

### Do

- Use list rows and divided sections instead of many cards.
- Limit the first screen to the most important 5-8 actions.
- Use exact entity names: developer, issue key, desk item title, follow-up title.
- Keep row copy short: title, one context line, one compact signal.
- Make the primary action visually obvious.
- Put secondary actions behind a small icon button or compact menu.
- Preserve keyboard and pointer affordances.
- Use existing design tokens and dark theme variables.
- Use Lucide icons for recognizable actions.
- Prefer drawers/popovers over new full pages for small actions.

### Avoid

- More summary counters unless they change a decision.
- Large cards for every action.
- Long row descriptions.
- Multiple primary buttons in the same row.
- Colored backgrounds everywhere.
- New colors beyond the existing accent, warning, danger, success, and muted neutrals.
- UI text explaining features or shortcuts.
- Empty-state panels that take more space than active content.
- Decorative gradients or large ornamental visuals.

## Information Architecture

### 1. Rhythm Header

Keep the existing top summary feel, but make it more decisive.

Recommended content:

- Date and refresh state.
- Current rhythm stage:
  - Morning plan
  - Standup window
  - Midday check
  - Wrap-up
- Attention count.
- Stale check-ins.
- Follow-ups due.
- Due/overdue work.
- Sync status, if unhealthy.

Design:

- One thin horizontal band.
- No more than 5-6 metrics visible on desktop.
- Metrics should be tappable only if they open a useful filtered view.
- Use tabular numbers and small labels.

### 2. Current Priority

A single row or slim band above the queue.

Example:

```text
Start here    Ganesh M H has no current work and a stale check-in     Ask for check-in
```

Rules:

- Only one item.
- If there is no urgent item, show a quiet success state and suggest standup or plan confirmation.
- Do not use a large hero card.

### 3. Action Queue

This is the main Today V2 feature.

Rows should represent exact targets, not only aggregate categories.

Examples:

- `Ganesh M H` -> `No current work, stale check-in` -> `Ask for check-in`
- `AM-123` -> `Overdue, unassigned` -> `Assign owner`
- `Follow up with Ayan` -> `Overdue yesterday` -> `Snooze`
- `Migration review` -> `Meeting has no outcome` -> `Capture outcome`
- `Manager Desk item` -> `Planned yesterday, still open` -> `Carry forward`

Recommended row fields:

- Entity label: developer name, issue key, desk item title, meeting title.
- Reason: short signal text.
- Context: current work, due date, status, or linked issue.
- Primary action.
- Secondary menu.
- Severity.
- Exact target reference.

Actions should be grouped internally by urgency, but visually avoid over-segmentation. Prefer a compact label like `Now`, `Next`, `Later` only when it improves scanability.

### 4. People Pulse

Keep the existing compact table-like roster. Upgrade behavior, not visual density.

Rows should support:

- Open exact developer drawer.
- Add/check-in for that developer.
- Capture follow-up prefilled with developer link and current Jira issue when available.
- Set current work when the developer has planned work but no current item.

Design:

- Keep initials, status chip, current work, freshness, and one action.
- Show 4-6 people max.
- Use `View all team pulse` to go to Team.

### 5. Promises and Rhythm

Merge follow-ups, meeting actions, and standup prompts into a compact right-side rhythm area.

Recommended tabs or segmented control:

- `Promises`
- `Standup`
- `Meetings`

Keep only one visible mini-list at a time to reduce clutter. If tabs feel too heavy, keep sections but show only 2-3 rows each.

Actions:

- Follow-up: `Done`, `Snooze`, `Open`.
- Standup prompt: `Start`, `Skip`, `Capture follow-up`.
- Meeting: `Capture outcome`, `Create follow-up`, `Open`.

### 6. Command Footer

Keep the existing slim command footer, but make capture context-aware.

Recommended actions:

- Capture
- Open Work
- Open Team
- Open Desk
- Standup

When context exists, the capture action should adapt:

- From a selected developer: capture follow-up for developer.
- From a selected issue: capture issue note/follow-up.
- From a meeting prompt: capture meeting outcome.

## Action Model

Today V2 needs structured action rows. Add shared contracts rather than relying on UI-only row shapes.

Suggested shared types in `shared/types.ts`:

```ts
export type TodayActionTargetType =
  | "issue"
  | "developer"
  | "manager_desk_item"
  | "tracker_item"
  | "follow_up"
  | "meeting"
  | "view";

export type TodayActionKind =
  | "open"
  | "ask_check_in"
  | "add_check_in"
  | "set_current_work"
  | "assign_owner"
  | "capture_follow_up"
  | "snooze"
  | "mark_done"
  | "carry_forward"
  | "capture_meeting_outcome";

export type TodayActionSeverity = "critical" | "warning" | "info" | "neutral" | "success";

export interface TodayActionTarget {
  type: TodayActionTargetType;
  view: "work" | "team" | "desk" | "follow-ups" | "meetings";
  issueKey?: string;
  developerAccountId?: string;
  managerDeskItemId?: number;
  trackerItemId?: number;
  date?: string;
  filter?: FilterType;
}

export interface TodayActionCommand {
  kind: TodayActionKind;
  label: string;
  target: TodayActionTarget;
  confirm?: boolean;
}

export interface TodayActionItem {
  id: string;
  title: string;
  context: string;
  signal: string;
  severity: TodayActionSeverity;
  priority: number;
  group: "now" | "next" | "later";
  target: TodayActionTarget;
  primaryAction: TodayActionCommand;
  secondaryActions: TodayActionCommand[];
  freshness?: string;
}
```

Keep this contract narrow. Avoid putting full issue, developer, or desk item objects into every row unless the UI truly needs them.

## Backend/API Plan

The current client-side aggregator is fine for v1. V2 should introduce a server-backed read model once write actions become first-class.

Recommended endpoint:

```text
GET /api/today?date=YYYY-MM-DD
```

Response:

```ts
export interface TodayResponse {
  date: string;
  generatedAt: string;
  rhythm: TodayRhythmState;
  summary: TodaySummaryMetric[];
  currentPriority?: TodayActionItem;
  actionItems: TodayActionItem[];
  teamPulse: TodayTeamPulseItem[];
  promises: TodayPromiseItem[];
  standupPrompts: TodayStandupPrompt[];
  meetingPrompts: TodayMeetingPrompt[];
  syncStatus?: SyncStatus;
}
```

Suggested files:

- `server/src/routes/today.ts`
- `server/src/services/today.service.ts`
- `server/tests/today.route.test.ts`
- `server/tests/today.service.test.ts`

Service responsibilities:

- Aggregate existing Overview, Issues, Team Tracker, Manager Desk, and Sync data.
- Rank action items deterministically.
- Build exact targets for issue, developer, tracker item, and desk item rows.
- Avoid side effects.
- Return stable IDs for rows so optimistic UI updates are reliable.

Do not duplicate business rules blindly. Reuse existing services and pure helpers where possible:

- Team attention from Team Tracker board/attention queue.
- Follow-up due logic from Manager Desk helper patterns.
- Issue urgency from existing overview/filter rules.
- Sync status from existing sync route/service.

### Write Actions

Prefer existing domain endpoints for writes:

- Check-in: Team Tracker mutation endpoint.
- Status update: Team Tracker status update endpoint.
- Desk item status: Manager Desk update endpoint.
- Follow-up done/snooze: Manager Desk update endpoint.
- Carry forward: Manager Desk carry-forward endpoint.
- Assign owner: existing issue update path if supported.

Add a Today-specific command endpoint only if multiple workflows need orchestration:

```text
POST /api/today/actions
```

Use it sparingly. A generic command endpoint can become vague quickly. Prefer explicit existing routes unless one action must atomically touch multiple domains.

## Frontend Implementation Plan

Refactor Today into small components before adding more behavior. `TodayPage.tsx` should not become a thousand-line orchestration file.

Suggested structure:

```text
client/src/components/today/
  TodayPage.tsx
  TodayRhythmHeader.tsx
  TodayCurrentPriority.tsx
  TodayActionQueue.tsx
  TodayActionRow.tsx
  TodayPeoplePulse.tsx
  TodayRhythmRail.tsx
  TodayCommandFooter.tsx
  TodayActionMenu.tsx
  TodaySnoozePopover.tsx
  TodayStandupDrawer.tsx
  today-design.ts
```

Suggested hooks/libs:

```text
client/src/hooks/useToday.ts
client/src/hooks/useTodayActions.ts
client/src/lib/today-ranking.ts
client/src/lib/today-view-model.ts
```

Implementation notes:

- Keep `useManagerAttention` temporarily while building the server endpoint.
- Introduce `useToday` behind the same UI once `/api/today` exists.
- Keep row view-model mapping in `today-view-model.ts`, not inside JSX.
- Keep action mutations in `useTodayActions.ts`.
- Reuse existing Team, Desk, and Work hooks/mutations where possible.

## Design Specification

### Layout

Desktop:

```text
Rhythm header
Current priority
------------------------------------------------
Action queue                         People/Rhythm rail
Action queue                         People/Rhythm rail
------------------------------------------------
Command footer
```

Recommended grid:

- Main area: `minmax(0, 1.08fr)` + `minmax(360px, 0.92fr)` similar to current Today.
- Preserve the current dense viewport usage.
- Avoid additional nested cards.

Mobile/tablet:

- Header first.
- Current priority second.
- Action queue third.
- People/Rhythm rail below.
- Footer actions collapse into icon-first horizontal scroll or compact grid.

### Typography

- Page/section heading: 16-18px, semibold.
- Row title: 13-14px, medium.
- Row context: 12-13px, muted.
- Metric number: 20-24px, tabular.
- Chips: 11px, medium.
- Avoid hero-scale text inside the app surface.

### Color

- Primary action: `var(--accent)`.
- Critical: `var(--danger)`.
- Warning: `var(--warning)`.
- Success: `var(--success)`.
- Backgrounds: existing `--bg-canvas`, `--bg-primary`, `--bg-secondary`, `--bg-tertiary`.
- Dividers: low-opacity border tokens.

Use colored backgrounds sparingly:

- Status chips.
- The single current priority row.
- Hover or selected state.

Do not make entire sections amber/red/cyan.

### Density

Hard limits:

- Top summary: max 6 metrics.
- Current priority: 1 row.
- Action queue: show max 8 rows before `View all`.
- People pulse: show max 6 rows.
- Follow-up/standup/meeting mini-lists: show max 3 rows each.

When there are more items, route to the full workflow surface.

### Copy

Use product utility copy only.

Good:

- `Ask for check-in`
- `Assign owner`
- `Due today`
- `No current work`
- `Overdue follow-up`
- `Capture outcome`

Avoid:

- “This feature helps you...”
- “Streamline your managerial workflow...”
- Long explanations of why a signal exists.
- Paragraphs inside rows.

### Row Anatomy

Recommended desktop row:

```text
[icon] [title] [context] [signal chip] [primary action] [...]
```

Recommended mobile row:

```text
[icon] title                       [chip]
       context
       primary action
```

### Empty States

Empty states should be compact and rewarding, not large.

Examples:

- `Team is calm`
- `No follow-ups due`
- `No urgent signals`

One short supporting line is enough.

## Ranking Rules

Today should rank items by urgency and manager actionability.

Suggested priority order:

1. Blocked developer.
2. Overdue follow-up.
3. Overdue issue with owner.
4. Overdue issue without owner.
5. Stale check-in with no current work.
6. Due today issue.
7. Unassigned issue.
8. High-priority not started.
9. Meeting without captured outcome.
10. Desk item planned before now but not started.
11. Manual non-Jira work open today.
12. General stale work.

Tie-breakers:

- Critical before warning before info.
- Older due/follow-up dates before newer.
- People signals before work signals when severity ties.
- Items with direct write actions before view-only items.

## Inline Actions

### Ask For Check-In

Target: developer/team day.

Behavior:

- Opens a compact check-in drawer or the existing developer drawer focused on check-in.
- Prefills context from the top reason.
- Optional future enhancement: create a Manager Desk follow-up if no response.

### Add Check-In

Target: developer/team day.

Behavior:

- Opens quick check-in input.
- Uses existing Team Tracker check-in mutation.
- Refetches Today and Team Tracker.

### Set Current Work

Target: developer with planned work and no current item.

Behavior:

- Show planned item picker.
- Uses existing set-current mutation.
- Remove or downgrade the Today action after success.

### Capture Follow-Up

Target: developer, issue, tracker item, or desk item.

Behavior:

- Opens Manager Desk capture dialog.
- Prefills `kind: waiting`, `category: follow_up`.
- Adds structured links:
  - developer link when developer exists.
  - issue link when issue key exists.
  - tracker/desk context in note if no structured link exists yet.

### Snooze Follow-Up

Target: Manager Desk follow-up item.

Behavior:

- Compact menu: later today, tomorrow, next week, custom.
- Updates `followUpAt`.
- Optimistically removes from due list if no longer due.

### Mark Done

Target: Manager Desk item or follow-up.

Behavior:

- Updates status to `done`.
- Optimistically removes from queue.
- Toast with undo can be a later enhancement.

### Carry Forward

Target: Manager Desk item.

Behavior:

- Uses existing carry-forward flow.
- For single item, allow quick carry to today/tomorrow.
- Respect carry-forward warnings and time rebasing from Manager Desk logic.

### Assign Owner

Target: Jira issue.

Behavior:

- Open issue/triage panel with assignment focused, or use existing update issue mutation if assignment UI is ready.
- Do not invent a new assignment experience inside Today if Work already owns the safe flow.

### Capture Meeting Outcome

Target: Manager Desk meeting item.

Behavior:

- Opens a compact outcome drawer.
- Captures outcome, decision, and optional next action.
- Optional next action can become a follow-up in one step.

## Phased Implementation

### Phase 0: Trust Fixes

Handle before or alongside V2 if still open:

- Work clear filters should clear hidden/persisted status exclusions.
- Setup Wizard skip behavior should not run the same sync path as finish-and-sync.
- Jira comment hook/server contract should be aligned if still broken.
- Dashboard keyboard navigation should follow visible table row order if still broken.

Why:

Today depends on trust. If the underlying workflows feel unreliable, a better cockpit will amplify distrust.

### Phase 1: Frontend Restructure Without Behavior Change

Goal: split Today into focused components while preserving the current UI.

Tasks:

- Extract header, action queue, row, people pulse, mini-list, standup brief, and footer components.
- Move row mapping helpers out of `TodayPage.tsx`.
- Add focused tests around current render behavior.
- Keep the screenshot-level visual output nearly unchanged.

Validation:

- `npm run typecheck`
- `npm run test --workspace=client -- TodayPage`

### Phase 2: Exact Targets and Deep Links

Goal: make rows open exact targets where possible.

Tasks:

- Extend attention view models with entity references.
- Team Pulse row opens the developer drawer or Team with developer selected.
- Work row opens Work with exact issue selected when one issue is the lead sample.
- Follow-up row opens exact Desk item or Follow-ups item.
- Desk row opens exact Desk item where possible.

Validation:

- Frontend tests for navigation target construction.
- Manual click-through on Today rows.

### Phase 3: Server Today Read Model

Goal: introduce `/api/today` and shared contracts.

Tasks:

- Add Today shared response/action types.
- Add `TodayService`.
- Add `GET /api/today`.
- Reuse existing services and pure helpers.
- Keep client aggregator as fallback during rollout.

Validation:

- `npm run test`
- Route tests for manager auth, empty state, ranked actions, and exact targets.
- Service tests for ranking and aggregation.

### Phase 4: Inline Actions

Goal: add the highest-value write actions without clutter.

Start with:

- Mark follow-up done.
- Snooze follow-up.
- Add/check-in for developer.
- Capture follow-up with structured links.
- Open exact issue/developer/desk item.

Later:

- Set current work.
- Carry forward single Desk item.
- Capture meeting outcome.
- Assign owner.

Validation:

- Mutation tests/hook tests where practical.
- Frontend interaction tests for row action menus.
- Backend tests if a Today command endpoint is introduced.

### Phase 5: Standup Mode

Goal: turn standup prompts into a guided flow without taking over the page.

Tasks:

- Add `TodayStandupDrawer`.
- Queue people/issues/promises from `standupPrompts` and top action items.
- Each step supports: mark reviewed, add check-in, capture follow-up, open target.
- Keep the drawer minimal and keyboard-friendly.

Validation:

- Frontend tests for step navigation and action dispatch.

### Phase 6: Polish and Operating-System Feel

Tasks:

- Add nav/header badges for attention, follow-ups, stale team signals, and sync issue.
- Add subtle row transitions for completed/snoozed actions.
- Add compact freshness indicator for Today data.
- Add empty calm-state polish.

Validation:

- Screenshot review at desktop and mobile sizes.
- Check text truncation and no overlapping UI.
- Verify color hierarchy in dark mode and light mode if supported.

## Testing Plan

Backend:

- Today endpoint requires manager auth.
- Developer users cannot access `/api/today`.
- Empty data returns stable empty response.
- Ranking puts blocked/overdue/stale-critical items first.
- Follow-ups due and overdue are included correctly.
- Exact targets include issue key, developer account ID, desk item ID, and tracker item ID when available.
- No side effects happen during `GET /api/today`.

Frontend:

- Renders compact empty state.
- Renders current priority when action items exist.
- Limits visible rows according to density rules.
- Row primary action opens correct target.
- Team Pulse opens correct developer context.
- Snooze menu updates follow-up and removes it from due list.
- Mark done removes item optimistically and refetches.
- Standup drawer steps through prompts.
- Mobile layout stacks without text overlap.

Validation commands:

- `npm run typecheck`
- `npm run build:check`
- `npm run test`
- `npm run test --workspace=client`

Use narrower test commands during development, then broaden before handoff.

## Accessibility

- All row actions must be keyboard reachable.
- Icon-only buttons need `aria-label`.
- Menus/popovers must close on Escape and outside click.
- Drawers should trap focus and return focus to the triggering row.
- Color cannot be the only severity indicator; use labels/chips.
- Text must truncate intentionally and never overlap.

## Performance

- Keep Today query stale time short but avoid aggressive refetch loops.
- Use existing React Query caching.
- Avoid pulling full issue/desk/team payloads into every row when IDs and summaries are enough.
- Keep row IDs stable to prevent unnecessary re-renders.
- Memoize view-model transforms.

## Rollout Strategy

Recommended order:

1. Preserve the current Today visual design while splitting components.
2. Add exact targets and better click-through behavior.
3. Add the server read model.
4. Add two or three high-confidence inline actions.
5. Add standup drawer.
6. Add polish, badges, and motion.

This avoids the biggest risk: redesigning the whole page and losing the clarity that already exists.

## Success Criteria

Today V2 is successful when:

- A manager can identify the first action in under 5 seconds.
- At least 70% of visible rows point to exact entities, not broad pages.
- The top 3 common actions can be completed without leaving Today.
- The page still feels calm with 0, 5, 10, or 20 underlying signals.
- The first viewport remains readable and uncluttered.
- No section needs long instructional copy to be understood.
- Existing Team, Work, Desk, Follow-ups, and Meetings workflows remain the source of truth for deeper work.

## Open Product Decisions

- Should Today have a dedicated `/api/today/actions` command endpoint, or should all writes stay on existing domain endpoints?
- Should follow-up snooze support only preset times at first, or include custom datetime in v1?
- Should Standup Mode be a drawer, right rail mode, or full-screen focused flow?
- Should row completion have undo immediately, or rely on existing full-page recovery first?
- How many nav badges are useful before the header feels noisy?

Recommended defaults:

- Use existing domain endpoints first.
- Preset snooze first; custom later.
- Drawer for Standup Mode.
- No undo in the first pass unless implementation is straightforward.
- Header badges only for sync issue, due follow-ups, and team attention.

