import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/connection";
import { appUsers, configTable, developers as developersTable, issues, syncLog, componentMap, issueScopeHistory, issueTags, localTags } from "../db/schema";
import { validate } from "../middleware/validate";
import { JiraClient } from "../jira/client";
import { stripManagedAssigneeClause } from "../jira/jql";
import { config } from "../config";
import { clearJiraApiToken, getJiraApiToken } from "../runtime-credentials";
import { BackupService } from "../services/backup.service";
import { getPersistedJiraApiToken, storeJiraApiToken } from "../services/jira-credentials.service";
import { SettingsService } from "../services/settings.service";
import { WorkspaceMaintenanceService } from "../services/workspace-maintenance.service";
import { SyncEngine } from "../sync/engine";
import { logger } from "../utils/logger";
import { HttpError } from "../middleware/errorHandler";
import { runInTransaction } from "../db/transaction";

const configSchema = z.object({
  body: z.object({
    jiraBaseUrl: z.string().url(),
    jiraEmail: z.string().email(),
    jiraProjectKey: z.string().min(1),
    managerJiraAccountId: z.string().trim().optional(),
    jiraApiToken: z.string().trim().min(1).optional(),
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
    jiraApiToken: z.string().trim().min(1).optional(),
    jiraProjectKey: z.string().min(1).optional(),
  }),
  params: z.any().optional(),
  query: z.any().optional(),
});

async function upsertConfig(key: string, value: string): Promise<void> {
  await db.insert(configTable).values({ key, value }).onConflictDoUpdate({ target: configTable.key, set: { value } });
}

async function deleteConfigValue(key: string): Promise<void> {
  await db.delete(configTable).where(eq(configTable.key, key));
}

async function getConfigValue(key: string): Promise<string | undefined> {
  const rows = await db.select().from(configTable).where(eq(configTable.key, key)).limit(1);
  return rows[0]?.value;
}

async function getStoredManagerJiraAccountId(): Promise<string> {
  return (await getConfigValue("manager_jira_account_id")) ??
    (await getConfigValue("jira_lead_account_id")) ??
    "";
}

function normalizeManagerJiraAccountId(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }
  if (!/^[A-Za-z0-9:-]+$/.test(trimmed)) {
    throw new Error("managerJiraAccountId must use a valid Jira account id");
  }
  return trimmed;
}

function validateJiraBaseUrl(value: string): void {
  const parsed = new URL(value);
  const allowedHosts = process.env.JIRA_ALLOWED_HOSTS
    ?.split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  const hostname = parsed.hostname.toLowerCase();

  if (parsed.protocol !== "https:" && !(config.NODE_ENV !== "production" && ["http:", "https:"].includes(parsed.protocol))) {
    throw new HttpError(400, "Jira base URL must use https");
  }

  if (config.NODE_ENV === "production" && parsed.protocol !== "https:") {
    throw new HttpError(400, "Jira base URL must use https in production");
  }

  if (allowedHosts && allowedHosts.length > 0 && !allowedHosts.includes(hostname)) {
    throw new HttpError(400, "Jira base URL host is not in JIRA_ALLOWED_HOSTS");
  }
}

async function testJiraConnection(baseUrl: string, email: string, token: string): Promise<{ displayName?: string; accountId?: string }> {
  const client = new JiraClient(baseUrl, email, token);
  const user = await client.getCurrentUser();
  return { displayName: user.displayName, accountId: user.accountId };
}

