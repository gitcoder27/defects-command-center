import "dotenv/config";

import { eq } from "drizzle-orm";
import { createApp } from "./app";
import { config } from "./config";
import { rawDb } from "./db/connection";
import { configTable } from "./db/schema";
import { migrate } from "./db/migrate";
import { JiraClient } from "./jira/client";
import { AlertService } from "./services/alert.service";
import { AutomationService } from "./services/automation.service";
import { IssueService } from "./services/issue.service";
import { WorkloadService } from "./services/workload.service";
import { TagService } from "./services/tag.service";
import { TeamTrackerService } from "./services/team-tracker.service";
import { SyncEngine } from "./sync/engine";
import { logger } from "./utils/logger";
import { db } from "./db/connection";
import { clearJiraApiToken, getJiraApiToken, setJiraApiToken } from "./runtime-credentials";

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
  const persistedToken = await getConfig("jira_api_token");
  if (persistedToken) {
    setJiraApiToken(persistedToken);
  } else if (config.JIRA_API_TOKEN) {
    setJiraApiToken(config.JIRA_API_TOKEN);
  } else {
    clearJiraApiToken();
  }

  const jiraBaseUrl = (await getConfig("jira_base_url")) ?? config.JIRA_BASE_URL;
  const jiraEmail = (await getConfig("jira_email")) ?? config.JIRA_EMAIL;
  const jiraProject = (await getConfig("jira_project_key")) ?? config.JIRA_PROJECT_KEY;
  const startupToken = getJiraApiToken();

  if (!jiraBaseUrl || !jiraEmail || !startupToken || !jiraProject) {
    logger.warn("Jira configuration is incomplete. Server will start without sync.");
  }

  const issueJiraClient = new JiraClient(jiraBaseUrl ?? "", jiraEmail ?? "", startupToken);
  const workloadService = new WorkloadService();
  const issueService = new IssueService(issueJiraClient);
  const alertService = new AlertService(workloadService);
  const automationService = new AutomationService(workloadService);
  const syncEngine = new SyncEngine();
  const tagService = new TagService();
  const teamTrackerService = new TeamTrackerService();

  const app = createApp({
    issueService,
    workloadService,
    alertService,
    automationService,
    syncEngine,
    tagService,
    teamTrackerService,
  });

  app.listen(config.PORT, () => {
    logger.info(`Server listening on http://localhost:${config.PORT}`);
  });

  if (Boolean(jiraBaseUrl && jiraEmail && jiraProject && startupToken)) {
    void syncEngine.syncNow();
    syncEngine.start();
  }
}

void bootstrap();
