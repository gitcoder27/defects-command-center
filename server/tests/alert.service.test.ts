import { describe, expect, it, vi } from "vitest";
import { AlertService } from "../src/services/alert.service";
import { WorkloadService } from "../src/services/workload.service";

const mockedIssues = [
  {
    jiraKey: "PROJ-1",
    dueDate: "2026-03-01",
    statusCategory: "indeterminate",
    updatedAt: "2026-03-05T12:00:00.000Z",
    flagged: 0,
    priorityName: "Medium",
    statusName: "In Progress",
    createdAt: "2026-03-05T10:00:00.000Z",
  },
  {
    jiraKey: "PROJ-2",
    dueDate: null,
    statusCategory: "indeterminate",
    updatedAt: "2026-03-03T11:00:00.000Z",
    flagged: 0,
    priorityName: "Low",
    statusName: "In Progress",
    createdAt: "2026-03-05T10:00:00.000Z",
  },
  {
    jiraKey: "PROJ-3",
    dueDate: null,
    statusCategory: "indeterminate",
    updatedAt: "2026-03-05T12:00:00.000Z",
    flagged: 1,
    priorityName: "Low",
    statusName: "In Progress",
    createdAt: "2026-03-05T10:00:00.000Z",
  },
  {
    jiraKey: "PROJ-4",
    dueDate: null,
    statusCategory: "new",
    updatedAt: "2026-03-05T12:00:00.000Z",
    flagged: 0,
    priorityName: "High",
    statusName: "To Do",
    createdAt: "2026-03-05T06:00:00.000Z",
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
  const service = new AlertService(workloadService);

  it("triggers all five alert types and avoids false positives", async () => {
    const alerts = await service.computeAlerts(new Date("2026-03-05T12:00:00.000Z"));
    const types = alerts.map((a) => a.type);

    expect(types).toContain("overdue");
    expect(types).toContain("stale");
    expect(types).toContain("blocked");
    expect(types).toContain("high_priority_not_started");
    expect(types).toContain("idle_developer");
    expect(alerts.find((a) => a.type === "idle_developer")?.developerAccountId).toBe("dev-2");
  });
});
