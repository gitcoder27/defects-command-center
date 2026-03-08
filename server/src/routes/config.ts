import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/connection";
import { configTable, developers as developersTable, issues, syncLog, componentMap, issueScopeHistory, issueTags, localTags } from "../db/schema";
import { validate } from "../middleware/validate";
import { JiraClient } from "../jira/client";
import { stripManagedAssigneeClause } from "../jira/jql";
import { config } from "../config";
import { clearJiraApiToken, getJiraApiToken, setJiraApiToken } from "../runtime-credentials";
import { BackupService } from "../services/backup.service";
import { SettingsService } from "../services/settings.service";
import { SyncEngine } from "../sync/engine";
import { logger } from "../utils/logger";

const configSchema = z.object({
  body: z.object({
    jiraBaseUrl: z.string().url(),
    jiraEmail: z.string().email(),
    jiraProjectKey: z.string().min(1),
    jiraLeadAccountId: z.string().regex(/^[A-Za-z0-9:-]+$/).optional(),
    jiraApiToken: z.string().min(1).optional(),
    syncIntervalMs: z.number().int().positive().default(300000),
    staleThresholdHours: z.number().int().positive().default(48),
    backupEnabled: z.boolean().optional(),
    backupIntervalMinutes: z.number().int().positive().optional(),
    backupRetentionDays: z.number().int().positive().optional(),
    backupMaxScheduledSnapshots: z.number().int().positive().optional(),
    backupDirectory: z.string().min(1).optional(),
    backupOnStartup: z.boolean().optional(),
    backupStartupMaxAgeHours: z.number().int().positive().optional(),
    backupBeforeReset: z.boolean().optional(),
    jiraSyncJql: z.string().optional(),
    jiraDevDueDateField: z.string().optional(),
    jiraAspenSeverityField: z.string().optional(),
  }),
  params: z.any().optional(),
  query: z.any().optional(),
});

const testSchema = z.object({
  body: z.object({
    jiraBaseUrl: z.string().url(),
    jiraEmail: z.string().email(),
    jiraApiToken: z.string().min(1),
  }),
  params: z.any().optional(),
  query: z.any().optional(),
});

async function upsertConfig(key: string, value: string): Promise<void> {
  await db.insert(configTable).values({ key, value }).onConflictDoUpdate({ target: configTable.key, set: { value } });
}

async function getConfigValue(key: string): Promise<string | undefined> {
  const rows = await db.select().from(configTable).where(eq(configTable.key, key)).limit(1);
  return rows[0]?.value;
}

async function getStoredJiraApiToken(): Promise<string | undefined> {
  return getConfigValue("jira_api_token");
}

