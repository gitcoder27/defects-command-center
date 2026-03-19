import { describe, expect, it, vi } from "vitest";
import { AlertService } from "../src/services/alert.service";
import { WorkloadService } from "../src/services/workload.service";

const mockedIssues = [
  {
    jiraKey: "PROJ-1",
    dueDate: "2026-03-01",
    developmentDueDate: null,
    statusCategory: "indeterminate",
    updatedAt: "2026-03-05T12:00:00.000Z",
    flagged: 0,
    priorityName: "Medium",
    statusName: "In Progress",
    createdAt: "2026-03-05T10:00:00.000Z",
    excluded: 0,
    teamScopeState: "in_team",
    syncScopeState: "active",
  },
  {
    jiraKey: "PROJ-2",
    dueDate: null,
    developmentDueDate: null,
    statusCategory: "indeterminate",
    updatedAt: "2026-03-03T11:00:00.000Z",
    flagged: 0,
    priorityName: "Low",
    statusName: "In Progress",
    createdAt: "2026-03-05T10:00:00.000Z",
    excluded: 0,
    teamScopeState: "in_team",
    syncScopeState: "active",
  },
  {
    jiraKey: "PROJ-3",
    dueDate: null,
    developmentDueDate: null,
    statusCategory: "indeterminate",
    updatedAt: "2026-03-05T12:00:00.000Z",
    flagged: 1,
    priorityName: "Low",
    statusName: "In Progress",
    createdAt: "2026-03-05T10:00:00.000Z",
    excluded: 0,
    teamScopeState: "in_team",
    syncScopeState: "active",
  },
  {
    jiraKey: "PROJ-4",
    dueDate: null,
    developmentDueDate: null,
    statusCategory: "new",
    updatedAt: "2026-03-05T12:00:00.000Z",
    flagged: 0,
    priorityName: "High",
    statusName: "To Do",
    createdAt: "2026-03-05T06:00:00.000Z",
    excluded: 0,
    teamScopeState: "in_team",
    syncScopeState: "active",
  },
  {
    jiraKey: "PROJ-5",
    dueDate: null,
    developmentDueDate: "2026-03-04",
    statusCategory: "indeterminate",
    updatedAt: "2026-03-05T12:00:00.000Z",
    flagged: 0,
    priorityName: "Medium",
    statusName: "In Progress",
    createdAt: "2026-03-05T10:00:00.000Z",
    excluded: 0,
    teamScopeState: "in_team",
    syncScopeState: "active",
  },
  {
    jiraKey: "PROJ-6",
    dueDate: "2026-03-01",
    developmentDueDate: null,
    statusCategory: "indeterminate",
    updatedAt: "2026-03-03T11:00:00.000Z",
    flagged: 1,
    priorityName: "High",
    statusName: "To Do",
    createdAt: "2026-03-05T06:00:00.000Z",
    excluded: 1,
    teamScopeState: "in_team",
    syncScopeState: "active",
  },
  {
    jiraKey: "PROJ-7",
    dueDate: "2026-03-01",
    developmentDueDate: null,
    statusCategory: "indeterminate",
    updatedAt: "2026-03-03T11:00:00.000Z",
    flagged: 1,
    priorityName: "High",
    statusName: "To Do",
    createdAt: "2026-03-05T06:00:00.000Z",
    excluded: 0,
    teamScopeState: "out_of_team",
    syncScopeState: "active",
  },
  {
    jiraKey: "PROJ-8",
    dueDate: "2026-03-01",
    developmentDueDate: null,
    statusCategory: "indeterminate",
    updatedAt: "2026-03-03T11:00:00.000Z",
    flagged: 1,
    priorityName: "High",
    statusName: "To Do",
    createdAt: "2026-03-05T06:00:00.000Z",
    excluded: 0,
    teamScopeState: "in_team",
    syncScopeState: "inaccessible",
  },
];

vi.mock("../src/db/connection", () => ({
  db: {
    select: () => ({
      from: async () => mockedIssues,
    }),
  },
}));

describe("AlertService", () => {
  const workloadService = {
    getIdleDevelopers: vi.fn(async () => [{ accountId: "dev-2", displayName: "Bob", isActive: true }]),
  } as unknown as WorkloadService;
  const settings = {
    getStaleThresholdHours: vi.fn(async () => 48),
  };
  const service = new AlertService(workloadService, settings as any);

  it("triggers all five alert types and avoids false positives", async () => {
    const alerts = await service.computeAlerts(new Date("2026-03-05T12:00:00.000Z"));
    const types = alerts.map((a) => a.type);

    expect(types).toContain("overdue");
    expect(types).toContain("stale");
    expect(types).toContain("blocked");
    expect(types).toContain("high_priority_not_started");
    expect(types).toContain("idle_developer");
    expect(alerts.find((a) => a.type === "idle_developer")?.developerAccountId).toBe("dev-2");
    expect(alerts.find((a) => a.type === "idle_developer")?.message).toBe("Bob has no current or planned work today.");
  });

  it("uses development due date for overdue alerts", async () => {
    const alerts = await service.computeAlerts(new Date("2026-03-05T12:00:00.000Z"));

    expect(alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "overdue", issueKey: "PROJ-5" }),
      ])
    );
  });

  it("uses the configured stale threshold", async () => {
    const relaxedThresholdService = new AlertService(workloadService, {
      getStaleThresholdHours: vi.fn(async () => 72),
    } as any);

    const alerts = await relaxedThresholdService.computeAlerts(new Date("2026-03-05T12:00:00.000Z"));

    expect(alerts.some((alert) => alert.type === "stale" && alert.issueKey === "PROJ-2")).toBe(false);
  });

  it("filters excluded, out-of-team, and sync-inactive issues before creating alerts", async () => {
    const alerts = await service.computeAlerts(new Date("2026-03-05T12:00:00.000Z"));

    expect(alerts.some((alert) => alert.issueKey === "PROJ-6")).toBe(false);
    expect(alerts.some((alert) => alert.issueKey === "PROJ-7")).toBe(false);
    expect(alerts.some((alert) => alert.issueKey === "PROJ-8")).toBe(false);
  });

  it("passes the computed date into idle-developer detection", async () => {
    await service.computeAlerts(new Date("2026-03-05T12:00:00.000Z"));

    expect(workloadService.getIdleDevelopers).toHaveBeenCalledWith("2026-03-05");
  });
});
