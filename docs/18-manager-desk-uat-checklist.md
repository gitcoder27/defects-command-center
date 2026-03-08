# Manager Desk UAT Checklist

**Date:** March 8, 2026  
**Purpose:** Final verification checklist after both frontend and backend implementation are complete  
**Related docs:** `docs/15-manager-desk-requirements.md`, `docs/16-manager-desk-frontend-handoff.md`, `docs/17-manager-desk-backend-requirements.md`

---

## 1. Access and Navigation

- Manager can see `Manager Desk` in the main app navigation.
- Clicking `Manager Desk` opens the page successfully.
- Direct URL `/manager-desk` works for a manager session.
- Developer users do not see `Manager Desk` in navigation.
- Developer users cannot access `/manager-desk`.
- Unauthorized access is handled cleanly with redirect or proper error state.

## 2. Initial Page Load

- Manager Desk loads for today by default.
- Selected date is clearly visible.
- Previous day / next day navigation works.
- `Today` action returns to the current date.
- Initial loading state looks correct and does not feel broken.
- Empty-day state is clean and useful when no items exist.

## 3. Summary Strip

- Summary counts are visible.
- Counts update correctly after create/update/delete actions.
- Open items count excludes `done` and `cancelled` items.
- Waiting count is correct.
- Meetings count is correct.
- Completed count is correct.
- Overdue follow-up count is correct.

## 4. Quick Capture

- I can create a new item with only a short title.
- Quick-captured item appears immediately in the correct section.
- Default values are applied correctly:
  - kind
  - category
  - status
  - priority
- Quick capture is fast enough for real office use.
- Keyboard flow feels good if supported.

## 5. Full Item Creation and Editing

- I can open an item detail/edit surface.
- I can edit title.
- I can change kind:
  - `action`
  - `meeting`
  - `decision`
  - `waiting`
- I can change category.
- I can change status.
- I can change priority.
- I can add/edit participants or counterpart text.
- I can add/edit context note.
- I can add/edit next action.
- I can add/edit outcome.
- I can set planned start time.
- I can set planned end time.
- I can set follow-up date/time.
- Changes save correctly and persist after refresh.

## 6. Status Behavior

- Inbox items can be moved to planned.
- Planned items can be moved to in progress.
- Items can be moved to waiting.
- Items can be marked done.
- Items can be marked cancelled.
- Done items show as completed.
- If an item leaves done state, completed behavior is still correct.
- Section placement updates correctly when status changes.

## 7. Meetings Workflow

- I can create a meeting item.
- Meeting item visually feels distinct from a generic task.
- I can add meeting context/agenda/participants.
- I can mark a meeting done after completion.
- Meeting-related follow-up can still be captured.
- Meetings count in summary updates correctly.

## 8. Waiting / Follow-Up Workflow

- I can create a waiting item.
- Waiting items are easy to notice on screen.
- I can set a follow-up date/time.
- Overdue follow-up behavior is visible and correct.
- Waiting items remain open until resolved.
- I can convert a waiting item back to active/planned/done.

## 9. Decision Capture

- I can create a decision item.
- I can store the final decision clearly.
- I can add supporting context.
- Decision item remains visible in historical day view.
- Decision content persists after refresh.

## 10. Linking to Defects and Developers

- I can search and attach a defect to an item.
- Defect search results are relevant and usable.
- Attached defect displays clearly on the item.
- I can search and attach a developer to an item.
- Developer search results are relevant and usable.
- Attached developer displays clearly on the item.
- I can attach an external group label like `Onshore Design Team`.
- I can remove attached links cleanly.
- Links persist after page refresh.

## 11. Inbox and Organization Flow

- Inbox items are clearly separated from organized work.
- I can move inbox items into active planning easily.
- Inbox does not feel cluttered after multiple captures.
- Organized sections still remain easy to scan.

## 12. Completed Items

- Done items appear in completed section.
- Completed items show the right content and timestamps if supported.
- Completed items remain visible for the selected day.
- Completed items do not inflate open-item summary counts.

## 13. Delete Behavior

- I can delete an item created by mistake.
- Deleted item disappears from screen correctly.
- Deleted item does not reappear after refresh.
- Linked references are also cleaned up correctly.

## 14. Carry Forward

- I can carry unfinished items from one day to another.
- Carried items appear on the target day.
- `done` and `cancelled` items are not carried by default.
- Links, notes, category, kind, and priority are preserved after carry forward.
- Carry forward does not create obvious duplicate items accidentally.

## 15. Day-to-Day Continuity

- I can open previous days and review history.
- Historical completed items are still visible.
- Historical decisions are still visible.
- Historical waiting items make sense.
- Switching between dates works reliably.

## 16. Refresh and Persistence

- Refreshing the browser does not lose saved data.
- Newly created items remain after reload.
- Edited fields remain after reload.
- Linked items remain after reload.
- Section assignments remain after reload.

## 17. Error Handling

- Failed saves show a clear error message.
- Page load failure shows a recoverable error state.
- Retry works where expected.
- Invalid inputs are handled cleanly.
- Unauthorized or expired-session behavior is clear.

## 18. Performance and Usability

- Page feels responsive during normal use.
- Frequent small edits do not feel slow.
- Loading indicators are not excessive or confusing.
- Layout works well on laptop screen.
- Layout remains usable on smaller screen widths.
- Visual hierarchy makes today's important items obvious.

## 19. Permission and Privacy

- Developer account cannot view manager desk data.
- Manager desk data does not leak into `My Day`.
- Manager-only content remains private.
- Backend correctly blocks forbidden access.

## 20. Final Confidence Check

- This screen is genuinely useful for my real daily manager workflow.
- I can capture analysis, design, meetings, follow-ups, and decisions in one place.
- I do not feel the need to move back to scattered notes for normal daily management.
- The experience feels polished enough for repeated day-long use.
