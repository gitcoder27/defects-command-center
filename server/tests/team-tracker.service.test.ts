import { describe, expect, it, beforeEach } from "vitest";
import { TeamTrackerService } from "../src/services/team-tracker.service";
import { resetDatabase, db } from "./helpers/db";
import { developers, issues, teamTrackerDays } from "../src/db/schema";

const service = new TeamTrackerService();

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
    await resetDatabase();
    await seedDevelopers();
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

    it("groups items into current/planned/completed/dropped", async () => {
      const item1 = await service.addItem("dev-1", "2026-03-07", {
        itemType: "custom",
        title: "Task A",
      });
      await service.addItem("dev-1", "2026-03-07", {
        itemType: "custom",
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
  });

  describe("addItem", () => {
    it("creates a planned item with correct position", async () => {
      await seedIssue();

      const item1 = await service.addItem("dev-1", "2026-03-07", {
        itemType: "custom",
        title: "First",
      });
      const item2 = await service.addItem("dev-1", "2026-03-07", {
        itemType: "jira",
        jiraKey: "AM-123",
        title: "Second",
      });
      expect(item1.position).toBe(0);
      expect(item2.position).toBe(1);
      expect(item2.itemType).toBe("jira");
      expect(item2.jiraKey).toBe("AM-123");
      expect(item2.state).toBe("planned");
    });

    it("hydrates Jira-linked items with priority and effective due date context", async () => {
      await seedIssue();

      const item = await service.addItem("dev-1", "2026-03-07", {
        itemType: "jira",
        jiraKey: "AM-123",
        title: "Linked Jira task",
      });

      expect(item.jiraPriorityName).toBe("High");
      expect(item.jiraDueDate).toBe("2026-03-08");
    });

    it("rejects Jira-linked items whose key is not present in synced issues", async () => {
      await expect(
        service.addItem("dev-1", "2026-03-07", {
          itemType: "jira",
          jiraKey: "AM-999",
          title: "Missing Jira task",
        })
      ).rejects.toThrow("Jira issue AM-999 is not available in synced issues");
    });

    it("rejects duplicate Jira-linked planned items for the same date", async () => {
      await seedIssue();

      await service.addItem("dev-1", "2026-03-07", {
        itemType: "jira",
        jiraKey: "AM-123",
        title: "Linked Jira task",
      });

      await expect(
        service.addItem("dev-1", "2026-03-07", {
          itemType: "jira",
          jiraKey: "AM-123",
          title: "Linked Jira task",
        })
      ).rejects.toThrow(
        "Jira issue AM-123 is already planned for Alice Smith on 2026-03-07"
      );
    });
  });

  describe("setCurrentItem", () => {
    it("enforces single in_progress per day", async () => {
      const item1 = await service.addItem("dev-1", "2026-03-07", {
        itemType: "custom",
        title: "Task A",
      });
      const item2 = await service.addItem("dev-1", "2026-03-07", {
        itemType: "custom",
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
        itemType: "custom",
        title: "Do thing",
      });
      const updated = await service.updateItem(item.id, { state: "done" });
      expect(updated.state).toBe("done");
      expect(updated.completedAt).toBeDefined();
    });

    it("enforces a single current item when state is updated directly to in_progress", async () => {
      const first = await service.addItem("dev-1", "2026-03-07", {
        itemType: "custom",
        title: "First",
      });
      const second = await service.addItem("dev-1", "2026-03-07", {
        itemType: "custom",
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
        itemType: "custom",
        title: "First",
      });
      const second = await service.addItem("dev-1", "2026-03-07", {
        itemType: "custom",
        title: "Second",
      });
      const third = await service.addItem("dev-1", "2026-03-07", {
        itemType: "custom",
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
        itemType: "custom",
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
    });
  });

  describe("carryForward", () => {
    it("previews only items that still need to be carried into the target day", async () => {
      await service.addItem("dev-1", "2026-03-06", {
        itemType: "custom",
        title: "Unfinished task",
      });
      await service.addItem("dev-1", "2026-03-06", {
        itemType: "custom",
        title: "Second unfinished task",
      });

      await service.addItem("dev-1", "2026-03-07", {
        itemType: "custom",
        title: "Unfinished task",
      });

      const carryable = await service.previewCarryForward(
        "2026-03-06",
        "2026-03-07"
      );

      expect(carryable).toBe(1);
    });

    it("carries unfinished items to the next day", async () => {
      await service.addItem("dev-1", "2026-03-06", {
        itemType: "custom",
        title: "Unfinished task",
      });
      const done = await service.addItem("dev-1", "2026-03-06", {
        itemType: "custom",
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

    it("skips items already present on the target day and is safe to retry", async () => {
      await seedIssue();

      await service.addItem("dev-1", "2026-03-06", {
        itemType: "custom",
        title: "Already carried",
      });
      const inProgress = await service.addItem("dev-1", "2026-03-06", {
        itemType: "jira",
        jiraKey: "AM-123",
        title: "Needs follow-up",
      });
      await service.setCurrentItem(inProgress.id);

      await service.addItem("dev-1", "2026-03-07", {
        itemType: "custom",
        title: "Already carried",
      });

      const first = await service.carryForward("2026-03-06", "2026-03-07");
      const second = await service.carryForward("2026-03-06", "2026-03-07");

      expect(first).toBe(1);
      expect(second).toBe(0);

      const board = await service.getBoard("2026-03-07");
      const devDay = board.developers.find(
        (d) => d.developer.accountId === "dev-1"
      )!;
      const plannedTitles = devDay.plannedItems.map((item) => item.title);
      expect(plannedTitles.filter((title) => title === "Already carried")).toHaveLength(1);
      expect(plannedTitles.filter((title) => title === "Needs follow-up")).toHaveLength(1);
    });
  });

  describe("getIssueAssignment", () => {
    it("returns the active assignment for a Jira issue on a given date", async () => {
      await seedIssue();
      const item = await service.addItem("dev-1", "2026-03-07", {
        itemType: "jira",
        jiraKey: "AM-123",
        title: "Linked Jira task",
      });

      const assignment = await service.getIssueAssignment("AM-123", "2026-03-07");

      expect(assignment).toEqual({
        date: "2026-03-07",
        jiraKey: "AM-123",
        itemId: item.id,
        title: "Linked Jira task",
        state: "planned",
        developer: {
          accountId: "dev-1",
          displayName: "Alice Smith",
          email: undefined,
          avatarUrl: undefined,
          isActive: true,
        },
      });
    });

    it("returns done when the tracker item has been completed", async () => {
      await seedIssue();
      const item = await service.addItem("dev-1", "2026-03-07", {
        itemType: "jira",
        jiraKey: "AM-123",
        title: "Linked Jira task",
      });
      await service.updateItem(item.id, { state: "done" });

      const assignment = await service.getIssueAssignment("AM-123", "2026-03-07");

      expect(assignment?.state).toBe("done");
      expect(assignment?.developer.displayName).toBe("Alice Smith");
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
