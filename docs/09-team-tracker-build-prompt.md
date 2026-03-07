# Build Prompt

Use this prompt in a new Codex session to start implementation directly.

```text
You are working in the `defects-command-center` repository.

Read these first:
- AGENTS.md
- docs/07-team-tracker-prd.md
- docs/08-team-tracker-implementation-plan.md

Then inspect the existing app structure, especially:
- client/src/App.tsx
- client/src/components/layout/Header.tsx
- client/src/components/layout/DashboardLayout.tsx
- client/src/components/workload/WorkloadBar.tsx
- server/src/db/schema.ts
- server/src/db/migrate.ts
- server/src/app.ts
- server/src/routes/team.ts
- shared/types.ts

Task:
Implement the Team Tracker feature described in the docs. This is not a brainstorm task. Make the code changes end-to-end in this repo.

Requirements:
- Add a dedicated top-level `Team Tracker` view in the app.
- Keep the existing workload bar/dashboard intact.
- Persist tracker data in local SQLite using new schema tables and migrations.
- Add backend routes, validation, and service logic for tracker days, items, and check-ins.
- Add shared types for tracker data.
- Build the frontend page, summary strip, developer cards, and detail drawer.
- Support both Jira-linked items and custom items.
- Enforce only one `in_progress` item per developer/day.
- Highlight blocked, at-risk, waiting, done-for-today, and stale follow-up states.
- Keep the visual design aligned with the existing command-center style.
- Add or update tests for the new behavior.

Implementation guidance:
- Prefer a lightweight app-state view switch over introducing a full router unless you find a strong reason not to.
- Reuse existing team/developer and issue data where practical.
- Use the frontend-design skill for the new Team Tracker UI because this is a significant dashboard page.
- Make reasonable decisions and continue; do not stop for minor ambiguities.

Deliverables:
- Code changes
- Tests
- Brief summary of what was implemented
- Any follow-up gaps that should be handled next
```
