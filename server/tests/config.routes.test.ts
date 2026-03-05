import { beforeEach, describe, expect, it } from "vitest";
import express from "express";
import { Readable, Writable } from "node:stream";
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
  app.use("/api/config", createConfigRouter());
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

async function invoke(
  app: express.Express,
  options: { method: string; url: string; body?: unknown }
): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = {};
  const chunks: Buffer[] = [];

  const req = new Readable({
    read() {
      this.push(null);
    },
  }) as Readable & {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: unknown;
    connection: Record<string, never>;
    socket: Record<string, never>;
    httpVersion: string;
    httpVersionMajor: number;
    httpVersionMinor: number;
  };

  req.url = options.url;
  req.method = options.method;
  req.headers = { "content-type": "application/json" };
  req.body = options.body;
  req.connection = {};
  req.socket = {};
  req.httpVersion = "1.1";
  req.httpVersionMajor = 1;
  req.httpVersionMinor = 1;

  return await new Promise((resolve, reject) => {
    const res = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        callback();
      },
    }) as Writable & {
      statusCode: number;
      req?: typeof req;
      setHeader: (name: string, value: string | number | readonly string[]) => void;
      getHeader: (name: string) => string | number | readonly string[] | undefined;
      getHeaders: () => Record<string, string>;
      removeHeader: (name: string) => void;
      writeHead: (statusCode: number, responseHeaders?: Record<string, string>) => typeof res;
      end: (chunk?: unknown) => typeof res;
    };

    res.statusCode = 200;
    res.req = req;
    res.setHeader = (name, value) => {
      headers[name.toLowerCase()] = Array.isArray(value) ? value.join(",") : String(value);
    };
    res.getHeader = (name) => headers[name.toLowerCase()];
    res.getHeaders = () => headers;
    res.removeHeader = (name) => {
      delete headers[name.toLowerCase()];
    };
    res.writeHead = (statusCode, responseHeaders = {}) => {
      res.statusCode = statusCode;
      for (const [name, value] of Object.entries(responseHeaders)) {
        headers[name.toLowerCase()] = value;
      }
      return res;
    };
    res.end = (chunk) => {
      if (chunk !== undefined) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      }
      const rawBody = Buffer.concat(chunks).toString("utf8");
      resolve({
        status: res.statusCode,
        body: rawBody ? JSON.parse(rawBody) : undefined,
      });
      return res;
    };

    app.handle(req as any, res as any, reject);
  });
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

    const app = createTestApp();
    const res = await invoke(app, { method: "GET", url: "/api/config" });
    expect(res.status).toBe(200);
    expect(res.body?.isConfigured).toBe(true);
    expect(res.body?.jiraApiToken).toBe("****");
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

    const app = createTestApp();
    const updateRes = await invoke(app, {
      method: "PUT",
      url: "/api/config/settings",
      body: {
        jiraSyncJql: "project = AM AND status != Done",
        jiraDevDueDateField: "customfield_99999",
      },
    });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body?.success).toBe(true);

    const rows = await db.select().from(configTable);
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    expect(map["jira_sync_jql"]).toBe("project = AM AND status != Done");
    expect(map["jira_dev_due_date_field"]).toBe("customfield_99999");
    expect(map["jira_base_url"]).toBe("https://tenant.atlassian.net");
    expect(map["jira_project_key"]).toBe("AM");
  });

  it("GET /api/config/fields returns 400 when Jira credentials are not available", async () => {
    const app = createTestApp();
    const res = await invoke(app, { method: "GET", url: "/api/config/fields" });
    expect(res.status).toBe(400);
    expect(res.body?.status).toBe(400);
    expect(res.body?.error).toBe("Jira credentials not configured");
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
    const insertedTags = await db.insert(localTags).values({ name: "Backend", color: "#000000" }).returning({ id: localTags.id });
    await db.insert(issueTags).values({ jiraKey: "AM-1", tagId: insertedTags[0]!.id });
    await db.insert(componentMap).values({ componentName: "API", accountId: "dev-1", fixCount: 2 });
    await db.insert(syncLog).values({ startedAt: "2026-03-05T00:00:00.000Z", status: "success", issuesSynced: 1, completedAt: "2026-03-05T00:00:00.000Z" });

    setJiraApiToken("live-token");
    expect(getJiraApiToken()).toBe("live-token");

    const app = createTestApp();
    const res = await invoke(app, { method: "POST", url: "/api/config/reset" });
    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);

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
  });
});
