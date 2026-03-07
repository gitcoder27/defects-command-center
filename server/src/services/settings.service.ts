import { eq } from "drizzle-orm";
import { config } from "../config";
import { db } from "../db/connection";
import { configTable } from "../db/schema";
import { JiraClient } from "../jira/client";
import { getJiraApiToken } from "../runtime-credentials";

export const DEFAULT_SYNC_INTERVAL_MS = 300_000;
export const DEFAULT_STALE_THRESHOLD_HOURS = 48;

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

  async getJiraLeadAccountId(): Promise<string> {
    return (await this.getConfigValue("jira_lead_account_id")) ?? "";
  }

  async getJiraToken(): Promise<string | undefined> {
    const tokenFromDb = await this.getConfigValue("jira_api_token");
    return tokenFromDb || getJiraApiToken() || config.JIRA_API_TOKEN;
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
}
