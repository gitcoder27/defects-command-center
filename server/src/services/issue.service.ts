import { desc, eq } from "drizzle-orm";
import type { FilterType, Issue as SharedIssue, IssueUpdate, LocalTag, OverviewCounts } from "shared/types";
import { db } from "../db/connection";
import { configTable, developers, issues, issueTags, localTags, syncLog } from "../db/schema";
import { JiraClient } from "../jira/client";
import { config } from "../config";
import { endOfWeekIsoDate, isOlderThanHours, todayIsoDate } from "../utils/date";

export interface IssueQuery {
  filter?: FilterType;
  assignee?: string;
  priority?: string;
  status?: string;
  sort?: "priority" | "dueDate" | "updated" | "created";
  order?: "asc" | "desc";
}

export class IssueService {
  constructor(private readonly jiraClient: JiraClient) {}

  async getAll(query: IssueQuery = {}): Promise<SharedIssue[]> {
    const rows: Array<typeof issues.$inferSelect> = await db.select().from(issues).orderBy(desc(issues.updatedAt));
    const tagMap = await this.getTagMapForAll();
    const leadId = await this.getLeadAccountId();
    const now = new Date();
    const today = todayIsoDate(now);
    const weekEnd = endOfWeekIsoDate(now);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let result: SharedIssue[] = rows.map((row: typeof issues.$inferSelect) => this.toSharedIssue(row, tagMap.get(row.jiraKey) ?? []));
    result = this.applyIssueQuery(result, query, {
      leadId,
      now,
      today,
      weekEnd,
      dayAgo,
    });

    return this.sortIssues(result, query.sort ?? "priority", query.order ?? "desc");
  }

  async getById(jiraKey: string): Promise<SharedIssue | undefined> {
    const row = await db.select().from(issues).where(eq(issues.jiraKey, jiraKey)).limit(1);
    if (!row[0]) {
      return undefined;
    }
    const tags = await this.getTagsForIssue(jiraKey);
    return this.toSharedIssue(row[0], tags);
  }

  async update(jiraKey: string, payload: IssueUpdate): Promise<SharedIssue> {
    const jiraFields: Record<string, unknown> = {};
    const devDueDateFieldDb = await this.getConfigValue("jira_dev_due_date_field");
    const devDueDateField = devDueDateFieldDb || config.JIRA_DEV_DUE_DATE_FIELD;
    const updatedAt = new Date().toISOString();

    if (payload.assigneeId !== undefined) {
      jiraFields.assignee = { accountId: payload.assigneeId };
    }
    if (payload.priorityName !== undefined) {
      jiraFields.priority = { name: payload.priorityName };
    }
    if (payload.dueDate !== undefined) {
      jiraFields.duedate = payload.dueDate;
    }
    if (payload.developmentDueDate !== undefined) {
      jiraFields[devDueDateField] = payload.developmentDueDate;
    }
    if (payload.flagged !== undefined) {
      jiraFields.customfield_10021 = payload.flagged ? [{ id: "10019" }] : null;
    }

    // Only call Jira for Jira-synced fields
    const hasJiraFields = payload.assigneeId !== undefined || payload.priorityName !== undefined ||
      payload.dueDate !== undefined || payload.developmentDueDate !== undefined || payload.flagged !== undefined;
    if (hasJiraFields) {
      await this.jiraClient.updateIssue(jiraKey, jiraFields);
    }

    const localUpdate: Partial<typeof issues.$inferInsert> = {};
    if (payload.assigneeId !== undefined) {
      localUpdate.assigneeId = payload.assigneeId;
      localUpdate.teamScopeState = await this.resolveTeamScopeState(payload.assigneeId);
      localUpdate.syncScopeState = "active";
      localUpdate.lastReconciledAt = updatedAt;
      localUpdate.scopeChangedAt = updatedAt;
    }
    if (payload.priorityName !== undefined) {
      localUpdate.priorityName = payload.priorityName;
    }
    if (payload.dueDate !== undefined) {
      localUpdate.dueDate = payload.dueDate;
    }
    if (payload.developmentDueDate !== undefined) {
      localUpdate.developmentDueDate = payload.developmentDueDate;
    }
    if (payload.flagged !== undefined) {
      localUpdate.flagged = payload.flagged ? 1 : 0;
    }
    if (payload.analysisNotes !== undefined) {
      localUpdate.analysisNotes = payload.analysisNotes;
    }

    await db
      .update(issues)
      .set({ ...localUpdate, updatedAt })
      .where(eq(issues.jiraKey, jiraKey));

    const updated = await this.getById(jiraKey);
    if (!updated) {
      throw new Error("Issue not found after update");
    }
    return updated;
  }

