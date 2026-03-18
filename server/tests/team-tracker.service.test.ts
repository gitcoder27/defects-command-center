import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { eq } from "drizzle-orm";
import { ManagerDeskService } from "../src/services/manager-desk.service";
import { TeamTrackerService } from "../src/services/team-tracker.service";
import { resetDatabase, db } from "./helpers/db";
import {
  developers,
  issues,
  managerDeskItems,
  teamTrackerDays,
} from "../src/db/schema";

const service = new TeamTrackerService();
const managerDeskService = new ManagerDeskService(service);

async function seedDevelopers() {
  await db.insert(developers).values([
    { accountId: "dev-1", displayName: "Alice Smith", email: null, avatarUrl: null, isActive: 1 },
    { accountId: "dev-2", displayName: "Bob Jones", email: null, avatarUrl: null, isActive: 1 },
  ]);
}

async function seedIssue(overrides: Partial<typeof issues.$inferInsert> = {}) {
  await db.insert(issues).values({
    jiraKey: "AM-123",
    summary: "Linked Jira task",
    description: null,
    aspenSeverity: null,
    priorityName: "High",
    priorityId: "1",
    statusName: "In Progress",
    statusCategory: "indeterminate",
    assigneeId: "dev-1",
    assigneeName: "Alice Smith",
    teamScopeState: "in_team",
    syncScopeState: "active",
    reporterName: "Lead",
    component: null,
    labels: JSON.stringify([]),
    dueDate: "2026-03-10",
    developmentDueDate: "2026-03-08",
    flagged: 0,
    createdAt: "2026-03-07T08:00:00.000Z",
    updatedAt: "2026-03-07T08:00:00.000Z",
    syncedAt: "2026-03-07T08:00:00.000Z",
    lastSeenInScopedSyncAt: "2026-03-07T08:00:00.000Z",
    lastReconciledAt: "2026-03-07T08:00:00.000Z",
    scopeChangedAt: null,
    analysisNotes: null,
    excluded: 0,
    ...overrides,
  });
}

