# Frontend Gap Handoff

Date: 2026-03-05
Project: Defect Management Command Dashboard
Scope: Frontend completeness gaps vs requirements documents
Primary references: `docs/01-PRD.md`, `docs/03-ux-ui-design.md`, `docs/04-technical-plan.md`

## Purpose
This document translates identified frontend gaps into implementation-ready tasks for a frontend developer. Each gap includes:
- Requirement reference
- Current implementation evidence
- Required behavior
- Implementation notes
- Acceptance criteria

## Priority Legend
- P1: Must fix for Phase 1 completeness
- P2: Important quality/usability gap
- P3: Planned pending item (Phase 2) or lower-risk enhancement

## Gap 1: Overview card filtering mismatch (New, In Progress)
Priority: P1

Requirement:
- Cards are clickable and filter the table to that subset (`docs/01-PRD.md:159`).

Current behavior (evidence):
- `New` and `In Progress` cards are configured with `filter: 'all'` (`client/src/lib/constants.ts:36`, `client/src/lib/constants.ts:41`).
- Clicking either card does not apply a subset filter.

Required behavior:
- Clicking `New` should filter table to "new defects" subset.
- Clicking `In Progress` should filter table to "in-progress defects" subset.

Implementation notes:
- Extend frontend `FilterType` to support `new` and `inProgress` if backend supports these filters.
- If backend does not support these query filters yet, add temporary client-side filter fallback in `DefectTable` after data fetch.
- Update `CARD_CONFIGS` in `client/src/lib/constants.ts` to map these cards to real filter keys.
- Ensure visual active state works for these filters.

Acceptance criteria:
- Clicking `New` updates active filter and visible rows are only new items.
- Clicking `In Progress` updates active filter and visible rows are only in-progress items.
- Filter survives refresh/re-fetch state.
- Add tests covering card-to-filter behavior.

## Gap 2: Jira links not wired (table ID + triage external link)
Priority: P1

Requirement:
- Issue ID should be linked to Jira (`docs/01-PRD.md:172`).
- Triage panel must support "Open in Jira" external link (`docs/01-PRD.md:214`).

Current behavior (evidence):
- Triage link uses placeholder `href="#"` (`client/src/components/triage/TriagePanel.tsx:96`).
- Table ID cell is styled text only, not a real link (`client/src/components/table/DefectTable.tsx:112`).

Required behavior:
- Issue ID in table opens Jira issue in new tab.
- Triage "Open in Jira" opens same Jira issue in new tab.

Implementation notes:
- Use `jiraBaseUrl` from config (`useConfig`) plus issue key to build URL: `{jiraBaseUrl}/browse/{jiraKey}`.
- Ensure safe fallback when config is unavailable (disable link or show tooltip).
- Add `rel="noopener noreferrer"` and `target="_blank"`.

Acceptance criteria:
- Both entry points open correct Jira issue URL.
- No placeholder links remain.
- Unit tests validate generated href from mock config and issue key.

## Gap 3: Incorrect sidebar counts for dueThisWeek, stale, highPriority
Priority: P1

Requirement:
- Smart filter chips should show meaningful matching counts for each predefined filter (`docs/01-PRD.md:297` to `docs/01-PRD.md:307`).

Current behavior (evidence):
- `FILTER_COUNT_MAP` only maps unassigned/dueToday/overdue/blocked.
- Missing filters fall back to `overview.total` (`client/src/components/filters/FilterSidebar.tsx:37`).

Required behavior:
- Display real counts for `dueThisWeek`, `stale`, `highPriority`.

Implementation notes:
- Preferred: backend `/overview` should return these counts; update `OverviewCounts` and hook usage.
- Alternative: derive counts client-side from issues list if backend change is deferred.
- Remove fallback-to-total for unsupported keys.

Acceptance criteria:
- Each predefined filter count matches table results for same filter.
- Counts update correctly on data refresh.
- Add tests for count rendering of all filter keys.

## Gap 4: Triage description markdown + labels missing
Priority: P2

Requirement:
- Full description rendered as markdown (`docs/01-PRD.md:197`).
- Labels displayed in triage context (`docs/01-PRD.md:206`).

Current behavior (evidence):
- Description is rendered as plain text paragraph (`client/src/components/triage/TriagePanel.tsx:242`).
- `IssueDetails` omits labels (`client/src/components/triage/IssueDetails.tsx:6`).

Required behavior:
- Render Jira description with markdown formatting.
- Show labels list/chips in triage details.

Implementation notes:
- Add markdown renderer (e.g., `react-markdown`) with safe defaults (no unsafe HTML).
- Add labels row in `IssueDetails` or dedicated section in `TriagePanel`.
- Handle empty description/labels gracefully.

Acceptance criteria:
- Markdown features (headings, lists, inline code, links) render correctly.
- Labels visible when present, hidden or empty state when absent.
- Tests for markdown rendering and labels display.

## Gap 5: Missing stale row highlight in defect table
Priority: P2