  async addComment(jiraKey: string, text: string): Promise<void> {
    await this.jiraClient.addComment(jiraKey, text);
  }

  async getOverviewCounts(): Promise<OverviewCounts> {
    const rows: Array<typeof issues.$inferSelect> = await db.select().from(issues);
    const all = rows.map((row) => this.toSharedIssue(row));
    const leadId = await this.getLeadAccountId();
    const now = new Date();
    const today = todayIsoDate(now);
    const weekEnd = endOfWeekIsoDate(now);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const latest = await db.select().from(syncLog).orderBy(desc(syncLog.id)).limit(1);
    const filterContext = { leadId, now, today, weekEnd, dayAgo };

    return {
      new: this.applyIssueQuery(all, { filter: "new" }, filterContext).length,
      unassigned: this.applyIssueQuery(all, { filter: "unassigned" }, filterContext).length,
      dueToday: this.applyIssueQuery(all, { filter: "dueToday" }, filterContext).length,
      dueThisWeek: this.applyIssueQuery(all, { filter: "dueThisWeek" }, filterContext).length,
      overdue: this.applyIssueQuery(all, { filter: "overdue" }, filterContext).length,
      blocked: this.applyIssueQuery(all, { filter: "blocked" }, filterContext).length,
      stale: this.applyIssueQuery(all, { filter: "stale" }, filterContext).length,
      highPriority: this.applyIssueQuery(all, { filter: "highPriority" }, filterContext).length,
      inProgress: this.applyIssueQuery(all, { filter: "inProgress" }, filterContext).length,
      outOfTeam: this.applyIssueQuery(all, { filter: "outOfTeam" }, filterContext).length,
      total: this.applyIssueQuery(all, { filter: "all" }, filterContext).length,
      lastSynced: latest[0]?.completedAt ?? undefined,
    };
  }

  private applyIssueQuery(
    issuesList: SharedIssue[],
    query: Pick<IssueQuery, "filter" | "assignee" | "priority" | "status">,
    context: {
      leadId: string;
      now: Date;
      today: string;
      weekEnd: string;
      dayAgo: Date;
    }
  ): SharedIssue[] {
    let result = [...issuesList];

    if (query.assignee) {
      result = result.filter((issue) => issue.assigneeId === query.assignee);
    }
    if (query.priority) {
      result = result.filter((issue) => issue.priorityName === query.priority);
    }
    if (query.status) {
      result = result.filter((issue) => issue.statusName === query.status);
    }

    const effectiveDue = (issue: SharedIssue) => issue.developmentDueDate ?? issue.dueDate;
    const activeTeamIssues = () => result.filter((issue) => this.isActiveTeamIssue(issue));

    switch (query.filter) {
      case "new":
        return activeTeamIssues().filter((issue) => new Date(issue.createdAt).getTime() >= context.dayAgo.getTime());
      case "inProgress":
        return activeTeamIssues().filter((issue) => issue.statusCategory === "indeterminate");
      case "unassigned":
        return activeTeamIssues().filter((issue) => issue.assigneeId === context.leadId || issue.teamScopeState === "unassigned");
      case "dueToday":
        return activeTeamIssues().filter((issue) => effectiveDue(issue) === context.today);
      case "dueThisWeek":
        return activeTeamIssues().filter((issue) => {
          const dueDate = effectiveDue(issue);
          return Boolean(dueDate && dueDate >= context.today && dueDate <= context.weekEnd);
        });
      case "overdue":
        return activeTeamIssues().filter((issue) => {
          const dueDate = effectiveDue(issue);
          return Boolean(dueDate && dueDate < context.today);
        });
      case "blocked":
        return activeTeamIssues().filter((issue) => issue.flagged);
      case "stale":
        return activeTeamIssues().filter((issue) => isOlderThanHours(issue.updatedAt, 48, context.now));
      case "highPriority":
        return activeTeamIssues().filter((issue) => issue.priorityName === "Highest" || issue.priorityName === "High");
      case "outOfTeam":
        return result.filter((issue) => this.isOutOfTeamIssue(issue));
      case "all":
      case undefined:
        return activeTeamIssues();
    }
  }

  private async getLeadAccountId(): Promise<string> {
    const row = await db.select().from(configTable).where(eq(configTable.key, "jira_lead_account_id")).limit(1);
    return row[0]?.value ?? "";
  }

