import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

const mockedIssueTags = [
  { jiraKey: "PROJ-1", id: 10, name: "ANALYSIS", color: "#6366f1" },
  { jiraKey: "PROJ-1", id: 20, name: "AMAR", color: "#ec4899" },
  { jiraKey: "PROJ-2", id: 10, name: "ANALYSIS", color: "#6366f1" },
  { jiraKey: "PROJ-4", id: 20, name: "AMAR", color: "#ec4899" },
];

vi.mock("../src/db/connection", () => {
  const db = {
    select: () => ({
      from: (table: any) => {
        // issueTags table (has tagId but no summary)
        if (table?.tagId && !table?.summary) {
          return {
            innerJoin: () => {
              const p: any = Promise.resolve(mockedIssueTags);
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

  const settings = {
    getManagerJiraAccountId: vi.fn(async () => "lead-1"),
    getJiraLeadAccountId: vi.fn(async () => "lead-1"),
    getStaleThresholdHours: vi.fn(async () => 48),
    getJiraDevDueDateField: vi.fn(async () => "customfield_10128"),
    createJiraClient: vi.fn(async () => jiraClient),
  };
  const service = new IssueService(jiraClient, settings as any);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-05T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
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
    expect(overview.new).toBe(1);
    expect(overview.unassigned).toBe(1);
    expect(overview.dueToday).toBe(1);
    expect(overview.overdue).toBe(1);
    expect(overview.blocked).toBe(1);
    expect(overview.inProgress).toBe(2);
    expect(overview.lastSynced).toBe("2026-03-05T00:01:00.000Z");
  });

  it("keeps overview counts aligned with the corresponding table filters", async () => {
    const overview = await service.getOverviewCounts();

    expect((await service.getAll({ filter: "all" })).length).toBe(overview.total);
    expect((await service.getAll({ filter: "new" })).length).toBe(overview.new);
    expect((await service.getAll({ filter: "unassigned" })).length).toBe(overview.unassigned);
    expect((await service.getAll({ filter: "dueToday" })).length).toBe(overview.dueToday);
    expect((await service.getAll({ filter: "overdue" })).length).toBe(overview.overdue);
    expect((await service.getAll({ filter: "blocked" })).length).toBe(overview.blocked);
    expect((await service.getAll({ filter: "inProgress" })).length).toBe(overview.inProgress);
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

  it("uses the configured stale threshold for stale filters and overview counts", async () => {
    const strictThresholdSettings = {
      ...settings,
      getStaleThresholdHours: vi.fn(async () => 96),
    };
    const strictService = new IssueService(jiraClient, strictThresholdSettings as any);

    expect(await strictService.getAll({ filter: "stale" })).toHaveLength(0);
    expect((await strictService.getOverviewCounts()).stale).toBe(0);
  });

  it("does not cache the Jira mutation client", async () => {
    const oldClient = {
      updateIssue: vi.fn(async () => undefined),
      addComment: vi.fn(async () => undefined),
    };
    const newClient = {
      updateIssue: vi.fn(async () => undefined),
      addComment: vi.fn(async () => undefined),
    };
    let currentClient = oldClient;
    const dynamicService = new IssueService(async () => currentClient as unknown as JiraClient, settings as any);

    currentClient = newClient;
    await dynamicService.addComment("PROJ-1", "Fresh client");

    expect(oldClient.addComment).not.toHaveBeenCalled();
    expect(newClient.addComment).toHaveBeenCalledWith("PROJ-1", "Fresh client");
  });

  it("filters issues by single tag (AND logic)", async () => {
    const result = await service.getAll({ tagIds: [10] });
    const keys = result.map((i) => i.jiraKey);
    expect(keys).toContain("PROJ-1");
    expect(keys).toContain("PROJ-2");
    expect(keys).not.toContain("PROJ-4");
  });

  it("filters issues by multiple tags with AND logic", async () => {
    // PROJ-1 has both tags 10 and 20, PROJ-2 only has 10, PROJ-4 only has 20
    const result = await service.getAll({ tagIds: [10, 20] });
    const keys = result.map((i) => i.jiraKey);
    expect(keys).toEqual(["PROJ-1"]);
  });

  it("filters untagged issues with noTags", async () => {
    // PROJ-4 has tag 20, so among active team issues: PROJ-1 (tagged), PROJ-2 (tagged), PROJ-4 (tagged)
    // Only issues without any tags should be returned
    const result = await service.getAll({ noTags: true });
    const keys = result.map((i) => i.jiraKey);
    // No active in-team issues without tags exist in this mock
    expect(keys).toHaveLength(0);
  });

  it("combines tag filter with category filter", async () => {
    // blocked + tag 10 = PROJ-2 (blocked and has tag 10)
    const result = await service.getAll({ filter: "blocked", tagIds: [10] });
    const keys = result.map((i) => i.jiraKey);
    expect(keys).toEqual(["PROJ-2"]);
  });

  it("returns tag counts for current filter context", async () => {
    const counts = await service.getTagCounts({});
    expect(counts.counts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tagId: 10 }),
        expect.objectContaining({ tagId: 20 }),
      ])
    );
    expect(counts.untaggedCount).toBe(0);
  });

  it("returns tag counts scoped to a category filter", async () => {
    const counts = await service.getTagCounts({ filter: "blocked" });
    // Only PROJ-2 is blocked, and it has tag 10
    const tag10 = counts.counts.find((c) => c.tagId === 10);
    expect(tag10?.count).toBe(1);
    const tag20 = counts.counts.find((c) => c.tagId === 20);
    expect(tag20).toBeUndefined();
    expect(counts.untaggedCount).toBe(0);
  });
});
