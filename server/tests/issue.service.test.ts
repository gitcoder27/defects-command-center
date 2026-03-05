import { beforeEach, describe, expect, it, vi } from "vitest";
import { IssueService } from "../src/services/issue.service";
import { JiraClient } from "../src/jira/client";

vi.mock("../src/config", () => ({
  config: {
    JIRA_DEV_DUE_DATE_FIELD: "customfield_10128",
    JIRA_ASPEN_SEVERITY_FIELD: "customfield_10129",
  },
}));

const mockedIssues = [
  {
    jiraKey: "PROJ-1",
    summary: "Unassigned today",
    description: null,
    aspenSeverity: "2",
    priorityName: "High",
    priorityId: "1",
    statusName: "To Do",
    statusCategory: "new",
    assigneeId: "lead-1",
    assigneeName: "Lead",
    reporterName: "Reporter",
    component: "A",
    labels: JSON.stringify(["customer"]),
    dueDate: "2026-03-05",
    developmentDueDate: null,
    flagged: 0,
    createdAt: "2026-03-05T08:00:00.000Z",
    updatedAt: "2026-03-05T08:00:00.000Z",
    syncedAt: "2026-03-05T08:00:00.000Z",
    teamScopeState: "in_team",
    syncScopeState: "active",
    lastSeenInScopedSyncAt: "2026-03-05T08:00:00.000Z",
    lastReconciledAt: "2026-03-05T08:00:00.000Z",
    scopeChangedAt: null,
    analysisNotes: null,
  },
  {
    jiraKey: "PROJ-2",
    summary: "Overdue blocked",
    description: null,
    aspenSeverity: "1",
    priorityName: "Highest",
    priorityId: "2",
    statusName: "In Progress",
    statusCategory: "indeterminate",
    assigneeId: "dev-1",
    assigneeName: "Dev 1",
    reporterName: "Reporter",
    component: "B",
    labels: JSON.stringify(["production"]),
    dueDate: "2026-03-01",
    developmentDueDate: null,
    flagged: 1,
    createdAt: "2026-03-04T08:00:00.000Z",
    updatedAt: "2026-03-02T08:00:00.000Z",
    syncedAt: "2026-03-05T08:00:00.000Z",
    teamScopeState: "in_team",
    syncScopeState: "active",
    lastSeenInScopedSyncAt: "2026-03-05T08:00:00.000Z",
    lastReconciledAt: "2026-03-05T08:00:00.000Z",
    scopeChangedAt: null,
    analysisNotes: null,
  },
  {
    jiraKey: "PROJ-3",
    summary: "Done issue",
    description: null,
    aspenSeverity: null,
    priorityName: "Low",
    priorityId: "3",
    statusName: "Done",
    statusCategory: "done",
    assigneeId: "dev-2",
    assigneeName: "Dev 2",
    reporterName: "Reporter",
    component: "C",
    labels: JSON.stringify([]),
    dueDate: "2026-03-01",
    developmentDueDate: null,
    flagged: 0,
    createdAt: "2026-03-01T08:00:00.000Z",
    updatedAt: "2026-03-05T08:00:00.000Z",
    syncedAt: "2026-03-05T08:00:00.000Z",
    teamScopeState: "in_team",
    syncScopeState: "active",
    lastSeenInScopedSyncAt: "2026-03-05T08:00:00.000Z",
    lastReconciledAt: "2026-03-05T08:00:00.000Z",
    scopeChangedAt: null,
    analysisNotes: null,
  },
  {
    jiraKey: "PROJ-4",
    summary: "In progress",
    description: null,
    aspenSeverity: "3",
    priorityName: "Medium",
    priorityId: "4",
    statusName: "In Progress",
    statusCategory: "indeterminate",
    assigneeId: "dev-1",
    assigneeName: "Dev 1",
    reporterName: "Reporter",
    component: "B",
    labels: JSON.stringify([]),
    dueDate: "2026-03-07",
    developmentDueDate: null,
    flagged: 0,
    createdAt: "2026-03-03T08:00:00.000Z",
    updatedAt: "2026-03-05T08:00:00.000Z",
    syncedAt: "2026-03-05T08:00:00.000Z",
    teamScopeState: "in_team",
    syncScopeState: "active",
    lastSeenInScopedSyncAt: "2026-03-05T08:00:00.000Z",
    lastReconciledAt: "2026-03-05T08:00:00.000Z",
    scopeChangedAt: null,
    analysisNotes: null,
  },
];

const mockedDevelopers = [
  { accountId: "lead-1", displayName: "Lead", isActive: 1 },
  { accountId: "dev-1", displayName: "Dev 1", isActive: 1 },
  { accountId: "dev-2", displayName: "Dev 2", isActive: 1 },
];

