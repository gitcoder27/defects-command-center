import { desc, eq } from "drizzle-orm";
import type { FilterType, Issue as SharedIssue, IssueUpdate, LocalTag, OverviewCounts } from "shared/types";
import { db } from "../db/connection";
import { configTable, issues, issueTags, localTags, syncLog } from "../db/schema";
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

    switch (query.filter) {
      case "new":
        result = result.filter((issue) => new Date(issue.createdAt).getTime() >= dayAgo.getTime());
        break;
      case "inProgress":
        result = result.filter((issue) => issue.statusCategory === "indeterminate");
        break;
      case "unassigned":
        result = result.filter((issue) => issue.assigneeId === leadId);
        break;
      case "dueToday":
        result = result.filter((issue) => effectiveDue(issue) === today);
        break;
      case "dueThisWeek":
        result = result.filter((issue) => { const d = effectiveDue(issue); return Boolean(d && d >= today && d <= weekEnd); });
        break;
      case "overdue":
        result = result.filter((issue) => { const d = effectiveDue(issue); return Boolean(d && d < today && issue.statusCategory !== "done"); });
        break;
      case "blocked":
        result = result.filter((issue) => issue.flagged);
        break;
      case "stale":
        result = result.filter((issue) => issue.statusCategory !== "done" && isOlderThanHours(issue.updatedAt, 48, now));
        break;
      case "highPriority":
        result = result.filter((issue) => issue.priorityName === "Highest" || issue.priorityName === "High");
        break;
      case "all":
      case undefined:
        break;
    }

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
      .set({ ...localUpdate, updatedAt: new Date().toISOString() })
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
    const all = await this.getAll({ filter: "all", sort: "created", order: "desc" });
    const leadId = await this.getLeadAccountId();
    const now = new Date();
    const today = todayIsoDate(now);

    const latest = await db.select().from(syncLog).orderBy(desc(syncLog.id)).limit(1);
    const effectiveDue = (issue: SharedIssue) => issue.developmentDueDate ?? issue.dueDate;

    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return {
      new: all.filter((issue) => new Date(issue.createdAt).getTime() >= dayAgo.getTime()).length,
      unassigned: all.filter((issue) => issue.assigneeId === leadId).length,
      dueToday: all.filter((issue) => effectiveDue(issue) === today).length,
      dueThisWeek: all.filter((issue) => { const d = effectiveDue(issue); return Boolean(d && d >= today && d <= endOfWeekIsoDate(now)); }).length,
      overdue: all.filter((issue) => { const d = effectiveDue(issue); return Boolean(d && d < today && issue.statusCategory !== "done"); }).length,
      blocked: all.filter((issue) => issue.flagged).length,
      stale: all.filter((issue) => issue.statusCategory !== "done" && isOlderThanHours(issue.updatedAt, 48, now)).length,
      highPriority: all.filter((issue) => issue.priorityName === "Highest" || issue.priorityName === "High").length,
      inProgress: all.filter((issue) => issue.statusCategory === "indeterminate").length,
      total: all.length,
      lastSynced: latest[0]?.completedAt ?? undefined,
    };
  }

  private async getLeadAccountId(): Promise<string> {
    const row = await db.select().from(configTable).where(eq(configTable.key, "jira_lead_account_id")).limit(1);
    return row[0]?.value ?? "";
  }

  private async getConfigValue(key: string): Promise<string | undefined> {
    const row = await db.select().from(configTable).where(eq(configTable.key, key)).limit(1);
    return row[0]?.value;
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
      localTags: tags,
      analysisNotes: row.analysisNotes ?? undefined,
    };
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
