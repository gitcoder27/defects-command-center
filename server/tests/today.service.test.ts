import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db, resetDatabase } from "./helpers/db";
import { developers, issues } from "../src/db/schema";
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
});