vi.mock("../src/db/connection", () => {
  const db = {
    select: () => ({
      from: (table: any) => {
        // issueTags table (has tagId but no summary)
        if (table?.tagId && !table?.summary) {
          return {
            innerJoin: () => {
              const p: any = Promise.resolve([]);
              p.where = () => Promise.resolve([]);
              return p;
            },
          };
        }
        if (table?.jiraKey) {
          const query: any = Promise.resolve(mockedIssues);
          query.orderBy = async () => mockedIssues;
          query.where = () => ({ limit: async () => mockedIssues });
          query.limit = async () => mockedIssues;
          query.innerJoin = () => async () => [];
          return query;
        }
        if (table?.accountId && table?.displayName) {
          return {
            where: () => Promise.resolve(mockedDevelopers),
            limit: async () => mockedDevelopers,
          };
        }
        if (table?.key) {
          return {
            where: () => ({ limit: async () => [{ key: "jira_lead_account_id", value: "lead-1" }] }),
            limit: async () => [{ key: "jira_lead_account_id", value: "lead-1" }],
          };
        }
        if (table?.startedAt) {
          return {
            orderBy: () => ({ limit: async () => [{ completedAt: "2026-03-05T00:01:00.000Z" }] }),
            where: () => ({ limit: async () => [{ completedAt: "2026-03-05T00:01:00.000Z" }] }),
            limit: async () => [{ completedAt: "2026-03-05T00:01:00.000Z" }],
          };
        }
        return {
          orderBy: () => ({ limit: async () => [{ completedAt: "2026-03-05T00:01:00.000Z" }] }),
          where: () => ({ limit: async () => [{ completedAt: "2026-03-05T00:01:00.000Z" }] }),
          limit: async () => [{ completedAt: "2026-03-05T00:01:00.000Z" }],
        };
      },
    }),
    update: () => ({ set: () => ({ where: async () => undefined }) }),
    insert: () => ({ values: () => ({ onConflictDoUpdate: async () => undefined }) }),
  };
  return { db };
});

describe("IssueService", () => {
  const jiraClient = {
    updateIssue: vi.fn(async () => undefined),
    addComment: vi.fn(async () => undefined),
  } as unknown as JiraClient;

  const service = new IssueService(jiraClient);

  beforeEach(async () => {
    vi.clearAllMocks();
  });

  it("applies all supported filters", async () => {
    expect((await service.getAll({ filter: "unassigned" })).map((i) => i.jiraKey)).toEqual(["PROJ-1"]);
    expect((await service.getAll({ filter: "dueToday" })).map((i) => i.jiraKey)).toContain("PROJ-1");
    expect((await service.getAll({ filter: "dueThisWeek" })).map((i) => i.jiraKey)).toContain("PROJ-4");
    expect((await service.getAll({ filter: "overdue" })).map((i) => i.jiraKey)).toContain("PROJ-2");
    expect((await service.getAll({ filter: "blocked" })).map((i) => i.jiraKey)).toEqual(["PROJ-2"]);
    expect((await service.getAll({ filter: "highPriority" })).map((i) => i.jiraKey)).toEqual(["PROJ-2", "PROJ-1"]);

    const stale = await service.getAll({ filter: "stale" });
    expect(stale.map((i) => i.jiraKey)).toContain("PROJ-2");

    const assigneeFiltered = await service.getAll({ assignee: "dev-1", sort: "created", order: "asc" });
    expect(assigneeFiltered.map((i) => i.jiraKey)).toEqual(["PROJ-4", "PROJ-2"]);

    const statusFiltered = await service.getAll({ status: "Done" });
    expect(statusFiltered).toHaveLength(0);

    const priorityFiltered = await service.getAll({ priority: "Medium" });
    expect(priorityFiltered).toHaveLength(1);
  });

  it("computes overview counts", async () => {
    const overview = await service.getOverviewCounts();
    expect(overview.total).toBe(3);
    expect(overview.unassigned).toBe(1);
    expect(overview.dueToday).toBe(1);
    expect(overview.overdue).toBe(1);
    expect(overview.blocked).toBe(1);
    expect(overview.inProgress).toBe(2);
    expect(overview.lastSynced).toBe("2026-03-05T00:01:00.000Z");
  });

  it("updates issue fields and writes Jira payload", async () => {
    const updated = await service.update("PROJ-2", {
      assigneeId: "dev-9",
      priorityName: "Low",
      dueDate: "2026-03-10",
      flagged: false,
    });

    expect(jiraClient.updateIssue).toHaveBeenCalledWith("PROJ-2", expect.objectContaining({
      assignee: { accountId: "dev-9" },
      priority: { name: "Low" },
      duedate: "2026-03-10",
      customfield_10021: null,
    }));
    expect(updated).toBeDefined();
  });

  it("adds comment through Jira client", async () => {
    await service.addComment("PROJ-1", "Investigating now");
    expect(jiraClient.addComment).toHaveBeenCalledWith("PROJ-1", "Investigating now");
  });
});