Requirement:
- Row highlights include stale state (`docs/01-PRD.md:186`).

Current behavior (evidence):
- Row left-border logic covers selected/focused/overdue/dueToday/flagged only (`client/src/components/table/DefectTable.tsx:293` to `client/src/components/table/DefectTable.tsx:298`).

Required behavior:
- Stale rows (no update >48h and not done) show stale visual state (grey/yellow style per product decision).

Implementation notes:
- Add `isStale` helper in `client/src/lib/utils.ts`.
- Incorporate stale condition in row styling precedence.
- Ensure stale does not override selected/focused state.

Acceptance criteria:
- A stale row is visually distinguishable per design.
- Highlight precedence is deterministic and documented.
- Unit test for stale visual class/style application.

## Gap 6: Default table sort incomplete vs PRD
Priority: P2

Requirement:
- Default sort: Priority desc, Due Date asc, Created desc (`docs/01-PRD.md:183`).

Current behavior (evidence):
- Initial sorting state has only priority + due date (`client/src/components/table/DefectTable.tsx:55`).

Required behavior:
- Add created-date tie-breaker and align direction exactly to requirement (confirm priority direction mapping).

Implementation notes:
- Add `createdAt` sort key in default `SortingState` and sortable column behavior.
- Verify priority comparator direction with `PRIORITY_ORDER` aligns to intended severity ordering.

Acceptance criteria:
- Table initial order matches PRD order in deterministic fixture data.
- Sorting test validates tie-breaker behavior.

## Gap 7: Responsive behavior gaps (workload and panel sizing)
Priority: P2

Requirement:
- Responsive adaptations at breakpoints (`docs/03-ux-ui-design.md`, responsive behavior section).

Current behavior (evidence):
- Workload grid remains fixed `grid-cols-5` (`client/src/components/workload/WorkloadBar.tsx:48`).
- Triage panel fixed width `400px` (`client/src/components/triage/TriagePanel.tsx:82`).

Required behavior:
- Workload panel/cards stack or adapt on narrow widths.
- Triage panel should fit smaller screens (e.g., full-width sheet on mobile).

Implementation notes:
- Add responsive Tailwind classes for workload grid (`grid-cols-1/2/3/5` by breakpoint).
- Use responsive width for triage panel (`w-full max-w-[400px]` in overlay mode).
- Validate interactions at <1024 and <768 manually.

Acceptance criteria:
- No horizontal clipping on common laptop/tablet widths.
- Panel remains usable on narrow screens.
- Responsive tests or visual snapshots added.

## Gap 8: Setup wizard missing team-member selection flow
Priority: P2

Requirement:
- Setup should discover assignable users and allow lead to select team members (`docs/04-technical-plan.md:374`, `docs/04-technical-plan.md:387`).

Current behavior (evidence):
- Wizard only captures Jira URL/email/token/project key (`client/src/components/setup/SetupWizard.tsx:90` to `client/src/components/setup/SetupWizard.tsx:104`).

Required behavior:
- Include developer discovery and selection step before completion.

Implementation notes:
- Add post-connection step to fetch assignable users.
- UI: searchable list with multi-select and selected summary.
- Save selected developers via config/team endpoint.

Acceptance criteria:
- Lead can select developers during setup and finish configuration.
- Selected developers appear in workload/sidebar after setup.
- Tests for selection and save flow.

## Gap 9: Developer Daily View standalone page (Phase 2)
Priority: P3 (planned pending)

Requirement:
- Developer Daily View is Phase 2 (`docs/01-PRD.md:401`, `docs/01-PRD.md:407`).

Current behavior:
- No standalone Developer Daily View page/component exists in `client/src/components/`.

Decision:
- Not a Phase 1 miss if roadmap remains unchanged.

Recommendation:
- Track as explicit Phase 2 backlog item with scope definition and acceptance criteria.

## Test Gaps (cross-cutting)
Priority: P1 for critical paths, P2 for UX gaps

Current test status:
- Existing tests pass (14 tests across 5 files), but they do not cover many of the above behaviors.

Add/extend tests for:
- Overview card subset filtering for `new` and `inProgress`.
- Jira link construction and navigation props.
- Filter count correctness for all filter chips.
- Markdown rendering and labels in triage.
- Stale row visual state.
- Default sort tie-breaker by created date.
- Responsive behavior sanity checks where feasible.

## Suggested Implementation Order
1. P1: Gap 1 (card filters), Gap 2 (Jira links), Gap 3 (filter counts), critical test additions.
2. P2: Gap 4 (markdown + labels), Gap 5 (stale row style), Gap 6 (sorting), Gap 7 (responsive), Gap 8 (setup team selection).
3. P3: Gap 9 as Phase 2 backlog item.

## Definition of Done for This Handoff
- All P1 and P2 items are implemented and merged.
- Frontend tests updated to cover new behavior.
- Manual verification completed for desktop and mobile breakpoints.
- Requirement traceability updated in PR/notes with references to the docs and file-level evidence.
