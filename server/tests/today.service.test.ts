import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { db, resetDatabase } from "./helpers/db";
import { developers, issues, teamTrackerDays } from "../src/db/schema";
import { IssueService } from "../src/services/issue.service";
import { ManagerDeskService } from "../src/services/manager-desk.service";
import { TeamTrackerService } from "../src/services/team-tracker.service";
import { TodayService } from "../src/services/today.service";

const trackerService = new TeamTrackerService();
const managerDeskService = new ManagerDeskService(trackerService);
const issueService = new IssueService(undefined, undefined, trackerService);

function todayService(syncStatus = { status: "idle" as const }) {
  return new TodayService(issueService, trackerService, managerDeskService, {
    getLastSyncLog: async () => ({
      completedAt: "2026-03-08T08:00:00.000Z",
      status: "success",
      issuesSynced: 3,
      errorMessage: null,
    }),
    getRuntimeStatus: () => syncStatus,
  });
}

async function seedDeveloper(accountId = "dev-1", displayName = "Alice Smith") {
  await db.insert(developers).values({
    accountId,
    displayName,
    email: `${accountId}@example.com`,
    avatarUrl: null,
    isActive: 1,
  });
}

async function seedIssue(jiraKey: string, overrides: Partial<typeof issues.$inferInsert> = {}) {
  await db.insert(issues).values({
    jiraKey,
    summary: "Checkout regression",
    priorityName: "High",
    priorityId: "1",
    statusName: "In Progress",
    statusCategory: "indeterminate",
    assigneeId: "dev-1",
    assigneeName: "Alice Smith",
    teamScopeState: "in_team",
    syncScopeState: "active",
    reporterName: null,
    component: null,
    labels: JSON.stringify([]),
    dueDate: "2026-03-07",
    developmentDueDate: null,
    flagged: 0,
    createdAt: "2026-03-06T08:00:00.000Z",
    updatedAt: "2026-03-06T08:00:00.000Z",
    syncedAt: "2026-03-06T08:00:00.000Z",
    lastSeenInScopedSyncAt: "2026-03-06T08:00:00.000Z",
    lastReconciledAt: "2026-03-06T08:00:00.000Z",
    scopeChangedAt: null,
    analysisNotes: null,
    excluded: 0,
    aspenSeverity: null,
    ...overrides,
  });
}

