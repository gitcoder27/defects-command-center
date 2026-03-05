import cron from "node-cron";
import { desc, eq, sql } from "drizzle-orm";
import { db, rawDb } from "../db/connection";
import { configTable, issues, issueTags, localTags, syncLog } from "../db/schema";
import { JiraClient } from "../jira/client";
import { JiraIssue } from "../jira/types";
import { logger } from "../utils/logger";
import { config } from "../config";
import { getJiraApiToken } from "../runtime-credentials";

export interface SyncResult {
  status: "success" | "error";
  issuesSynced: number;
  startedAt: string;
  completedAt: string;
  errorMessage?: string;
}

export class SyncEngine {
  private task?: { stop: () => void };
  private syncing = false;
  private lastStatus: "idle" | "syncing" | "error" = "idle";
  private lastError?: string;

  constructor() {}

  start(): void {
    this.task = cron.schedule("*/5 * * * *", () => {
      void this.syncNow();
    });
  }

  stop(): void {
    this.task?.stop();
  }

  getRuntimeStatus(): { status: "idle" | "syncing" | "error"; errorMessage?: string } {
    return { status: this.lastStatus, errorMessage: this.lastError };
  }

  async getLastSyncLog(): Promise<typeof syncLog.$inferSelect | undefined> {
    const rows = await db.select().from(syncLog).orderBy(desc(syncLog.id)).limit(1);
    return rows[0];
  }

  async syncNow(): Promise<SyncResult> {
    if (this.syncing) {
      const now = new Date().toISOString();
      return { status: "success", issuesSynced: 0, startedAt: now, completedAt: now };
    }

    this.syncing = true;
    this.lastStatus = "syncing";
    const startedAt = new Date().toISOString();
    const logInsert = await db.insert(syncLog).values({ startedAt, status: "running", issuesSynced: 0 }).returning({ id: syncLog.id });
    const logId = logInsert[0]?.id;

    try {
      const project = await this.getConfigValue("jira_project_key");
      if (!project) {
        throw new Error("Missing jira_project_key in config");
      }

      const last = await this.getLastSuccessfulSyncTime();
      const dbJql = await this.getConfigValue("jira_sync_jql");
      const jql = this.buildJql(project, last, dbJql);
      const dbDevField = await this.getConfigValue("jira_dev_due_date_field");
      const devDueDateField = dbDevField || config.JIRA_DEV_DUE_DATE_FIELD;
      const jiraClient = await this.getJiraClient();
      const jiraIssues = await jiraClient.searchIssues(jql, [
        "summary",
        "description",
        "priority",
        "status",
        "assignee",
        "reporter",
        "components",
        "labels",
        "duedate",
        "created",
        "updated",
        "customfield_10021",
        devDueDateField,
      ]);

      const now = new Date().toISOString();
      for (const item of jiraIssues) {
        const row = this.toIssueRow(item, now, devDueDateField);
        await this.upsertIssue(row);
      }

      await this.markMissingAsDone(jiraIssues.map((it) => it.key));

      const completedAt = new Date().toISOString();
      if (logId !== undefined) {
        await db
          .update(syncLog)
          .set({ status: "success", issuesSynced: jiraIssues.length, completedAt })
          .where(eq(syncLog.id, logId));
      }

      this.lastStatus = "idle";
      this.lastError = undefined;
      return { status: "success", issuesSynced: jiraIssues.length, startedAt, completedAt };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown sync error";
      logger.error({ err: error }, "Sync failed");
      const completedAt = new Date().toISOString();
      if (logId !== undefined) {
        await db.update(syncLog).set({ status: "error", errorMessage: message, completedAt }).where(eq(syncLog.id, logId));
      }
      this.lastStatus = "error";
      this.lastError = message;
      return { status: "error", issuesSynced: 0, startedAt, completedAt, errorMessage: message };
    } finally {
      this.syncing = false;
    }
  }

  private buildJql(projectKey: string, lastSync?: string, dbJql?: string): string {
    const configured = (dbJql ?? config.JIRA_SYNC_JQL ?? "").trim();
    const base = configured
      ? configured.replaceAll("{PROJECT_KEY}", projectKey)
      : `project = ${projectKey} AND issuetype = Bug AND statusCategory != Done`;
    if (!lastSync) {
      return base;
    }
    if (/\border\s+by\b/i.test(base)) {
      // Avoid invalid JQL by not appending incremental condition after ORDER BY.
      return base;
    }
    return `${base} AND updated >= \"${lastSync}\"`;
  }

  private async getLastSuccessfulSyncTime(): Promise<string | undefined> {
    const row = await db.select().from(syncLog).where(eq(syncLog.status, "success")).orderBy(desc(syncLog.id)).limit(1);
    return row[0]?.completedAt ?? undefined;
  }

  private async getConfigValue(key: string): Promise<string | undefined> {
    const rows = await db.select().from(configTable).where(eq(configTable.key, key)).limit(1);
    return rows[0]?.value;
  }

