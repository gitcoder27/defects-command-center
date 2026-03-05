import { beforeEach, describe, expect, it } from "vitest";
import express from "express";
import { AddressInfo } from "node:net";
import { createConfigRouter } from "../src/routes/config";
import { configTable, developers, issues, componentMap, syncLog, issueTags, localTags } from "../src/db/schema";
import { db, rawDb } from "../src/db/connection";
import { clearJiraApiToken, getJiraApiToken, setJiraApiToken } from "../src/runtime-credentials";
import { notFoundHandler, errorHandler } from "../src/middleware/errorHandler";
import { resetDatabase } from "./helpers/db";
import { migrate } from "../src/db/migrate";

beforeEach(async () => {
  migrate(rawDb);
  await resetDatabase();
  clearJiraApiToken();
});

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/config", createConfigRouter());
  app.use(notFoundHandler);
  app.use(errorHandler);

  const server = app.listen(0, "127.0.0.1");
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to start test server");
  }

  const baseUrl = `http://127.0.0.1:${(address as AddressInfo).port}`;
  return {
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
    baseUrl,
  };
}

describe("config routes", () => {
  it("marks setup as configured when token is persisted in DB", async () => {
    await db.insert(configTable).values([
      { key: "jira_base_url", value: "https://tenant.atlassian.net" },
      { key: "jira_email", value: "ops@example.com" },
      { key: "jira_project_key", value: "AM" },
      { key: "jira_lead_account_id", value: "lead-1" },
      { key: "jira_api_token", value: "token-from-db" },
    ]);

    const { baseUrl, close } = createTestApp();
    try {
      const res = await fetch(`${baseUrl}/api/config`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.isConfigured).toBe(true);
      expect(body.jiraApiToken).toBe("****");
    } finally {
      await close();
    }
  });

  it("PUT /api/config/settings stores partial settings and leaves unrelated config intact", async () => {
    await db.insert(configTable).values([
      { key: "jira_base_url", value: "https://tenant.atlassian.net" },
      { key: "jira_email", value: "ops@example.com" },
      { key: "jira_project_key", value: "AM" },
      { key: "jira_lead_account_id", value: "lead-1" },
      { key: "jira_api_token", value: "token-from-db" },
      { key: "jira_sync_jql", value: "project = OLD" },
      { key: "jira_dev_due_date_field", value: "customfield_10020" },
    ]);

    const { baseUrl, close } = createTestApp();
    try {
      const updateRes = await fetch(`${baseUrl}/api/config/settings`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jiraSyncJql: "project = AM AND status != Done",
          jiraDevDueDateField: "customfield_99999",
        }),
      });

      expect(updateRes.status).toBe(200);
      const updateBody = await updateRes.json();
      expect(updateBody.success).toBe(true);

      const rows = await db.select().from(configTable);
      const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

      expect(map["jira_sync_jql"]).toBe("project = AM AND status != Done");
      expect(map["jira_dev_due_date_field"]).toBe("customfield_99999");
      expect(map["jira_base_url"]).toBe("https://tenant.atlassian.net");
      expect(map["jira_project_key"]).toBe("AM");
    } finally {
      await close();
    }
  });

  it("GET /api/config/fields returns 400 when Jira credentials are not available", async () => {
    const { baseUrl, close } = createTestApp();
    try {
      const res = await fetch(`${baseUrl}/api/config/fields`);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.status).toBe(400);
      expect(body.error).toBe("Jira credentials not configured");
    } finally {
      await close();
    }
  });

  it("POST /api/config/reset clears all persisted config and Jira auth state", async () => {
    await db.insert(configTable).values([
      { key: "jira_base_url", value: "https://tenant.atlassian.net" },
      { key: "jira_email", value: "ops@example.com" },
      { key: "jira_project_key", value: "AM" },
      { key: "jira_lead_account_id", value: "lead-1" },
      { key: "jira_api_token", value: "token-from-db" },
    ]);

    await db.insert(developers).values({ accountId: "lead-1", displayName: "Lead", isActive: 1 });
    await db.insert(developers).values({ accountId: "dev-1", displayName: "Dev", isActive: 1 });
    await db.insert(issues).values({
      jiraKey: "AM-1",
      summary: "Sample defect",
      description: null,
      priorityName: "High",
      priorityId: "1",
      statusName: "To Do",
      statusCategory: "new",
      assigneeId: null,
      assigneeName: null,
      reporterName: "ops@example.com",
      component: null,
      labels: "[]",
      dueDate: null,
      flagged: 0,
      createdAt: "2026-03-05T00:00:00.000Z",
      updatedAt: "2026-03-05T00:00:00.000Z",
      syncedAt: "2026-03-05T00:00:00.000Z",
    });
    await db.insert(localTags).values({ name: "Backend", color: "#000000" });
    await db.insert(issueTags).values({ jiraKey: "AM-1", tagId: 1 });
    await db.insert(componentMap).values({ componentName: "API", accountId: "dev-1", fixCount: 2 });
    await db.insert(syncLog).values({ startedAt: "2026-03-05T00:00:00.000Z", status: "success", issuesSynced: 1, completedAt: "2026-03-05T00:00:00.000Z" });

    setJiraApiToken("live-token");
    expect(getJiraApiToken()).toBe("live-token");

    const { baseUrl, close } = createTestApp();
    try {
      const res = await fetch(`${baseUrl}/api/config/reset`, { method: "POST" });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);

      const configRows = await db.select().from(configTable);
      const issueRows = await db.select().from(issues);
      const developerRows = await db.select().from(developers);
      const componentRows = await db.select().from(componentMap);
      const syncRows = await db.select().from(syncLog);
      const issueTagRows = await db.select().from(issueTags);
      const localTagRows = await db.select().from(localTags);

      expect(configRows).toHaveLength(0);
      expect(issueRows).toHaveLength(0);
      expect(developerRows).toHaveLength(0);
      expect(componentRows).toHaveLength(0);
      expect(syncRows).toHaveLength(0);
      expect(issueTagRows).toHaveLength(0);
      expect(localTagRows).toHaveLength(0);
      expect(getJiraApiToken()).toBe("");
    } finally {
      await close();
    }
  });
});
