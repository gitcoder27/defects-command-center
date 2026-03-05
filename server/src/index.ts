import "dotenv/config";
import { eq } from "drizzle-orm";
import { createApp } from "./app";
import { config, hasJiraCredentials } from "./config";
import { rawDb } from "./db/connection";
import { configTable } from "./db/schema";
import { migrate } from "./db/migrate";
import { JiraClient } from "./jira/client";
import { AlertService } from "./services/alert.service";
import { AutomationService } from "./services/automation.service";
import { IssueService } from "./services/issue.service";
import { WorkloadService } from "./services/workload.service";
import { TagService } from "./services/tag.service";
import { SyncEngine } from "./sync/engine";
import { logger } from "./utils/logger";
import { db } from "./db/connection";

async function getConfig(key: string): Promise<string | undefined> {
  const rows = await db.select().from(configTable).where(eq(configTable.key, key)).limit(1);
  return rows[0]?.value;
}

async function bootstrap(): Promise<void> {
  migrate(rawDb);

  if (config.JIRA_BASE_URL) {
    await db.insert(configTable).values({ key: "jira_base_url", value: config.JIRA_BASE_URL }).onConflictDoNothing();
  }
  if (config.JIRA_EMAIL) {
    await db.insert(configTable).values({ key: "jira_email", value: config.JIRA_EMAIL }).onConflictDoNothing();
  }
  if (config.JIRA_PROJECT_KEY) {
    await db.insert(configTable).values({ key: "jira_project_key", value: config.JIRA_PROJECT_KEY }).onConflictDoNothing();
  }

  const jiraBaseUrl = (await getConfig("jira_base_url")) ?? config.JIRA_BASE_URL;
  const jiraEmail = (await getConfig("jira_email")) ?? config.JIRA_EMAIL;
  const jiraProject = (await getConfig("jira_project_key")) ?? config.JIRA_PROJECT_KEY;

  if (!jiraBaseUrl || !jiraEmail || !config.JIRA_API_TOKEN || !jiraProject) {
    logger.warn("Jira configuration is incomplete. Server will start without sync.");
  }

  const jiraClient = new JiraClient(jiraBaseUrl ?? "", jiraEmail ?? "", config.JIRA_API_TOKEN ?? "");
  const workloadService = new WorkloadService();
  const issueService = new IssueService(jiraClient);
  const alertService = new AlertService(workloadService);
  const automationService = new AutomationService(workloadService);
  const syncEngine = new SyncEngine(jiraClient);
  const tagService = new TagService();

  const app = createApp({
    issueService,
    workloadService,
    alertService,
    automationService,
    syncEngine,
    tagService,
  });

  app.listen(config.PORT, () => {
    logger.info(`Server listening on http://localhost:${config.PORT}`);
  });

  if (hasJiraCredentials()) {
    void syncEngine.syncNow();
    syncEngine.start();
  }
}

void bootstrap();