  private toIssueRow(item: JiraIssue, syncedAt: string, devDueDateFieldOverride?: string): typeof issues.$inferInsert {
    const labels = item.fields.labels ?? [];
    const flagged = Array.isArray(item.fields.customfield_10021) && item.fields.customfield_10021.some((it) => it.id === "10019");
    const devDueDateField = devDueDateFieldOverride || config.JIRA_DEV_DUE_DATE_FIELD;
    const developmentDueDate = this.toDateValue(item.fields[devDueDateField]);
    const dueDate = this.toDateValue(item.fields.duedate);
    return {
      jiraKey: item.key,
      summary: this.toDbTextValue(item.fields.summary) ?? "",
      description: JSON.stringify(item.fields.description ?? ""),
      priorityName: this.toDbTextValue(item.fields.priority?.name) ?? "Medium",
      priorityId: this.toDbTextValue(item.fields.priority?.id) ?? "",
      statusName: this.toDbTextValue(item.fields.status?.name) ?? "",
      statusCategory: item.fields.status?.statusCategory?.key ?? "new",
      assigneeId: this.toDbTextValue(item.fields.assignee?.accountId),
      assigneeName: this.toDbTextValue(item.fields.assignee?.displayName),
      reporterName: this.toDbTextValue(item.fields.reporter?.displayName),
      component: this.toDbTextValue(item.fields.components?.[0]?.name),
      labels: JSON.stringify(labels),
      dueDate,
      developmentDueDate,
      flagged: flagged ? 1 : 0,
      createdAt: item.fields.created ?? syncedAt,
      updatedAt: item.fields.updated ?? syncedAt,
      syncedAt,
    };
  }

  private toDbTextValue(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === "string") {
      return value;
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return null;
      }
      for (const entry of value) {
        const nested = this.toDbTextValue(entry);
        if (nested !== null) {
          return nested;
        }
      }
      return null;
    }
    if (typeof value === "object") {
      const objectValue = value as { value?: unknown; name?: unknown };
      if (objectValue.value !== undefined && objectValue.value !== null) {
        return this.toDbTextValue(objectValue.value);
      }
      if (objectValue.name !== undefined && objectValue.name !== null) {
        return this.toDbTextValue(objectValue.name);
      }
      return JSON.stringify(value);
    }
    return String(value);
  }

  private toDateValue(value: unknown): string | null {
    const normalized = this.toDbTextValue(value);
    if (normalized === null) {
      return null;
    }

    const trimmed = normalized.trim();
    if (!trimmed) {
      return null;
    }

    const parseDate = (raw: string): string | null => {
      const parsed = new Date(raw);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString().slice(0, 10);
      }
      return null;
    };

    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const direct = parseDate(trimmed);
      if (direct) {
        return direct;
      }
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === "string") {
        return this.toDateValue(parsed) ?? null;
      }
      if (parsed && typeof parsed === "object") {
        const valueLike = (parsed as { value?: unknown; date?: unknown; dueDate?: unknown; startDate?: unknown; endDate?: unknown }).value;
        if (valueLike !== undefined) {
          return this.toDateValue(valueLike);
        }
        const dateLike = (parsed as { value?: unknown; date?: unknown; dueDate?: unknown; startDate?: unknown; endDate?: unknown }).date;
        if (dateLike !== undefined) {
          return this.toDateValue(dateLike);
        }
        const dueDateLike = (parsed as { value?: unknown; date?: unknown; dueDate?: unknown; startDate?: unknown; endDate?: unknown }).dueDate;
        if (dueDateLike !== undefined) {
          return this.toDateValue(dueDateLike);
        }
        const startDateLike = (parsed as { value?: unknown; date?: unknown; dueDate?: unknown; startDate?: unknown; endDate?: unknown }).startDate;
        if (startDateLike !== undefined) {
          return this.toDateValue(startDateLike);
        }
        const endDateLike = (parsed as { value?: unknown; date?: unknown; dueDate?: unknown; startDate?: unknown; endDate?: unknown }).endDate;
        if (endDateLike !== undefined) {
          return this.toDateValue(endDateLike);
        }
      }
    } catch {
      // keep normalized string fallback
    }

    return parseDate(trimmed);
  }

  private async upsertIssue(row: typeof issues.$inferInsert): Promise<void> {
    const existing = await db
      .select({ jiraKey: issues.jiraKey })
      .from(issues)
      .where(eq(issues.jiraKey, row.jiraKey))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(issues).values(row);
      return;
    }

    const { jiraKey, ...updateRow } = row;
    await db.update(issues).set(updateRow).where(eq(issues.jiraKey, jiraKey));
  }

  private async markMissingAsDone(activeKeys: string[]): Promise<void> {
    if (activeKeys.length === 0) {
      await db.update(issues).set({ statusCategory: "done" }).where(sql`1 = 1`);
      return;
    }

    const placeholders = activeKeys.map(() => "?").join(", ");
    const statement = rawDb.prepare(`UPDATE issues SET status_category = 'done' WHERE jira_key NOT IN (${placeholders})`);
    statement.run(...activeKeys);
  }

  private async getJiraClient(): Promise<JiraClient> {
    const baseUrl = (await this.getConfigValue("jira_base_url")) ?? config.JIRA_BASE_URL;
    const email = (await this.getConfigValue("jira_email")) ?? config.JIRA_EMAIL;
    const token = await this.getJiraToken();

    if (!baseUrl || !email || !token) {
      throw new Error("Missing Jira credentials");
    }

    return new JiraClient(baseUrl, email, token);
  }

  private async getJiraToken(): Promise<string | undefined> {
    const tokenFromDb = await this.getConfigValue("jira_api_token");
    return tokenFromDb || getJiraApiToken() || config.JIRA_API_TOKEN;
  }
}
