import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rawDb } from "../src/db/connection";
import { SyncEngine } from "../src/sync/engine";
import { resetDatabase } from "./helpers/db";

describe("SyncEngine", () => {
  beforeEach(async () => {
    await resetDatabase();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-12T09:30:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("schedules syncs using the persisted interval", async () => {
    const settings = {
      getSyncIntervalMs: vi.fn(async () => 120_000),
    };
    const engine = new SyncEngine(settings as any);
    const syncSpy = vi.spyOn(engine, "syncNow").mockResolvedValue({
      status: "success",
      issuesSynced: 0,
      startedAt: "2026-03-07T00:00:00.000Z",
      completedAt: "2026-03-07T00:00:00.000Z",
    });

    await engine.start();
    await vi.advanceTimersByTimeAsync(119_999);
    expect(syncSpy).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(syncSpy).toHaveBeenCalledTimes(1);

    engine.stop();
  });

  it("restores dismissed out-of-team issues when they return to team scope", async () => {
    rawDb.exec(`
      INSERT INTO developers (account_id, display_name, is_active)
      VALUES ('dev-1', 'Dev 1', 1);

      INSERT INTO issues (
        jira_key,
        summary,
        description,
        priority_name,
        priority_id,
        status_name,
        status_category,
        assignee_id,
        assignee_name,
        team_scope_state,
        sync_scope_state,
        created_at,
        updated_at,
        synced_at,
        last_reconciled_at,
        excluded
      ) VALUES (
        'AM-1',
        'Returned defect',
        '',
        'High',
        '1',
        'In Progress',
        'indeterminate',
        'external-1',
        'External User',
        'out_of_team',
        'active',
        '2026-03-10T00:00:00.000Z',
        '2026-03-11T00:00:00.000Z',
        '2026-03-11T00:00:00.000Z',
        '2026-03-11T00:00:00.000Z',
        1
      );
    `);

    const jiraClient = {
      searchIssues: vi.fn(async () => [
        {
          id: "1",
          key: "AM-1",
          fields: {
            summary: "Returned defect",
            description: "",
            priority: { id: "1", name: "High" },
            status: { name: "In Progress", statusCategory: { key: "indeterminate" } },
            assignee: { accountId: "dev-1", displayName: "Dev 1" },
            reporter: { displayName: "Reporter" },
            components: [],
            labels: [],
            duedate: null,
            created: "2026-03-10T00:00:00.000Z",
            updated: "2026-03-12T09:00:00.000Z",
            customfield_10021: null,
          },
        },
      ]),
    };
    const settings = {
      getJiraProjectKey: vi.fn(async () => "AM"),
      getJiraSyncJql: vi.fn(async () => "project = AM"),
      getManagerJiraAccountId: vi.fn(async () => ""),
      getJiraDevDueDateField: vi.fn(async () => undefined),
      getJiraAspenSeverityField: vi.fn(async () => undefined),
      createJiraClient: vi.fn(async () => jiraClient),
    };
    const engine = new SyncEngine(settings as any);

    const result = await engine.syncNow();
    const issue = rawDb
      .prepare("SELECT assignee_id, team_scope_state, excluded FROM issues WHERE jira_key = ?")
      .get("AM-1") as { assignee_id: string; team_scope_state: string; excluded: number };

    expect(result.status).toBe("success");
    expect(issue.assignee_id).toBe("dev-1");
    expect(issue.team_scope_state).toBe("in_team");
    expect(issue.excluded).toBe(0);
  });
});