  private async getConfigValue(key: string): Promise<string | undefined> {
    const row = await db.select().from(configTable).where(eq(configTable.key, key)).limit(1);
    return row[0]?.value;
  }

  private async resolveTeamScopeState(assigneeId?: string): Promise<"in_team" | "out_of_team" | "unassigned"> {
    if (!assigneeId) {
      return "unassigned";
    }

    const rows = await db.select().from(developers).where(eq(developers.isActive, 1));
    const activeTeamIds = new Set(rows.map((row) => row.accountId));
    return activeTeamIds.has(assigneeId) ? "in_team" : "out_of_team";
  }

  private sortIssues(issuesList: SharedIssue[], sort: NonNullable<IssueQuery["sort"]>, order: NonNullable<IssueQuery["order"]>): SharedIssue[] {
    const direction = order === "asc" ? 1 : -1;
    const priorityRank: Record<string, number> = { Highest: 5, High: 4, Medium: 3, Low: 2, Lowest: 1 };

    return [...issuesList].sort((a, b) => {
      let delta = 0;
      if (sort === "priority") {
        delta = (priorityRank[a.priorityName] ?? 0) - (priorityRank[b.priorityName] ?? 0);
      }
      if (sort === "dueDate") {
        delta = (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31");
      }
      if (sort === "updated") {
        delta = a.updatedAt.localeCompare(b.updatedAt);
      }
      if (sort === "created") {
        delta = a.createdAt.localeCompare(b.createdAt);
      }
      return delta * direction;
    });
  }

  private toSharedIssue(row: typeof issues.$inferSelect, tags: LocalTag[] = []): SharedIssue {
    return {
      jiraKey: row.jiraKey,
      summary: row.summary,
      description: row.description ?? undefined,
      aspenSeverity: row.aspenSeverity ?? undefined,
      priorityName: row.priorityName,
      priorityId: row.priorityId,
      statusName: row.statusName,
      statusCategory: row.statusCategory,
      assigneeId: row.assigneeId ?? undefined,
      assigneeName: row.assigneeName ?? undefined,
      reporterName: row.reporterName ?? undefined,
      component: row.component ?? undefined,
      labels: row.labels ? (JSON.parse(row.labels) as string[]) : [],
      dueDate: row.dueDate ?? undefined,
      developmentDueDate: row.developmentDueDate ?? undefined,
      flagged: row.flagged === 1,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      teamScopeState: row.teamScopeState as SharedIssue["teamScopeState"],
      syncScopeState: row.syncScopeState as SharedIssue["syncScopeState"],
      lastSeenInScopedSyncAt: row.lastSeenInScopedSyncAt ?? undefined,
      lastReconciledAt: row.lastReconciledAt ?? undefined,
      scopeChangedAt: row.scopeChangedAt ?? undefined,
      localTags: tags,
      analysisNotes: row.analysisNotes ?? undefined,
    };
  }

  private isActiveTeamIssue(issue: SharedIssue): boolean {
    return issue.statusCategory !== "done" &&
      (issue.teamScopeState ?? "in_team") !== "out_of_team" &&
      (issue.syncScopeState ?? "active") === "active";
  }

  private isOutOfTeamIssue(issue: SharedIssue): boolean {
    return issue.statusCategory !== "done" &&
      (issue.teamScopeState ?? "in_team") === "out_of_team" &&
      (issue.syncScopeState ?? "active") === "active";
  }

  private async getTagsForIssue(jiraKey: string): Promise<LocalTag[]> {
    const rows = await db
      .select({ id: localTags.id, name: localTags.name, color: localTags.color })
      .from(issueTags)
      .innerJoin(localTags, eq(issueTags.tagId, localTags.id))
      .where(eq(issueTags.jiraKey, jiraKey));
    return rows;
  }

  private async getTagMapForAll(): Promise<Map<string, LocalTag[]>> {
    const rows = await db
      .select({
        jiraKey: issueTags.jiraKey,
        id: localTags.id,
        name: localTags.name,
        color: localTags.color,
      })
      .from(issueTags)
      .innerJoin(localTags, eq(issueTags.tagId, localTags.id));
    const map = new Map<string, LocalTag[]>();
    for (const row of rows) {
      const arr = map.get(row.jiraKey) ?? [];
      arr.push({ id: row.id, name: row.name, color: row.color });
      map.set(row.jiraKey, arr);
    }
    return map;
  }
}
