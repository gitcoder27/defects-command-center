import { describe, expect, it, vi } from "vitest";
import { WorkloadService } from "../src/services/workload.service";

const devRows = [
  { accountId: "dev-1", displayName: "Alice", email: null, avatarUrl: null, isActive: 1 },
  { accountId: "dev-2", displayName: "Bob", email: null, avatarUrl: null, isActive: 1 },
  { accountId: "dev-3", displayName: "Carol", email: null, avatarUrl: null, isActive: 1 },
];

const issueRows = [
  { assigneeId: "dev-1", statusCategory: "indeterminate", priorityName: "Highest", dueDate: "2099-01-01", flagged: 0 },
  { assigneeId: "dev-1", statusCategory: "indeterminate", priorityName: "High", dueDate: null, flagged: 1 },
  { assigneeId: "dev-2", statusCategory: "new", priorityName: "Medium", dueDate: null, flagged: 0 },
  { assigneeId: "dev-2", statusCategory: "done", priorityName: "Low", dueDate: null, flagged: 0 },
] as any[];

vi.mock("../src/db/connection", () => ({
  db: {
    select: () => ({
      from: (table: any) => {
        if (table?.accountId) {
          return { where: async () => devRows };
        }
        return issueRows;
      },
    }),
  },
}));

describe("WorkloadService", () => {
  const service = new WorkloadService();

  it("calculates score and threshold levels", async () => {
    expect(service.calculateScore(["Highest", "High", "Medium"])).toBe(9);
    expect(service.getLevel(4.9)).toBe("light");
    expect(service.getLevel(5)).toBe("medium");
    expect(service.getLevel(12)).toBe("heavy");
  });

  it("ranks assignee suggestions by lowest workload", () => {
    const team = [
      { developer: { accountId: "dev-1", displayName: "Alice", isActive: true }, activeDefects: 2, dueToday: 0, blocked: 1, score: 8, level: "medium" as const },
      { developer: { accountId: "dev-2", displayName: "Bob", isActive: true }, activeDefects: 1, dueToday: 0, blocked: 0, score: 1, level: "light" as const },
      { developer: { accountId: "dev-3", displayName: "Carol", isActive: true }, activeDefects: 0, dueToday: 0, blocked: 0, score: 0, level: "light" as const },
    ];
    const suggestions = [...team]
      .sort((a, b) => a.score - b.score)
      .map((entry) => ({ developer: entry.developer, score: entry.score, reason: `Current workload score ${entry.score} (${entry.level})` }));

    expect(suggestions[0]?.developer.accountId).toBe("dev-3");
    expect(suggestions[1]?.developer.accountId).toBe("dev-2");
    expect(suggestions[2]?.developer.accountId).toBe("dev-1");
  });

  it("identifies idle developers from computed team list", () => {
    const team = [
      { developer: { accountId: "dev-1", displayName: "Alice", isActive: true }, activeDefects: 1, dueToday: 0, blocked: 0, score: 3, level: "light" as const },
      { developer: { accountId: "dev-2", displayName: "Bob", isActive: true }, activeDefects: 0, dueToday: 0, blocked: 0, score: 0, level: "light" as const },
    ];
    const idle = team.filter((entry) => entry.activeDefects === 0).map((entry) => entry.developer.accountId);
    expect(idle).toEqual(["dev-2"]);
  });

  it("computes workload from developer and issue datasets", async () => {
    const service = new WorkloadService();
    const team = await service.getTeamWorkload();

    expect(team).toHaveLength(3);
    expect(team.find((entry) => entry.developer.accountId === "dev-1")?.score).toBe(8);
    expect(team.find((entry) => entry.developer.accountId === "dev-2")?.activeDefects).toBe(1);
    expect(team.find((entry) => entry.developer.accountId === "dev-3")?.activeDefects).toBe(0);
  });

  it("returns idle developers and ranked suggestions using service methods", async () => {
    const service = new WorkloadService();
    const idle = await service.getIdleDevelopers();
    expect(idle.map((d) => d.accountId)).toContain("dev-3");

    const ranked = await service.suggestAssignee();
    expect(ranked[0]?.developer.accountId).toBe("dev-3");
    expect(ranked.at(-1)?.developer.accountId).toBe("dev-1");
  });
});