describe("TeamTrackerService", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-07T08:00:00.000Z"));
    await resetDatabase();
    await seedDevelopers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("ensureDay", () => {
    it("creates a new day row when none exists", async () => {
      const day = await service.ensureDay("2026-03-07", "dev-1");
      expect(day.id).toBeDefined();
      expect(day.date).toBe("2026-03-07");
      expect(day.developerAccountId).toBe("dev-1");
      expect(day.status).toBe("on_track");
    });

    it("returns existing day on subsequent calls", async () => {
      const first = await service.ensureDay("2026-03-07", "dev-1");
      const second = await service.ensureDay("2026-03-07", "dev-1");
      expect(first.id).toBe(second.id);
    });

    it("returns the same row under concurrent calls", async () => {
      const [first, second] = await Promise.all([
        service.ensureDay("2026-03-07", "dev-1"),
        service.ensureDay("2026-03-07", "dev-1"),
      ]);

      expect(first.id).toBe(second.id);

      const rows = await db.select().from(teamTrackerDays);
      expect(
        rows.filter(
          (row) =>
            row.date === "2026-03-07" && row.developerAccountId === "dev-1"
        )
      ).toHaveLength(1);
    });
  });

  describe("getBoard", () => {
    it("returns one entry per active developer", async () => {
      const board = await service.getBoard("2026-03-07");
      expect(board.developers).toHaveLength(2);
      expect(board.date).toBe("2026-03-07");
      expect(board.summary.total).toBe(2);
    });

    it("moves inactive developers into the restore tray for the selected date", async () => {
      await service.updateAvailability("dev-2", {
        effectiveDate: "2026-03-07",
        state: "inactive",
        note: "PTO today",
      });

      const board = await service.getBoard("2026-03-07");

      expect(board.developers.map((day) => day.developer.accountId)).toEqual(["dev-1"]);
      expect(board.inactiveDevelopers).toEqual([
        expect.objectContaining({
          developer: expect.objectContaining({ accountId: "dev-2" }),
          availability: expect.objectContaining({
            state: "inactive",
            note: "PTO today",
            startDate: "2026-03-07",
          }),
        }),
      ]);
      expect(board.summary.total).toBe(1);
    });

    it("groups items into current/planned/completed/dropped", async () => {
      const item1 = await service.addItem("dev-1", "2026-03-07", {
        title: "Task A",
      });
      await service.addItem("dev-1", "2026-03-07", {
        title: "Task B",
      });
      await service.setCurrentItem(item1.id);

      const board = await service.getBoard("2026-03-07");
      const devDay = board.developers.find(
        (d) => d.developer.accountId === "dev-1"
      )!;
      expect(devDay.currentItem?.title).toBe("Task A");
      expect(devDay.plannedItems).toHaveLength(1);
      expect(devDay.plannedItems[0].title).toBe("Task B");
    });

    it("computes smarter freshness and risk signals for the board", async () => {
      await seedIssue({ developmentDueDate: "2026-03-06", dueDate: "2026-03-09" });
      await service.updateDay("dev-1", "2026-03-07", {
        status: "blocked",
        capacityUnits: 1,
      });
      const jiraItem = await service.addItem("dev-1", "2026-03-07", {
        jiraKey: "AM-123",
        title: "Linked Jira task",
      });
      await service.addItem("dev-1", "2026-03-07", {
        title: "Secondary task",
      });
      await service.setCurrentItem(jiraItem.id);
      vi.setSystemTime(new Date("2026-03-07T12:00:00.000Z"));

      const board = await service.getBoard("2026-03-07");
      const devDay = board.developers.find(
        (d) => d.developer.accountId === "dev-1"
      )!;

      expect(devDay.isStale).toBe(true);
      expect(devDay.signals.freshness.staleByTime).toBe(true);
      expect(devDay.signals.freshness.staleWithOpenRisk).toBe(true);
      expect(devDay.signals.freshness.statusChangeWithoutFollowUp).toBe(true);
      expect(devDay.signals.risk.overdueLinkedWork).toBe(true);
      expect(devDay.signals.risk.overdueLinkedCount).toBe(1);
      expect(devDay.signals.risk.overCapacity).toBe(true);
      expect(devDay.signals.risk.capacityDelta).toBe(1);
      expect(board.summary.overdueLinkedWork).toBe(1);
      expect(board.summary.overCapacity).toBe(1);
      expect(board.summary.statusFollowUp).toBe(1);
      expect(board.attentionQueue[0]?.reasons.map((reason) => reason.code)).toEqual([
        "blocked",
        "stale_with_open_risk",
        "overdue_linked_work",
        "status_change_without_follow_up",
        "over_capacity",
      ]);
    });
  });

  describe("addItem", () => {
    it("creates a planned item with correct position", async () => {
      await seedIssue();

      const item1 = await service.addItem("dev-1", "2026-03-07", {
        title: "First",
      });
      const item2 = await service.addItem("dev-1", "2026-03-07", {
        jiraKey: "AM-123",
        title: "Second",
      });
      expect(item1.position).toBe(0);
      expect(item2.position).toBe(1);
      expect(item2.itemType).toBe("jira");
      expect(item2.jiraKey).toBe("AM-123");
      expect(item1.lifecycle).toBe("tracker_only");
      expect(item2.lifecycle).toBe("tracker_only");
      expect(item2.state).toBe("planned");
    });

    it("hydrates Jira-linked items with priority and effective due date context", async () => {
      await seedIssue();

      const item = await service.addItem("dev-1", "2026-03-07", {
        jiraKey: "AM-123",
        title: "Linked Jira task",
      });

      expect(item.jiraPriorityName).toBe("High");
      expect(item.jiraDueDate).toBe("2026-03-08");
      expect(item.jiraSummary).toBe("Linked Jira task");
    });

    it("rejects Jira-linked items whose key is not present in synced issues", async () => {
      await expect(
        service.addItem("dev-1", "2026-03-07", {
          jiraKey: "AM-999",
          title: "Missing Jira task",
        })
      ).rejects.toThrow("Jira issue AM-999 is not available in synced issues");
    });

    it("allows multiple descriptive tasks to link the same Jira issue", async () => {
      await seedIssue();

      await service.addItem("dev-1", "2026-03-07", {
        jiraKey: "AM-123",
        title: "Reproduce the customer report",
      });

      const secondItem = await service.addItem("dev-1", "2026-03-07", {
        jiraKey: "AM-123",
        title: "Patch the validation path",
      });

      expect(secondItem.jiraKey).toBe("AM-123");
      expect(secondItem.title).toBe("Patch the validation path");
    });
  });

  describe("getIssueAssignmentSummaryMap", () => {
    it("summarizes active linked work per Jira issue for the selected day", async () => {
      await seedIssue();
      await service.addItem("dev-1", "2026-03-07", {
        jiraKey: "AM-123",
        title: "Reproduce the report",
      });
      await service.addItem("dev-2", "2026-03-07", {
        jiraKey: "AM-123",
        title: "Patch the validation path",
      });
      await service.addItem("dev-2", "2026-03-07", {
        jiraKey: "AM-123",
        title: "Old investigation",
      });
      const doneItem = await service.addItem("dev-1", "2026-03-07", {
        jiraKey: "AM-123",
        title: "Completed follow-up",
      });
      await service.updateItem(doneItem.id, { state: "done" });

      const summaryMap = await service.getIssueAssignmentSummaryMap("2026-03-07");

      expect(summaryMap.get("AM-123")).toEqual({
        activeCount: 3,
        developerNames: ["Alice Smith", "Bob Jones"],
      });
    });
  });

  describe("setCurrentItem", () => {
    it("enforces single in_progress per day", async () => {
      const item1 = await service.addItem("dev-1", "2026-03-07", {
        title: "Task A",
      });
      const item2 = await service.addItem("dev-1", "2026-03-07", {
        title: "Task B",
      });

      await service.setCurrentItem(item1.id);
      let board = await service.getBoard("2026-03-07");
      let devDay = board.developers.find(
        (d) => d.developer.accountId === "dev-1"
      )!;
      expect(devDay.currentItem?.id).toBe(item1.id);

      // Set item2 as current - should reset item1
      await service.setCurrentItem(item2.id);
      board = await service.getBoard("2026-03-07");
      devDay = board.developers.find(
        (d) => d.developer.accountId === "dev-1"
      )!;
      expect(devDay.currentItem?.id).toBe(item2.id);
      expect(devDay.plannedItems.some((i) => i.id === item1.id)).toBe(true);
    });
  });

  describe("updateItem", () => {
    it("marks item as done with completedAt timestamp", async () => {
      const item = await service.addItem("dev-1", "2026-03-07", {
        title: "Do thing",
      });
      const updated = await service.updateItem(item.id, { state: "done" });
      expect(updated.state).toBe("done");
      expect(updated.completedAt).toBeDefined();
    });

    it("enforces a single current item when state is updated directly to in_progress", async () => {
      const first = await service.addItem("dev-1", "2026-03-07", {
        title: "First",
      });
      const second = await service.addItem("dev-1", "2026-03-07", {
        title: "Second",
      });

      await service.setCurrentItem(first.id);
      await service.updateItem(second.id, { state: "in_progress" });

      const board = await service.getBoard("2026-03-07");
      const devDay = board.developers.find(
        (d) => d.developer.accountId === "dev-1"
      )!;

      expect(devDay.currentItem?.id).toBe(second.id);
      expect(devDay.plannedItems.some((item) => item.id === first.id)).toBe(
        true
      );
    });

    it("reorders items by normalizing sibling positions", async () => {
      const first = await service.addItem("dev-1", "2026-03-07", {
        title: "First",
      });
      const second = await service.addItem("dev-1", "2026-03-07", {
        title: "Second",
      });
      const third = await service.addItem("dev-1", "2026-03-07", {
        title: "Third",
      });

      await service.updateItem(third.id, { position: second.position });

      const board = await service.getBoard("2026-03-07");
      const devDay = board.developers.find(
        (d) => d.developer.accountId === "dev-1"
      )!;

      expect(devDay.plannedItems.map((item) => item.title)).toEqual([
        "First",
        "Third",
        "Second",
      ]);
      expect(devDay.plannedItems.map((item) => item.position)).toEqual([0, 1, 2]);
      expect(first.position).toBe(0);
    });
  });

  describe("deleteItem", () => {
    it("removes item from database", async () => {
      const item = await service.addItem("dev-1", "2026-03-07", {
        title: "To remove",
      });
      await service.deleteItem(item.id);
      const board = await service.getBoard("2026-03-07");
      const devDay = board.developers.find(
        (d) => d.developer.accountId === "dev-1"
      )!;
      const allItems = [
        ...devDay.plannedItems,
        ...devDay.completedItems,
        ...devDay.droppedItems,
      ];
      expect(allItems.find((i) => i.id === item.id)).toBeUndefined();
    });
  });

  describe("addCheckIn", () => {
    it("creates check-in and updates lastCheckInAt", async () => {
      const checkIn = await service.addCheckIn("dev-1", "2026-03-07", {
        summary: "Spoke to Alice - moving forward",
      });
      expect(checkIn.summary).toBe("Spoke to Alice - moving forward");

      const board = await service.getBoard("2026-03-07");
      const devDay = board.developers.find(
        (d) => d.developer.accountId === "dev-1"
      )!;
      expect(devDay.lastCheckInAt).toBeDefined();
      expect(devDay.checkIns).toHaveLength(1);
    });

    it("updates status when provided with check-in", async () => {
      await service.addCheckIn("dev-1", "2026-03-07", {
        summary: "Blocked on dependency",
        status: "blocked",
      });
      const board = await service.getBoard("2026-03-07");
      const devDay = board.developers.find(
        (d) => d.developer.accountId === "dev-1"
      )!;
      expect(devDay.status).toBe("blocked");
      expect(devDay.statusUpdatedAt).toBeDefined();
    });

    it("clears the next follow-up marker when a new check-in is recorded", async () => {
      await service.recordStatusUpdate(
        "dev-1",
        "2026-03-07",
        {
          status: "blocked",
          rationale: "Waiting on platform input",
          nextFollowUpAt: "2026-03-07T10:30:00.000Z",
        },
        {
          type: "manager",
          accountId: "manager-1",
        }
      );

      await service.addCheckIn(
        "dev-1",
        "2026-03-07",
        {
          summary: "Platform replied, resuming work",
          status: "on_track",
        },
        {
          type: "developer",
          accountId: "dev-1",
        }
      );

      const board = await service.getBoard("2026-03-07");
      const devDay = board.developers.find(
        (d) => d.developer.accountId === "dev-1"
      )!;

      expect(devDay.status).toBe("on_track");
      expect(devDay.nextFollowUpAt).toBeUndefined();
    });
  });

  describe("recordStatusUpdate", () => {
    it("requires rationale for blocked and at-risk updates", async () => {
      await expect(
        service.recordStatusUpdate(
          "dev-1",
          "2026-03-07",
          {
            status: "blocked",
          },
          {
            type: "manager",
            accountId: "manager-1",
          }
        )
      ).rejects.toThrow(
        "rationale is required when status is blocked or at_risk"
      );
    });

    it("records a unified status update with rationale and follow-up metadata", async () => {
      const day = await service.recordStatusUpdate(
        "dev-1",
        "2026-03-07",
        {
          status: "blocked",
          rationale: "Waiting on platform review",
          summary: "Escalated in #backend-help",
          nextFollowUpAt: "2026-03-07T10:30:00.000Z",
        },
        {
          type: "manager",
          accountId: "manager-1",
        }
      );

      expect(day.status).toBe("blocked");
      expect(day.lastCheckInAt).toBeDefined();
      expect(day.nextFollowUpAt).toBe("2026-03-07T10:30:00.000Z");
      expect(day.checkIns).toHaveLength(1);
      expect(day.checkIns[0]).toMatchObject({
        summary: "Escalated in #backend-help",
        status: "blocked",
        rationale: "Waiting on platform review",
        nextFollowUpAt: "2026-03-07T10:30:00.000Z",
        authorType: "manager",
        authorAccountId: "manager-1",
      });
      expect(day.signals.freshness.statusChangeWithoutFollowUp).toBe(false);
    });
  });

  describe("updateDay", () => {
    it("updates status and manager notes", async () => {
      await service.updateDay("dev-1", "2026-03-07", {
        status: "at_risk",
        managerNotes: "Needs help with deployment",
      });
      const board = await service.getBoard("2026-03-07");
      const devDay = board.developers.find(
        (d) => d.developer.accountId === "dev-1"
      )!;
      expect(devDay.status).toBe("at_risk");
      expect(devDay.managerNotes).toBe("Needs help with deployment");
      expect(devDay.statusUpdatedAt).toBeDefined();
    });

    it("stores daily capacity when provided", async () => {
      await service.updateDay("dev-1", "2026-03-07", {
        capacityUnits: 5,
      });

      const board = await service.getBoard("2026-03-07");
      const devDay = board.developers.find(
        (d) => d.developer.accountId === "dev-1"
      )!;

      expect(devDay.capacityUnits).toBe(5);
    });
  });

  describe("carryForward", () => {
    it("previews only items that still need to be carried into the target day", async () => {
      await service.addItem("dev-1", "2026-03-06", {
        title: "Unfinished task",
      });
      await service.addItem("dev-1", "2026-03-06", {
        title: "Second unfinished task",
      });

      await service.addItem("dev-1", "2026-03-07", {
        title: "Unfinished task",
      });

      const carryable = await service.previewCarryForward(
        "2026-03-06",
        "2026-03-07"
      );

      expect(carryable).toBe(1);
    });

    it("includes Manager Desk-linked items when previewing carry-forward work", async () => {
      await managerDeskService.createItem("manager-1", {
        date: "2026-03-06",
        title: "Shared task owned by Manager Desk",
        status: "planned",
        assigneeDeveloperAccountId: "dev-1",
      });
      await service.addItem("dev-1", "2026-03-06", {
        title: "Standalone tracker task",
      });

      const carryable = await service.previewCarryForward(
        "2026-03-06",
        "2026-03-07"
      );

      expect(carryable).toBe(2);
    });

    it("carries unfinished items to the next day", async () => {
      await service.addItem("dev-1", "2026-03-06", {
        title: "Unfinished task",
      });
      const done = await service.addItem("dev-1", "2026-03-06", {
        title: "Finished task",
      });
      await service.updateItem(done.id, { state: "done" });

      const carried = await service.carryForward("2026-03-06", "2026-03-07");
      expect(carried).toBe(1);

      const board = await service.getBoard("2026-03-07");
      const devDay = board.developers.find(
        (d) => d.developer.accountId === "dev-1"
      )!;
      expect(devDay.plannedItems.some((i) => i.title === "Unfinished task")).toBe(true);
    });

    it("carries Manager Desk-linked items into the next day by cloning their manager work", async () => {
      const sourceManagerItem = await managerDeskService.createItem("manager-1", {
        date: "2026-03-06",
        title: "Shared task owned by Manager Desk",
        status: "in_progress",
        assigneeDeveloperAccountId: "dev-1",
      });
      await service.addItem("dev-1", "2026-03-06", {
        title: "Standalone tracker task",
      });

      const carried = await service.carryForward("2026-03-06", "2026-03-07", {
        carryManagerDeskItems: (params) =>
          managerDeskService.carryForward("manager-1", params),
      });

      expect(carried).toBe(2);

      const board = await service.getBoard("2026-03-07");
      const devDay = board.developers.find(
        (d) => d.developer.accountId === "dev-1"
      )!;
      expect(devDay.plannedItems.map((item) => item.title)).toEqual([
        "Standalone tracker task",
        "Shared task owned by Manager Desk",
      ]);

      const carriedManagerItems = await db
        .select()
        .from(managerDeskItems)
        .where(eq(managerDeskItems.sourceItemId, sourceManagerItem.id));
      expect(carriedManagerItems).toHaveLength(1);

      const linkedItem = devDay.plannedItems.find(
        (item) => item.title === "Shared task owned by Manager Desk"
      );
      expect(linkedItem?.lifecycle).toBe("manager_desk_linked");
      expect(linkedItem?.managerDeskItemId).toBe(carriedManagerItems[0]!.id);
    });

    it("skips mixed-source items already present on the target day and is safe to retry", async () => {
      await seedIssue();

      await service.addItem("dev-1", "2026-03-06", {
        title: "Already carried",
      });
      await managerDeskService.createItem("manager-1", {
        date: "2026-03-06",
        title: "Shared follow-up",
        status: "planned",
        assigneeDeveloperAccountId: "dev-1",
      });
      const inProgress = await service.addItem("dev-1", "2026-03-06", {
        jiraKey: "AM-123",
        title: "Needs follow-up",
      });
      await service.setCurrentItem(inProgress.id);

      await service.addItem("dev-1", "2026-03-07", {
        title: "Already carried",
      });
      await service.addItem("dev-1", "2026-03-07", {
        title: "Shared follow-up",
      });

      const first = await service.carryForward("2026-03-06", "2026-03-07", {
        carryManagerDeskItems: (params) =>
          managerDeskService.carryForward("manager-1", params),
      });
      const second = await service.carryForward("2026-03-06", "2026-03-07", {
        carryManagerDeskItems: (params) =>
          managerDeskService.carryForward("manager-1", params),
      });

      expect(first).toBe(1);
      expect(second).toBe(0);

      const board = await service.getBoard("2026-03-07");
      const devDay = board.developers.find(
        (d) => d.developer.accountId === "dev-1"
      )!;
      const plannedTitles = devDay.plannedItems.map((item) => item.title);
      expect(plannedTitles.filter((title) => title === "Already carried")).toHaveLength(1);
      expect(plannedTitles.filter((title) => title === "Shared follow-up")).toHaveLength(1);
      expect(plannedTitles.filter((title) => title === "Needs follow-up")).toHaveLength(1);
    });
  });

  describe("getIssueAssignments", () => {
    it("returns the active linked tasks for a Jira issue on a given date", async () => {
      await seedIssue();
      const firstItem = await service.addItem("dev-1", "2026-03-07", {
        jiraKey: "AM-123",
        title: "Reproduce the customer report",
      });
      const secondItem = await service.addItem("dev-1", "2026-03-07", {
        jiraKey: "AM-123",
        title: "Patch the validation path",
      });

      const assignments = await service.getIssueAssignments("AM-123", "2026-03-07");

      expect(assignments).toEqual([
        {
          date: "2026-03-07",
          jiraKey: "AM-123",
          itemId: firstItem.id,
          title: "Reproduce the customer report",
          state: "planned",
          developer: {
            accountId: "dev-1",
            displayName: "Alice Smith",
            email: undefined,
            avatarUrl: undefined,
            isActive: true,
          },
        },
        {
          date: "2026-03-07",
          jiraKey: "AM-123",
          itemId: secondItem.id,
          title: "Patch the validation path",
          state: "planned",
          developer: {
            accountId: "dev-1",
            displayName: "Alice Smith",
            email: undefined,
            avatarUrl: undefined,
            isActive: true,
          },
        },
      ]);
    });

    it("omits completed tasks from the active linked task list", async () => {
      await seedIssue();
      const item = await service.addItem("dev-1", "2026-03-07", {
        jiraKey: "AM-123",
        title: "Linked Jira task",
      });
      await service.updateItem(item.id, { state: "done" });

      const assignments = await service.getIssueAssignments("AM-123", "2026-03-07");

      expect(assignments).toEqual([]);
    });
  });

  describe("stale detection", () => {
    it("marks developer as stale when no check-in", async () => {
      const board = await service.getBoard("2026-03-07");
      const devDay = board.developers.find(
        (d) => d.developer.accountId === "dev-1"
      )!;
      expect(devDay.isStale).toBe(true);
    });

    it("marks developer as not stale after recent check-in", async () => {
      await service.addCheckIn("dev-1", "2026-03-07", {
        summary: "All good",
      });
      const board = await service.getBoard("2026-03-07");
      const devDay = board.developers.find(
        (d) => d.developer.accountId === "dev-1"
      )!;
      expect(devDay.isStale).toBe(false);
    });
  });

  describe("summary computation", () => {
    it("computes correct summary counts", async () => {
      await service.updateDay("dev-1", "2026-03-07", { status: "blocked" });
      await service.updateDay("dev-2", "2026-03-07", { status: "at_risk" });

      const board = await service.getBoard("2026-03-07");
      expect(board.summary.blocked).toBe(1);
      expect(board.summary.atRisk).toBe(1);
      expect(board.summary.noCurrent).toBe(2);
    });
  });
});
