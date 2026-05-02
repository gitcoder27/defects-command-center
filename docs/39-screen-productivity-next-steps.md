# Screen Productivity Next Steps

Concise review of the current LeadOS screens with the two highest-value next improvements per surface. The theme across the app: move from "capture and inspect" toward "guide the user's day, protect commitments, and make the next action obvious."

## Home / Today

1. Add a time-aware day rhythm: standup, mid-day check, end-of-day wrap, due follow-ups, meeting commitments, and stale team signals.
   - Start in `client/src/components/today/TodayPage.tsx` and `client/src/lib/manager-attention.ts`.
2. Make attention rows open concrete next actions, not only broad destinations.
   - Carry issue key, developer id, desk item id, and labels like "Assign owner", "Ask for check-in", or "Close follow-up".

## Inbox / Alerts

1. Make Alerts global for managers, not only visible on Work.
   - Start in `client/src/components/layout/Header.tsx` and route handling in `client/src/App.tsx`.
2. Turn alerts into action cards with severity grouping, snooze, open issue, assign, and capture follow-up actions.
   - Start in `client/src/components/alerts/AlertInbox.tsx` and `AlertList.tsx`.

## Work / Defect Dashboard

1. Add a guided review queue above or inside the table.
   - Rank by overdue, blocked, due today, unassigned, stale, high priority, and missing tracker assignment.
2. Fix filter trust: clear-all should also clear hidden/persisted status exclusions.
   - Start in `client/src/components/table/DefectTable.tsx`.

## Team Tracker

1. Add a first-class Attention lens.
   - Existing `attentionQueue`, `AttentionQueue`, and `AttentionCard` are present but not exposed as a top-level lens.
2. Wire the carry-forward planning flow into the page.
   - Existing carry-forward hooks/dialogs can support "Plan tomorrow" and "Carry unfinished work".

## My Day

1. Add a guided "Now / Next / Update" strip.
   - Use current task, planned queue, stale status, check-ins, and read-only state to coach the developer through the day.
2. Make Quick Updates structured.
   - Add chips/templates for blocked, waiting, on track, done for today, "what changed?", "what's next?", and "need manager help?".

## Day Planner / Manager Desk

1. Wire the existing carry-forward prompt/dialog into Manager Desk.
   - This makes unfinished manager work reappear as an explicit choice instead of relying on memory.
2. Add an agenda lane based on `plannedStartAt` and `followUpAt`.
   - Managers need "what happens next at what time", not only status buckets.

## Follow-ups

1. Add row-level snooze/reschedule actions: later today, tomorrow, next week, and custom date.
2. Open the exact Desk item from a follow-up row instead of only navigating to Desk.

## Meetings

1. Add an "End meeting / capture outcome" flow with outcome, decision, and optional next action.
2. Let meeting next actions become follow-ups in one click.

## Global Navigation / Capture

1. Make Capture context-aware.
   - Default to Desk on Desk, Team on Team, and issue-linked capture when an issue is active in Work/Triage.
2. Add workflow signals to nav items.
   - Show small badges for alert count, sync error, team gaps, pending follow-ups, and setup needs.

## Settings

1. Add section-level dirty and attention states.
   - Avoid surprise saves across unrelated settings sections.
2. Turn Settings into a guided readiness checklist.
   - Connection health, sync scope, team roster, developer access, and maintenance should each show complete/needs action/stale.

## Setup / Login

1. Fix Setup Wizard "Skip for now" so it does not run the same sync path as "Finish & Sync".
2. Improve login recovery with role-switch links and role-specific help.
   - Help users recover from landing on the wrong manager/developer login path.

## Suggested Build Order

1. Fix trust issues first: Work clear filters, Setup skip behavior, global Alerts visibility.
2. Wire already-built workflows next: Team carry-forward, Manager Desk carry-forward, Team Attention lens.
3. Add guidance layers: Today day rhythm, My Day coaching strip, follow-up snooze, meeting outcomes.
4. Polish the operating system feel: context-aware Capture, nav workflow badges, Settings readiness checklist.