export function createConfigRouter(syncEngine?: SyncEngine, backupService?: BackupService): Router {
  const settings = new SettingsService();
  const router = Router();

  router.get("/", async (_req, res, next) => {
    try {
      const jiraBaseUrl = (await getConfigValue("jira_base_url")) ?? config.JIRA_BASE_URL ?? "";
      const jiraEmail = (await getConfigValue("jira_email")) ?? config.JIRA_EMAIL ?? "";
      const jiraProjectKey = (await getConfigValue("jira_project_key")) ?? config.JIRA_PROJECT_KEY ?? "";
      const jiraLeadAccountId = (await getConfigValue("jira_lead_account_id")) ?? "";
      const jiraApiToken = (await getStoredJiraApiToken()) || getJiraApiToken() || config.JIRA_API_TOKEN || "";
      const syncIntervalMs = Number((await getConfigValue("sync_interval_ms")) ?? "300000");
      const staleThresholdHours = Number((await getConfigValue("stale_threshold_hours")) ?? "48");
      const backupEnabled = await settings.getBackupEnabled();
      const backupIntervalMinutes = await settings.getBackupIntervalMinutes();
      const backupRetentionDays = await settings.getBackupRetentionDays();
      const backupMaxScheduledSnapshots = await settings.getBackupMaxScheduledSnapshots();
      const backupDirectory = await settings.getBackupDirectory();
      const backupOnStartup = await settings.getBackupOnStartup();
      const backupStartupMaxAgeHours = await settings.getBackupStartupMaxAgeHours();
      const backupBeforeReset = await settings.getBackupBeforeReset();
      const jiraSyncJql = stripManagedAssigneeClause((await getConfigValue("jira_sync_jql")) ?? config.JIRA_SYNC_JQL ?? "");
      const jiraDevDueDateField = (await getConfigValue("jira_dev_due_date_field")) ?? config.JIRA_DEV_DUE_DATE_FIELD ?? "customfield_10128";
      const jiraAspenSeverityField = (await getConfigValue("jira_aspen_severity_field")) ?? config.JIRA_ASPEN_SEVERITY_FIELD ?? "";

      res.json({
        jiraBaseUrl,
        jiraEmail,
        jiraProjectKey,
        jiraLeadAccountId,
        jiraApiToken: jiraApiToken ? "****" : "",
        syncIntervalMs,
        staleThresholdHours,
        backupEnabled,
        backupIntervalMinutes,
        backupRetentionDays,
        backupMaxScheduledSnapshots,
        backupDirectory,
        backupOnStartup,
        backupStartupMaxAgeHours,
        backupBeforeReset,
        jiraSyncJql,
        jiraDevDueDateField,
        jiraAspenSeverityField,
        isConfigured: Boolean(jiraBaseUrl && jiraEmail && jiraProjectKey && jiraLeadAccountId && jiraApiToken),
      });
    } catch (error) {
      next(error);
    }
  });

  router.put("/", validate(configSchema), async (req, res, next) => {
    try {
      let jiraLeadAccountId = req.body.jiraLeadAccountId;
      const syncIntervalMs = req.body.syncIntervalMs ?? 300000;
      const staleThresholdHours = req.body.staleThresholdHours ?? 48;
      const tokenForLookup = req.body.jiraApiToken ?? (await getStoredJiraApiToken()) ?? getJiraApiToken() ?? config.JIRA_API_TOKEN;

      // If lead account id is not provided by client, derive it from Jira /myself.
      if (!jiraLeadAccountId) {
        if (!tokenForLookup) {
          res.status(400).json({
            error: "jiraLeadAccountId is required when jiraApiToken is not provided",
            status: 400,
          });
          return;
        }

        const client = new JiraClient(req.body.jiraBaseUrl, req.body.jiraEmail, tokenForLookup);
        const me = await client.getCurrentUser();
        jiraLeadAccountId = me.accountId;
      }

      if (req.body.jiraApiToken) {
        await upsertConfig("jira_api_token", req.body.jiraApiToken);
        setJiraApiToken(req.body.jiraApiToken);
      }

      await upsertConfig("jira_base_url", req.body.jiraBaseUrl);
      await upsertConfig("jira_email", req.body.jiraEmail);
      await upsertConfig("jira_project_key", req.body.jiraProjectKey);
      await upsertConfig("jira_lead_account_id", jiraLeadAccountId);
      await upsertConfig("sync_interval_ms", String(syncIntervalMs));
      await upsertConfig("stale_threshold_hours", String(staleThresholdHours));
      if (req.body.jiraSyncJql !== undefined) {
        await upsertConfig("jira_sync_jql", stripManagedAssigneeClause(req.body.jiraSyncJql));
      }
      if (req.body.jiraDevDueDateField !== undefined) {
        await upsertConfig("jira_dev_due_date_field", req.body.jiraDevDueDateField);
      }
      if (req.body.jiraAspenSeverityField !== undefined) {
        await upsertConfig("jira_aspen_severity_field", req.body.jiraAspenSeverityField);
      }
      if (req.body.backupEnabled !== undefined) {
        await upsertConfig("backup_enabled", String(req.body.backupEnabled));
      }
      if (req.body.backupIntervalMinutes !== undefined) {
        await upsertConfig("backup_interval_minutes", String(req.body.backupIntervalMinutes));
      }
      if (req.body.backupRetentionDays !== undefined) {
        await upsertConfig("backup_retention_days", String(req.body.backupRetentionDays));
      }
      if (req.body.backupMaxScheduledSnapshots !== undefined) {
        await upsertConfig("backup_max_scheduled_snapshots", String(req.body.backupMaxScheduledSnapshots));
      }
      if (req.body.backupDirectory !== undefined) {
        await upsertConfig("backup_directory", req.body.backupDirectory);
      }
      if (req.body.backupOnStartup !== undefined) {
        await upsertConfig("backup_on_startup", String(req.body.backupOnStartup));
      }
      if (req.body.backupStartupMaxAgeHours !== undefined) {
        await upsertConfig("backup_startup_max_age_hours", String(req.body.backupStartupMaxAgeHours));
      }
      if (req.body.backupBeforeReset !== undefined) {
        await upsertConfig("backup_before_reset", String(req.body.backupBeforeReset));
      }

      const token = req.body.jiraApiToken ?? tokenForLookup;
      if (syncEngine && req.body.jiraBaseUrl && req.body.jiraEmail && req.body.jiraProjectKey && token) {
        await syncEngine.start();
        void syncEngine.syncNow();
      }
      if (backupService) {
        await backupService.start();
      }

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  router.post("/test", validate(testSchema), async (req, res, next) => {
    try {
      const client = new JiraClient(req.body.jiraBaseUrl, req.body.jiraEmail, req.body.jiraApiToken);
      const ok = await client.testConnection();
      if (!ok) {
        res.status(400).json({ error: "Unable to connect to Jira", status: 400 });
        return;
      }
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // Discover custom fields from Jira (for settings page)
  router.get("/fields", async (_req, res, next) => {
    try {
      const baseUrl = (await getConfigValue("jira_base_url")) ?? config.JIRA_BASE_URL;
      const email = (await getConfigValue("jira_email")) ?? config.JIRA_EMAIL;
      const token = (await getStoredJiraApiToken()) || getJiraApiToken() || config.JIRA_API_TOKEN;
      if (!baseUrl || !email || !token) {
        res.status(400).json({ error: "Jira credentials not configured", status: 400 });
        return;
      }
      const client = new JiraClient(baseUrl, email, token);
      const fields = await client.getFields();
      res.json({ fields });
    } catch (error) {
      next(error);
    }
  });

  // Lightweight settings update (JQL + dev due date field only, no full config rewrite)
  const settingsSchema = z.object({
    body: z.object({
      jiraSyncJql: z.string().optional(),
      jiraDevDueDateField: z.string().optional(),
      jiraAspenSeverityField: z.string().optional(),
    }),
    params: z.any().optional(),
    query: z.any().optional(),
  });

  router.put("/settings", validate(settingsSchema), async (req, res, next) => {
    try {
      if (req.body.jiraSyncJql !== undefined) {
        await upsertConfig("jira_sync_jql", stripManagedAssigneeClause(req.body.jiraSyncJql));
      }
      if (req.body.jiraDevDueDateField !== undefined) {
        await upsertConfig("jira_dev_due_date_field", req.body.jiraDevDueDateField);
      }
      if (req.body.jiraAspenSeverityField !== undefined) {
        await upsertConfig("jira_aspen_severity_field", req.body.jiraAspenSeverityField);
      }
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  router.post("/reset", async (_req, res, next) => {
    try {
      const backup = await backupService?.createPreResetBackup();
      syncEngine?.stop();
      await db.delete(issueScopeHistory);
      await db.delete(issueTags);
      await db.delete(localTags);
      await db.delete(componentMap);
      await db.delete(issues);
      await db.delete(developersTable);
      await db.delete(syncLog);
      await db.delete(configTable);

      clearJiraApiToken();
      logger.info("Jira configuration reset via API");
      res.json({ success: true, message: "Configuration reset successfully", backup });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
