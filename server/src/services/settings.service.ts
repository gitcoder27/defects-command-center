import { eq } from "drizzle-orm";
import { config } from "../config";
import { getDefaultBackupDirectory, resolveWorkspacePath, workspaceRoot } from "../db/paths";
import { db } from "../db/connection";
import { configTable } from "../db/schema";
import { JiraClient } from "../jira/client";
import { getJiraApiToken } from "../runtime-credentials";
import { getPersistedJiraApiToken } from "./jira-credentials.service";
import path from "node:path";
import { HttpError } from "../middleware/errorHandler";

export const DEFAULT_SYNC_INTERVAL_MS = 300_000;
export const DEFAULT_STALE_THRESHOLD_HOURS = 48;
export const DEFAULT_TEAM_TRACKER_STALE_THRESHOLD_HOURS = 4;
export const DEFAULT_TEAM_TRACKER_NO_CURRENT_THRESHOLD_HOURS = 2;
export const DEFAULT_TEAM_TRACKER_STATUS_FOLLOW_UP_THRESHOLD_HOURS = 2;
export const DEFAULT_BACKUP_ENABLED = true;
export const DEFAULT_BACKUP_INTERVAL_MINUTES = 30;
export const DEFAULT_BACKUP_RETENTION_DAYS = 14;
export const DEFAULT_BACKUP_MAX_SCHEDULED_SNAPSHOTS = 96;
export const DEFAULT_BACKUP_ON_STARTUP = true;
export const DEFAULT_BACKUP_STARTUP_MAX_AGE_HOURS = 12;
export const DEFAULT_BACKUP_BEFORE_RESET = true;

export class SettingsService {
  async getConfigValue(key: string): Promise<string | undefined> {
    const rows = await db.select().from(configTable).where(eq(configTable.key, key)).limit(1);
    return rows[0]?.value;
  }

  async getJiraBaseUrl(): Promise<string | undefined> {
    return (await this.getConfigValue("jira_base_url")) ?? config.JIRA_BASE_URL;
  }

  async getJiraEmail(): Promise<string | undefined> {
    return (await this.getConfigValue("jira_email")) ?? config.JIRA_EMAIL;
  }

  async getJiraProjectKey(): Promise<string | undefined> {
    return (await this.getConfigValue("jira_project_key")) ?? config.JIRA_PROJECT_KEY;
  }

  async getManagerJiraAccountId(): Promise<string> {
    return (await this.getConfigValue("manager_jira_account_id")) ??
      (await this.getConfigValue("jira_lead_account_id")) ??
      "";
  }

  async getJiraLeadAccountId(): Promise<string> {
    return this.getManagerJiraAccountId();
  }

  async getJiraToken(): Promise<string | undefined> {
    return (await getPersistedJiraApiToken()) || getJiraApiToken() || config.JIRA_API_TOKEN;
  }

  async getJiraSyncJql(): Promise<string | undefined> {
    return (await this.getConfigValue("jira_sync_jql")) ?? config.JIRA_SYNC_JQL;
  }

  async getJiraDevDueDateField(): Promise<string> {
    return (await this.getConfigValue("jira_dev_due_date_field")) || config.JIRA_DEV_DUE_DATE_FIELD;
  }

  async getJiraAspenSeverityField(): Promise<string | undefined> {
    return (await this.getConfigValue("jira_aspen_severity_field")) || config.JIRA_ASPEN_SEVERITY_FIELD;
  }

  async getSyncIntervalMs(): Promise<number> {
    return this.getPositiveIntegerConfig("sync_interval_ms", DEFAULT_SYNC_INTERVAL_MS);
  }

  async getStaleThresholdHours(): Promise<number> {
    return this.getPositiveIntegerConfig("stale_threshold_hours", DEFAULT_STALE_THRESHOLD_HOURS);
  }

