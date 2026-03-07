import { beforeEach, describe, expect, it } from "vitest";
import express from "express";
import { Readable, Writable } from "node:stream";
import { createTeamTrackerRouter } from "../src/routes/team-tracker";
import { TeamTrackerService } from "../src/services/team-tracker.service";
import { notFoundHandler, errorHandler } from "../src/middleware/errorHandler";
import { resetDatabase, db } from "./helpers/db";
import { developers, issues } from "../src/db/schema";

const trackerService = new TeamTrackerService();

async function seedDevelopers() {
  await db.insert(developers).values([
    { accountId: "dev-1", displayName: "Alice Smith", email: null, avatarUrl: null, isActive: 1 },
    { accountId: "dev-2", displayName: "Bob Jones", email: null, avatarUrl: null, isActive: 0 },
  ]);
}

async function seedIssue(jiraKey = "AM-123") {
  await db.insert(issues).values({
    jiraKey,
    summary: "Linked Jira task",
    description: null,
    aspenSeverity: null,
    priorityName: "High",
    priorityId: "1",
    statusName: "In Progress",
    statusCategory: "indeterminate",
    assigneeId: "dev-1",
    assigneeName: "Alice Smith",
    teamScopeState: "in_team",
    syncScopeState: "active",
    reporterName: "Lead",
    component: null,
    labels: JSON.stringify([]),
    dueDate: "2026-03-10",
    developmentDueDate: "2026-03-08",
    flagged: 0,
    createdAt: "2026-03-07T08:00:00.000Z",
    updatedAt: "2026-03-07T08:00:00.000Z",
    syncedAt: "2026-03-07T08:00:00.000Z",
    lastSeenInScopedSyncAt: "2026-03-07T08:00:00.000Z",
    lastReconciledAt: "2026-03-07T08:00:00.000Z",
    scopeChangedAt: null,
    analysisNotes: null,
    excluded: 0,
  });
}

function createTestApp() {
  const app = express();
  app.use("/api/team-tracker", createTeamTrackerRouter(trackerService));
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

describe("team tracker routes", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedDevelopers();
  });

  it("GET /api/team-tracker returns only active developers", async () => {
    const app = createTestApp();

    const res = await invoke(app, {
      method: "GET",
      url: "/api/team-tracker?date=2026-03-07",
    });

    expect(res.status).toBe(200);
    expect(res.body?.developers).toHaveLength(1);
    expect(res.body?.developers[0]?.developer.accountId).toBe("dev-1");
  });

  it("POST /api/team-tracker/:accountId/items rejects Jira items without jiraKey", async () => {
    const app = createTestApp();

    const res = await invoke(app, {
      method: "POST",
      url: "/api/team-tracker/dev-1/items",
      body: {
        date: "2026-03-07",
        itemType: "jira",
        title: "Linked Jira task",
      },
    });

    expect(res.status).toBe(400);
    expect(res.body?.error).toContain("jiraKey is required for Jira items");
  });

  it("POST /api/team-tracker/:accountId/items rejects Jira keys missing from synced issues", async () => {
    const app = createTestApp();

    const res = await invoke(app, {
      method: "POST",
      url: "/api/team-tracker/dev-1/items",
      body: {
        date: "2026-03-07",
        itemType: "jira",
        jiraKey: "AM-999",
        title: "Linked Jira task",
      },
    });

    expect(res.status).toBe(400);
    expect(res.body?.error).toBe(
      "Jira issue AM-999 is not available in synced issues"
    );
  });

  it("POST /api/team-tracker/:accountId/items rejects duplicate Jira issues already planned for the day", async () => {
    await seedIssue();
    await trackerService.addItem("dev-1", "2026-03-07", {
      itemType: "jira",
      jiraKey: "AM-123",
      title: "Linked Jira task",
    });

    const app = createTestApp();
    const res = await invoke(app, {
      method: "POST",
      url: "/api/team-tracker/dev-1/items",
      body: {
        date: "2026-03-07",
        itemType: "jira",
        jiraKey: "AM-123",
        title: "Linked Jira task",
      },
    });

    expect(res.status).toBe(409);
    expect(res.body?.error).toBe(
      "Jira issue AM-123 is already planned for Alice Smith on 2026-03-07"
    );
  });

  it("GET /api/team-tracker/issues/:jiraKey/assignment returns the current assignment", async () => {
    await seedIssue();
    const item = await trackerService.addItem("dev-1", "2026-03-07", {
      itemType: "jira",
      jiraKey: "AM-123",
      title: "Linked Jira task",
    });

    const app = createTestApp();
    const res = await invoke(app, {
      method: "GET",
      url: "/api/team-tracker/issues/AM-123/assignment?date=2026-03-07",
    });

    expect(res.status).toBe(200);
    expect(res.body?.assignment).toEqual({
      date: "2026-03-07",
      jiraKey: "AM-123",
      itemId: item.id,
      title: "Linked Jira task",
      state: "planned",
      developer: {
        accountId: "dev-1",
        displayName: "Alice Smith",
        email: undefined,
        avatarUrl: undefined,
        isActive: true,
      },
    });
  });

  it("GET /api/team-tracker/carry-forward-preview reports remaining carryable items", async () => {
    await seedIssue();
    await trackerService.addItem("dev-1", "2026-03-06", {
      itemType: "jira",
      jiraKey: "AM-123",
      title: "Linked Jira task",
    });
    await trackerService.addItem("dev-1", "2026-03-06", {
      itemType: "custom",
      title: "Write release notes",
    });
    await trackerService.addItem("dev-1", "2026-03-07", {
      itemType: "jira",
      jiraKey: "AM-123",
      title: "Linked Jira task",
    });

    const app = createTestApp();
    const res = await invoke(app, {
      method: "GET",
      url: "/api/team-tracker/carry-forward-preview?fromDate=2026-03-06&toDate=2026-03-07",
    });

    expect(res.status).toBe(200);
    expect(res.body?.carryable).toBe(1);
  });
});
