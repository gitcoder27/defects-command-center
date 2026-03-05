import cron from "node-cron";
import { desc, eq, sql } from "drizzle-orm";
import { db, rawDb } from "../db/connection";
import { configTable, issues, issueTags, localTags, syncLog } from "../db/schema";
import { JiraClient } from "../jira/client";
import { JiraIssue } from "../jira/types";
import { logger } from "../utils/logger";
import { config } from "../config";

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

  constructor(private readonly jiraClient: JiraClient) {}

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
      const jiraIssues = await this.jiraClient.searchIssues(jql, [
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
        await db
          .insert(issues)
          .values(this.toIssueRow(item, now, devDueDateField))
          .onConflictDoUpdate({
            target: issues.jiraKey,
            set: this.toIssueRow(item, now, devDueDateField),
          });
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
    const devDueDate = (item.fields[devDueDateField] as string | null | undefined) ?? null;
    return {
      jiraKey: item.key,
      summary: item.fields.summary ?? "",
      description: JSON.stringify(item.fields.description ?? ""),
      priorityName: item.fields.priority?.name ?? "Medium",
      priorityId: item.fields.priority?.id ?? "",
      statusName: item.fields.status?.name ?? "",
      statusCategory: item.fields.status?.statusCategory?.key ?? "new",
      assigneeId: item.fields.assignee?.accountId ?? null,
      assigneeName: item.fields.assignee?.displayName ?? null,
      reporterName: item.fields.reporter?.displayName ?? null,
      component: item.fields.components?.[0]?.name ?? null,
      labels: JSON.stringify(labels),
      dueDate: item.fields.duedate ?? null,
      developmentDueDate: devDueDate,
      flagged: flagged ? 1 : 0,
      createdAt: item.fields.created ?? syncedAt,
      updatedAt: item.fields.updated ?? syncedAt,
      syncedAt,
    };
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
}