describe("TodayService", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-08T08:30:00.000Z"));
    await resetDatabase();
    await seedDeveloper();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("builds exact ranked action targets across people, work, and manager memory", async () => {
    await trackerService.updateDay("dev-1", "2026-03-08", { status: "blocked" });
    await seedIssue("AM-1", { dueDate: "2026-03-07" });
    await seedIssue("AM-2", {
      summary: "Needs owner",
      assigneeId: null,
      assigneeName: null,
      dueDate: "2026-03-08",
    });
    const followUp = await managerDeskService.createItem("manager-1", {
      date: "2026-03-08",
      title: "Follow up with QA",
      kind: "action",
      category: "follow_up",
      status: "planned",
      followUpAt: "2026-03-07T10:00:00.000Z",
    });
    const meeting = await managerDeskService.createItem("manager-1", {
      date: "2026-03-08",
      title: "Migration review",
      kind: "meeting",
      category: "planning",
      status: "planned",
    });

    const response = await todayService().getToday("manager-1", "2026-03-08");

    expect(response.summary).toHaveLength(6);
    expect(response.currentPriority?.target.developerAccountId).toBe("dev-1");
    expect(response.actionItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "today-dev-dev-1-blocked",
          type: "stale_check_in",
          target: expect.objectContaining({ type: "developer", developerAccountId: "dev-1" }),
          primaryAction: expect.objectContaining({ kind: "add_check_in" }),
        }),
        expect.objectContaining({
          id: "today-issue-AM-1",
          target: expect.objectContaining({ type: "issue", issueKey: "AM-1" }),
        }),
        expect.objectContaining({
          id: `today-follow-up-${followUp.id}`,
          target: expect.objectContaining({ type: "follow_up", managerDeskItemId: followUp.id }),
          secondaryActions: expect.arrayContaining([expect.objectContaining({ kind: "snooze" })]),
        }),
        expect.objectContaining({
          id: `today-meeting-${meeting.id}`,
          primaryAction: expect.objectContaining({ kind: "capture_meeting_outcome" }),
        }),
      ]),
    );
  });

  it("adds sync attention without mutating source data", async () => {
    const response = await todayService({ status: "error", errorMessage: "Token expired" }).getToday("manager-1", "2026-03-08");

    expect(response.actionItems[0]).toMatchObject({
      id: "today-sync-error",
      severity: "critical",
      target: { type: "view", view: "settings" },
    });
    expect(response.syncStatus).toMatchObject({ status: "error", errorMessage: "Token expired" });
  });

  it("uses set current instead of check-in when a developer has planned work but no current item", async () => {
    const planned = await trackerService.addItem("dev-1", "2026-03-08", {
      title: "BE modernization",
    });

    const response = await todayService().getToday("manager-1", "2026-03-08");
    const developerAction = response.actionItems.find((item) => item.target.developerAccountId === "dev-1");
    const pulseItem = response.teamPulse.find((item) => item.accountId === "dev-1");

    expect(developerAction).toMatchObject({
      title: "Alice Smith",
      actionPreview: "BE modernization",
      primaryAction: {
        kind: "set_current_work",
        label: "Set current",
        target: expect.objectContaining({
          type: "tracker_item",
          trackerItemId: planned.id,
        }),
      },
    });
    expect(pulseItem?.primaryAction).toMatchObject({
      kind: "set_current_work",
      label: "Set current",
      target: expect.objectContaining({ trackerItemId: planned.id }),
    });
    expect(pulseItem?.actionPreview).toBe("BE modernization");
  });

  it("does not turn Later desk items into Today carry-forward actions", async () => {
    const planned = await managerDeskService.createItem("manager-1", {
      date: "2026-03-07",
      title: "Carry the planned task",
      kind: "action",
      category: "planning",
      status: "planned",
    });
    const later = await managerDeskService.createItem("manager-1", {
      date: "2026-03-07",
      title: "Parked later task",
      kind: "action",
      category: "planning",
      status: "backlog",
    });

    const response = await todayService().getToday("manager-1", "2026-03-08");

    expect(response.actionItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: `today-desk-carry-${planned.id}`,
          title: "Carry the planned task",
          type: "desk_carry_forward",
        }),
      ])
    );
    expect(response.actionItems).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: `today-desk-carry-${later.id}`,
        }),
      ])
    );
  });

  it("stops asking for another check-in once a no-current developer has a same-day check-in", async () => {
    const before = await todayService().getToday("manager-1", "2026-03-08");
    const beforeDeveloperAction = before.actionItems.find((item) => item.target.developerAccountId === "dev-1");

    expect(beforeDeveloperAction).toMatchObject({
      title: "Alice Smith",
      context: "No current work",
      primaryAction: expect.objectContaining({ kind: "add_check_in", label: "Add check-in" }),
    });
    expect(before.teamPulse.find((item) => item.accountId === "dev-1")?.primaryAction).toMatchObject({
      kind: "add_check_in",
    });

    await trackerService.addCheckIn("dev-1", "2026-03-08", {
      summary: "Asked about next work",
    });

    const after = await todayService().getToday("manager-1", "2026-03-08");
    const afterDeveloperAction = after.actionItems.find((item) => item.target.developerAccountId === "dev-1");

    expect(afterDeveloperAction).toMatchObject({
      title: "Alice Smith",
      context: "No current work",
      primaryAction: expect.objectContaining({ kind: "open", label: "Open developer" }),
    });
    expect(after.teamPulse.find((item) => item.accountId === "dev-1")?.primaryAction).toMatchObject({
      kind: "open",
      label: "Open",
    });
    expect(after.standupPrompts.find((item) => item.id === "standup-dev-dev-1")?.primaryAction).toMatchObject({
      kind: "open",
      label: "Open developer",
    });
  });

  it("uses exact day check-ins as the source of truth when lastCheckInAt is missing", async () => {
    await trackerService.addCheckIn("dev-1", "2026-03-08", {
      summary: "Asked about next work",
    });
    await db
      .update(teamTrackerDays)
      .set({ lastCheckInAt: null })
      .where(and(eq(teamTrackerDays.date, "2026-03-08"), eq(teamTrackerDays.developerAccountId, "dev-1")));

    const response = await todayService().getToday("manager-1", "2026-03-08");
    const developerAction = response.actionItems.find((item) => item.target.developerAccountId === "dev-1");

    expect(developerAction).toMatchObject({
      title: "Alice Smith",
      context: "No current work",
      primaryAction: expect.objectContaining({ kind: "open", label: "Open developer" }),
    });
  });
});