export function createConfigRouter(syncEngine?: SyncEngine, backupService?: BackupService): Router {
  const settings = new SettingsService();
  const maintenance = new WorkspaceMaintenanceService(settings, backupService);
  const router = Router();

  const maintenanceResetSchema = z.object({
    body: z.object({
      target: z.enum(["manager_desk", "team_tracker", "workspace"]),
      confirmationText: z.string().trim().min(1),
    }),
    params: z.any().optional(),
    query: z.any().optional(),
  });

  const expectedConfirmationText: Record<
    "manager_desk" | "team_tracker" | "workspace",
    string
  > = {
    manager_desk: "CLEAR MANAGER DESK",
    team_tracker: "CLEAR TEAM TRACKER",
    workspace: "CLEAR EVERYTHING",
  };

  router.get("/", async (_req, res, next) => {
    try {
      const jiraBaseUrl = (await getConfigValue("jira_base_url")) ?? config.JIRA_BASE_URL ?? "";
      const jiraEmail = (await getConfigValue("jira_email")) ?? config.JIRA_EMAIL ?? "";
      const jiraProjectKey = (await getConfigValue("jira_project_key")) ?? config.JIRA_PROJECT_KEY ?? "";
      const managerJiraAccountId = await getStoredManagerJiraAccountId();
      const jiraApiToken = (await getPersistedJiraApiToken()) || getJiraApiToken() || config.JIRA_API_TOKEN || "";
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
      const managerRows = await db
        .select({ id: appUsers.id })
        .from(appUsers)
        .where(eq(appUsers.role, "manager"))
        .limit(1);
      const hasManagerWorkspace = Boolean(managerRows[0]);
      const hasJiraConnection = Boolean(jiraBaseUrl && jiraEmail && jiraProjectKey && jiraApiToken);

      res.json({
        jiraBaseUrl,
        jiraEmail,
        jiraProjectKey,
        managerJiraAccountId,
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
        isConfigured: hasManagerWorkspace || hasJiraConnection,
      });
    } catch (error) {
      next(error);
    }
  });

  router.put("/", validate(configSchema), async (req, res, next) => {
    try {
      const syncIntervalMs = req.body.syncIntervalMs ?? 300000;
      const staleThresholdHours = req.body.staleThresholdHours ?? 48;
      validateJiraBaseUrl(req.body.jiraBaseUrl);
      const tokenForLookup = req.body.jiraApiToken ?? (await getPersistedJiraApiToken()) ?? getJiraApiToken() ?? config.JIRA_API_TOKEN;
      const managerJiraAccountId = normalizeManagerJiraAccountId(req.body.managerJiraAccountId);

      if (req.body.jiraApiToken) {
        await storeJiraApiToken(req.body.jiraApiToken);
      }

      await upsertConfig("jira_base_url", req.body.jiraBaseUrl);
      await upsertConfig("jira_email", req.body.jiraEmail);
      await upsertConfig("jira_project_key", req.body.jiraProjectKey);
      if ("managerJiraAccountId" in req.body) {
        if (managerJiraAccountId) {
          await upsertConfig("manager_jira_account_id", managerJiraAccountId);
        } else {
          await deleteConfigValue("manager_jira_account_id");
        }
        await deleteConfigValue("jira_lead_account_id");
      }
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
        await settings.validateBackupDirectory(req.body.backupDirectory);
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
      validateJiraBaseUrl(req.body.jiraBaseUrl);
      const token = req.body.jiraApiToken ?? (await getPersistedJiraApiToken()) ?? getJiraApiToken() ?? config.JIRA_API_TOKEN;
      if (!token) {
        throw new HttpError(400, "Jira API token is required");
      }
      const user = await testJiraConnection(req.body.jiraBaseUrl, req.body.jiraEmail, token);
      res.json({ success: true, checkedAt: new Date().toISOString(), user });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to connect to Jira";
      res.status(400).json({ error: message, status: 400 });
    }
  });

  router.get("/connection-health", async (_req, res, next) => {
    try {
      const baseUrl = (await getConfigValue("jira_base_url")) ?? config.JIRA_BASE_URL;
      const email = (await getConfigValue("jira_email")) ?? config.JIRA_EMAIL;
      const token = (await getPersistedJiraApiToken()) || getJiraApiToken() || config.JIRA_API_TOKEN;
      if (!baseUrl || !email || !token) {
        res.status(400).json({ error: "Jira credentials not configured", status: 400 });
        return;
      }

      const user = await testJiraConnection(baseUrl, email, token);
      res.json({ success: true, checkedAt: new Date().toISOString(), user });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to connect to Jira";
      res.status(400).json({ error: message, status: 400 });
    }
  });

  // Discover custom fields from Jira (for settings page)
  router.get("/fields", async (_req, res, next) => {
    try {
      const baseUrl = (await getConfigValue("jira_base_url")) ?? config.JIRA_BASE_URL;
      const email = (await getConfigValue("jira_email")) ?? config.JIRA_EMAIL;
      const token = (await getPersistedJiraApiToken()) || getJiraApiToken() || config.JIRA_API_TOKEN;
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
      managerJiraAccountId: z.string().trim().optional(),
      jiraApiToken: z.string().trim().optional(),
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
      if (req.body.jiraApiToken !== undefined) {
        const trimmedToken = req.body.jiraApiToken.trim();
        if (trimmedToken) {
          await storeJiraApiToken(trimmedToken);
        }
      }
      if ("managerJiraAccountId" in req.body) {
        const managerJiraAccountId = normalizeManagerJiraAccountId(req.body.managerJiraAccountId);
        if (managerJiraAccountId) {
          await upsertConfig("manager_jira_account_id", managerJiraAccountId);
        } else {
          await deleteConfigValue("manager_jira_account_id");
        }
        await deleteConfigValue("jira_lead_account_id");
      }
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  router.get("/maintenance/reset-preview", async (req, res, next) => {
    try {
      const preview = await maintenance.getResetPreview(req.auth!.user.accountId);
      res.json(preview);
    } catch (error) {
      next(error);
    }
  });

  router.post(
    "/maintenance/reset",
    validate(maintenanceResetSchema),
    async (req, res, next) => {
      try {
        const target = req.body.target as keyof typeof expectedConfirmationText;
        const expectedText = expectedConfirmationText[target];
        if (req.body.confirmationText.trim().toUpperCase() !== expectedText) {
          throw new HttpError(400, `Type "${expectedText}" to confirm this reset`);
        }

        const result = await maintenance.reset(
          req.auth!.user.accountId,
          target
        );
        logger.info(
          {
            managerAccountId: req.auth!.user.accountId,
            target,
          },
          "Workspace maintenance reset completed"
        );
        res.json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  router.post("/reset", async (_req, res, next) => {
    try {
      const backup = await backupService?.createPreResetBackup();
      syncEngine?.stop();
      await runInTransaction(async () => {
        await db.delete(issueScopeHistory);
        await db.delete(issueTags);
        await db.delete(localTags);
        await db.delete(componentMap);
        await db.delete(issues);
        await db.delete(developersTable);
        await db.delete(syncLog);
        await db.delete(configTable);
      });

      clearJiraApiToken();
      logger.info("Jira configuration reset via API");
      res.json({ success: true, message: "Configuration reset successfully", backup });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