  async getTeamTrackerStaleThresholdHours(): Promise<number> {
    return this.getPositiveIntegerConfig(
      "team_tracker_stale_threshold_hours",
      DEFAULT_TEAM_TRACKER_STALE_THRESHOLD_HOURS
    );
  }

  async getTeamTrackerNoCurrentThresholdHours(): Promise<number> {
    return this.getPositiveIntegerConfig(
      "team_tracker_no_current_threshold_hours",
      DEFAULT_TEAM_TRACKER_NO_CURRENT_THRESHOLD_HOURS
    );
  }

  async getTeamTrackerStatusFollowUpThresholdHours(): Promise<number> {
    return this.getPositiveIntegerConfig(
      "team_tracker_status_follow_up_threshold_hours",
      DEFAULT_TEAM_TRACKER_STATUS_FOLLOW_UP_THRESHOLD_HOURS
    );
  }

  async getBackupEnabled(): Promise<boolean> {
    return this.getBooleanConfig("backup_enabled", DEFAULT_BACKUP_ENABLED);
  }

  async getBackupIntervalMinutes(): Promise<number> {
    return this.getPositiveIntegerConfig("backup_interval_minutes", DEFAULT_BACKUP_INTERVAL_MINUTES);
  }

  async getBackupRetentionDays(): Promise<number> {
    return this.getPositiveIntegerConfig("backup_retention_days", DEFAULT_BACKUP_RETENTION_DAYS);
  }

  async getBackupMaxScheduledSnapshots(): Promise<number> {
    return this.getPositiveIntegerConfig("backup_max_scheduled_snapshots", DEFAULT_BACKUP_MAX_SCHEDULED_SNAPSHOTS);
  }

  async getBackupOnStartup(): Promise<boolean> {
    return this.getBooleanConfig("backup_on_startup", DEFAULT_BACKUP_ON_STARTUP);
  }

  async getBackupStartupMaxAgeHours(): Promise<number> {
    return this.getPositiveIntegerConfig("backup_startup_max_age_hours", DEFAULT_BACKUP_STARTUP_MAX_AGE_HOURS);
  }

  async getBackupBeforeReset(): Promise<boolean> {
    return this.getBooleanConfig("backup_before_reset", DEFAULT_BACKUP_BEFORE_RESET);
  }

  async getBackupDirectory(): Promise<string> {
    const configured = await this.getConfigValue("backup_directory");
    if (configured) {
      await this.validateBackupDirectory(configured);
      return configured;
    }
    return getDefaultBackupDirectory();
  }

  async validateBackupDirectory(targetPath: string): Promise<void> {
    if (config.NODE_ENV !== "production") {
      return;
    }

    const resolved = resolveWorkspacePath(targetPath);
    const allowedRoot = path.resolve(workspaceRoot, "data", "backups");
    const relative = path.relative(allowedRoot, resolved);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new HttpError(400, "Backup directory must be inside the app-owned data/backups directory");
    }
  }

  async createJiraClient(): Promise<JiraClient> {
    const baseUrl = await this.getJiraBaseUrl();
    const email = await this.getJiraEmail();
    const apiToken = await this.getJiraToken();

    if (!baseUrl || !email || !apiToken) {
      throw new Error("Missing Jira credentials");
    }

    return new JiraClient(baseUrl, email, apiToken);
  }

  private async getPositiveIntegerConfig(key: string, fallback: number): Promise<number> {
    const rawValue = (await this.getConfigValue(key))?.trim();
    if (!rawValue) {
      return fallback;
    }

    const parsed = Number.parseInt(rawValue, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  private async getBooleanConfig(key: string, fallback: boolean): Promise<boolean> {
    const rawValue = (await this.getConfigValue(key))?.trim().toLowerCase();
    if (!rawValue) {
      return fallback;
    }

    if (["1", "true", "yes", "on"].includes(rawValue)) {
      return true;
    }
    if (["0", "false", "no", "off"].includes(rawValue)) {
      return false;
    }
    return fallback;
  }
}
