import { desc, eq } from "drizzle-orm";
import { db } from "../db/connection";
import { configTable, developers, issues, issueScopeHistory, syncLog } from "../db/schema";
import { JiraClient } from "../jira/client";
import { buildScopedJql } from "../jira/jql";
import { JiraIssue } from "../jira/types";
import { config } from "../config";
import { logger } from "../utils/logger";
import { SettingsService } from "../services/settings.service";

export interface SyncResult {
  status: "success" | "error";
  issuesSynced: number;
  startedAt: string;
  completedAt: string;
  errorMessage?: string;
}

type TeamScopeState = "in_team" | "out_of_team" | "unassigned";
type SyncScopeState = "active" | "inaccessible";

export class SyncEngine {
  private task?: NodeJS.Timeout;
  private syncing = false;
  private lastStatus: "idle" | "syncing" | "error" = "idle";
  private lastError?: string;

  constructor(private readonly settings = new SettingsService()) {}

  async start(): Promise<void> {
    this.stop();
    const syncIntervalMs = await this.settings.getSyncIntervalMs();
    this.task = setInterval(() => {
      void this.syncNow();
    }, syncIntervalMs);
  }

  stop(): void {
    if (this.task) {
      clearInterval(this.task);
    }
    this.task = undefined;
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
      const project = await this.settings.getJiraProjectKey();
      if (!project) {
        throw new Error("Missing jira_project_key in config");
      }

      const dbJql = await this.settings.getJiraSyncJql();
      const teamAccountIds = await this.getScopedTeamAccountIds();
      const jql = buildScopedJql(project, dbJql ?? config.JIRA_SYNC_JQL, teamAccountIds);
      const devDueDateField = await this.settings.getJiraDevDueDateField();
      const aspenSeverityField = await this.settings.getJiraAspenSeverityField();
      const jiraClient = await this.settings.createJiraClient();
      const locallyTrackedKeys = await this.getLocallyTrackedActiveKeys();
      const fields = [
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
        aspenSeverityField,
      ].filter((field): field is string => Boolean(field));
      const jiraIssues = await jiraClient.searchIssues(jql, fields);

      const now = new Date().toISOString();
      for (const item of jiraIssues) {
        const row = this.toIssueRow(item, now, devDueDateField, aspenSeverityField, teamAccountIds, true);
        await this.upsertIssue(row);
      }

      const returnedKeys = new Set(jiraIssues.map((it) => it.key));
      const missingKeys = locallyTrackedKeys.filter((key) => !returnedKeys.has(key));
      const reconciledCount = await this.reconcileMissingIssues(
        missingKeys,
        jiraClient,
        teamAccountIds,
        now,
        devDueDateField,
        aspenSeverityField
      );

      const completedAt = new Date().toISOString();
      if (logId !== undefined) {
        await db
          .update(syncLog)
          .set({ status: "success", issuesSynced: jiraIssues.length + reconciledCount, completedAt })
          .where(eq(syncLog.id, logId));
      }

      this.lastStatus = "idle";
      this.lastError = undefined;
      return { status: "success", issuesSynced: jiraIssues.length + reconciledCount, startedAt, completedAt };
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

  private toIssueRow(
    item: JiraIssue,
    syncedAt: string,
    devDueDateFieldOverride: string | undefined,
    aspenSeverityFieldOverride: string | undefined,
    teamAccountIds: Set<string>,
    fromScopedSync: boolean
  ): typeof issues.$inferInsert {
    const labels = item.fields.labels ?? [];
    const flagged = Array.isArray(item.fields.customfield_10021) && item.fields.customfield_10021.some((it) => it.id === "10019");
    const devDueDateField = devDueDateFieldOverride || config.JIRA_DEV_DUE_DATE_FIELD;
    const aspenSeverityField = aspenSeverityFieldOverride || config.JIRA_ASPEN_SEVERITY_FIELD;
    const developmentDueDate = this.toDateValue(item.fields[devDueDateField]);
    const aspenSeverity = aspenSeverityField ? this.toDbTextValue(item.fields[aspenSeverityField]) : null;
    const dueDate = this.toDateValue(item.fields.duedate);
    const assigneeId = this.toDbTextValue(item.fields.assignee?.accountId);
    const row: typeof issues.$inferInsert = {
      jiraKey: item.key,
      summary: this.toDbTextValue(item.fields.summary) ?? "",
      description: JSON.stringify(item.fields.description ?? ""),
      aspenSeverity,
      priorityName: this.toDbTextValue(item.fields.priority?.name) ?? "Medium",
      priorityId: this.toDbTextValue(item.fields.priority?.id) ?? "",
      statusName: this.toDbTextValue(item.fields.status?.name) ?? "",
      statusCategory: item.fields.status?.statusCategory?.key ?? "new",
      assigneeId,
      assigneeName: this.toDbTextValue(item.fields.assignee?.displayName),
      teamScopeState: this.resolveTeamScopeState(assigneeId, teamAccountIds),
      syncScopeState: "active",
      reporterName: this.toDbTextValue(item.fields.reporter?.displayName),
      component: this.toDbTextValue(item.fields.components?.[0]?.name),
      labels: JSON.stringify(labels),
      dueDate,
      developmentDueDate,
      flagged: flagged ? 1 : 0,
      createdAt: item.fields.created ?? syncedAt,
      updatedAt: item.fields.updated ?? syncedAt,
      syncedAt,
      lastReconciledAt: syncedAt,
    };
    if (fromScopedSync) {
      row.lastSeenInScopedSyncAt = syncedAt;
    }
    return row;
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
      .select()
      .from(issues)
      .where(eq(issues.jiraKey, row.jiraKey))
      .limit(1);

    if (existing.length === 0) {
      const compactedRow = this.compactRow(row);
      await db.insert(issues).values(compactedRow);
      await this.recordInitialScopeHistory(compactedRow);
      return;
    }

    const existingRow = existing[0];
    if (!existingRow) {
      return;
    }
    const { jiraKey, ...updateRow } = row;
    const compactedUpdate = this.compactRow(updateRow);
    const nextRow = { ...existingRow, ...compactedUpdate } as typeof issues.$inferSelect;
    if (this.shouldRestoreExcluded(existingRow, nextRow)) {
      compactedUpdate.excluded = 0;
      nextRow.excluded = 0;
    }
    const changed = this.hasTrackedChange(existingRow, nextRow);
    if (changed) {
      compactedUpdate.scopeChangedAt = row.lastReconciledAt ?? row.syncedAt ?? new Date().toISOString();
    }

    await db.update(issues).set(compactedUpdate).where(eq(issues.jiraKey, jiraKey));

    if (changed) {
      await this.recordScopeHistory(existingRow, nextRow, compactedUpdate.scopeChangedAt as string);
    }
  }

  private async reconcileMissingIssues(
    missingKeys: string[],
    jiraClient: JiraClient,
    teamAccountIds: Set<string>,
    reconciledAt: string,
    devDueDateFieldOverride?: string,
    aspenSeverityFieldOverride?: string
  ): Promise<number> {
    if (missingKeys.length === 0) {
      return 0;
    }

    let reconciledCount = 0;
    const batchSize = 50;

    for (let index = 0; index < missingKeys.length; index += batchSize) {
      const batch = missingKeys.slice(index, index + batchSize);
      const batchJql = `issuekey in (${batch.map((key) => `"${key}"`).join(", ")})`;
      const fields = [
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
        devDueDateFieldOverride || config.JIRA_DEV_DUE_DATE_FIELD,
        aspenSeverityFieldOverride || config.JIRA_ASPEN_SEVERITY_FIELD,
      ].filter((field): field is string => Boolean(field));
      const issuesFromJira = await jiraClient.searchIssues(batchJql, fields);

      const foundKeys = new Set(issuesFromJira.map((item) => item.key));
      for (const item of issuesFromJira) {
        const row = this.toIssueRow(
          item,
          reconciledAt,
          devDueDateFieldOverride,
          aspenSeverityFieldOverride,
          teamAccountIds,
          false
        );
        await this.upsertIssue(row);
        reconciledCount += 1;
      }

      const unresolvedKeys = batch.filter((key) => !foundKeys.has(key));
      await this.markIssuesInaccessible(unresolvedKeys, reconciledAt);
    }

    return reconciledCount;
  }

  private async markIssuesInaccessible(issueKeys: string[], reconciledAt: string): Promise<void> {
    for (const jiraKey of issueKeys) {
      const rows = await db.select().from(issues).where(eq(issues.jiraKey, jiraKey)).limit(1);
      const existing = rows[0];
      if (!existing) {
        continue;
      }

      const changed = existing.syncScopeState !== "inaccessible";
      const updateRow: Partial<typeof issues.$inferInsert> = {
        syncScopeState: "inaccessible",
        lastReconciledAt: reconciledAt,
      };

      if (changed) {
        updateRow.scopeChangedAt = reconciledAt;
      }

      await db.update(issues).set(updateRow).where(eq(issues.jiraKey, jiraKey));

      if (changed) {
        await this.recordScopeHistory(existing, { ...existing, ...updateRow }, reconciledAt);
      }
    }
  }

  private async getActiveTeamAccountIds(): Promise<Set<string>> {
    const rows = await db.select().from(developers).where(eq(developers.isActive, 1));
    return new Set(
      rows
        .map((row) => row.jiraAccountId ?? (row.source === "manual" ? undefined : row.accountId))
        .filter((accountId): accountId is string => Boolean(accountId?.trim()))
    );
  }

  private async getScopedTeamAccountIds(): Promise<Set<string>> {
    const teamAccountIds = await this.getActiveTeamAccountIds();
    const managerJiraAccountId = (await this.settings.getManagerJiraAccountId()).trim();
    if (managerJiraAccountId) {
      teamAccountIds.add(managerJiraAccountId);
    }
    return teamAccountIds;
  }

  private async getLocallyTrackedActiveKeys(): Promise<string[]> {
    const rows = await db
      .select({
        jiraKey: issues.jiraKey,
        statusCategory: issues.statusCategory,
        syncScopeState: issues.syncScopeState,
        excluded: issues.excluded,
      })
      .from(issues);

    return rows
      .filter((row) => row.statusCategory !== "done" && row.syncScopeState === "active" && row.excluded !== 1)
      .map((row) => row.jiraKey);
  }

  private resolveTeamScopeState(assigneeId: string | null, teamAccountIds: Set<string>): TeamScopeState {
    if (!assigneeId) {
      return "unassigned";
    }
    return teamAccountIds.has(assigneeId) ? "in_team" : "out_of_team";
  }

  private compactRow<T extends Record<string, unknown>>(row: T): T {
    return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined)) as T;
  }

  private hasTrackedChange(
    previous: typeof issues.$inferSelect,
    next: Partial<typeof issues.$inferInsert> & typeof issues.$inferSelect
  ): boolean {
    return previous.assigneeId !== next.assigneeId ||
      previous.teamScopeState !== next.teamScopeState ||
      previous.syncScopeState !== next.syncScopeState ||
      previous.statusCategory !== next.statusCategory;
  }

  private shouldRestoreExcluded(
    previous: typeof issues.$inferSelect,
    next: Partial<typeof issues.$inferInsert> & typeof issues.$inferSelect
  ): boolean {
    return previous.excluded === 1 &&
      previous.teamScopeState === "out_of_team" &&
      next.teamScopeState !== "out_of_team";
  }

  private async recordScopeHistory(
    previous: typeof issues.$inferSelect,
    next: Partial<typeof issues.$inferInsert> & typeof issues.$inferSelect,
    observedAt: string
  ): Promise<void> {
    await db.insert(issueScopeHistory).values({
      jiraKey: previous.jiraKey,
      observedAt,
      changeType: this.getChangeType(previous, next),
      fromAssigneeId: previous.assigneeId,
      toAssigneeId: next.assigneeId ?? null,
      fromTeamScopeState: previous.teamScopeState,
      toTeamScopeState: next.teamScopeState ?? previous.teamScopeState,
      fromSyncScopeState: previous.syncScopeState,
      toSyncScopeState: next.syncScopeState ?? previous.syncScopeState,
      fromStatusCategory: previous.statusCategory,
      toStatusCategory: next.statusCategory ?? previous.statusCategory,
    });
  }

  private async recordInitialScopeHistory(row: typeof issues.$inferInsert): Promise<void> {
    await db.insert(issueScopeHistory).values({
      jiraKey: row.jiraKey,
      observedAt: row.lastReconciledAt ?? row.syncedAt ?? row.createdAt,
      changeType: "entered_team_scope",
      fromAssigneeId: null,
      toAssigneeId: row.assigneeId ?? null,
      fromTeamScopeState: null,
      toTeamScopeState: row.teamScopeState ?? "in_team",
      fromSyncScopeState: null,
      toSyncScopeState: row.syncScopeState ?? "active",
      fromStatusCategory: null,
      toStatusCategory: row.statusCategory,
    });
  }

  private getChangeType(
    previous: typeof issues.$inferSelect,
    next: Partial<typeof issues.$inferInsert> & typeof issues.$inferSelect
  ): string {
    if (previous.statusCategory !== next.statusCategory && next.statusCategory === "done") {
      return "resolved";
    }
    if (previous.teamScopeState !== next.teamScopeState) {
      if (next.teamScopeState === "out_of_team") {
        return "left_team_scope";
      }
      if (next.teamScopeState === "in_team") {
        return "returned_to_team_scope";
      }
      return "team_scope_changed";
    }
    if (previous.syncScopeState !== next.syncScopeState) {
      return next.syncScopeState === "inaccessible" ? "issue_unreachable" : "sync_scope_restored";
    }
    if (previous.assigneeId !== next.assigneeId) {
      return "reassigned";
    }
    return "issue_updated";
  }
}
