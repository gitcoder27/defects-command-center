import { beforeEach, describe, expect, it } from "vitest";
import express from "express";
import { Readable, Writable } from "node:stream";
import { and, eq } from "drizzle-orm";
import { db, rawDb } from "../src/db/connection";
import { migrate } from "../src/db/migrate";
import { issueTags, issues, localTags } from "../src/db/schema";
import { errorHandler, notFoundHandler } from "../src/middleware/errorHandler";
import { createTagsRouter } from "../src/routes/tags";
import { TagService } from "../src/services/tag.service";
import { resetDatabase } from "./helpers/db";

beforeEach(async () => {
  migrate(rawDb);
  await resetDatabase();
});

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/tags", createTagsRouter(new TagService()));
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
      if (options.body !== undefined) {
        this.push(JSON.stringify(options.body));
      }
      this.push(null);
    },
  }) as Readable & {
    url: string;
    method: string;
    headers: Record<string, string>;
    connection: Record<string, never>;
    socket: Record<string, never>;
    httpVersion: string;
    httpVersionMajor: number;
    httpVersionMinor: number;
  };

  req.url = options.url;
  req.method = options.method;
  req.headers = { "content-type": "application/json" };
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

async function seedTagFixture() {
  await db.insert(issues).values([
    {
      jiraKey: "AM-1",
      summary: "Checkout button fails",
      description: null,
      aspenSeverity: null,
      priorityName: "High",
      priorityId: "2",
      statusName: "To Do",
      statusCategory: "new",
      assigneeId: "dev-1",
      assigneeName: "Taylor Dev",
      reporterName: "Morgan Manager",
      component: "Checkout",
      labels: "[]",
      dueDate: null,
      developmentDueDate: null,
      flagged: 0,
      createdAt: "2026-03-08T09:00:00.000Z",
      updatedAt: "2026-03-10T09:00:00.000Z",
      syncedAt: "2026-03-10T09:00:00.000Z",
      analysisNotes: null,
      excluded: 0,
    },
    {
      jiraKey: "AM-2",
      summary: "Profile image upload times out",
      description: null,
      aspenSeverity: null,
      priorityName: "Medium",
      priorityId: "3",
      statusName: "In Progress",
      statusCategory: "indeterminate",
      assigneeId: "dev-2",
      assigneeName: "Jordan Dev",
      reporterName: "Morgan Manager",
      component: "Profile",
      labels: "[]",
      dueDate: null,
      developmentDueDate: null,
      flagged: 0,
      createdAt: "2026-03-07T09:00:00.000Z",
      updatedAt: "2026-03-09T09:00:00.000Z",
      syncedAt: "2026-03-10T09:00:00.000Z",
      analysisNotes: null,
      excluded: 0,
    },
  ]);

  const insertedTags = await db
    .insert(localTags)
    .values([
      { name: "Legacy", color: "#ef4444" },
      { name: "Unused", color: "#22c55e" },
    ])
    .returning();

  await db.insert(issueTags).values([
    { jiraKey: "AM-1", tagId: insertedTags[0]!.id },
    { jiraKey: "AM-2", tagId: insertedTags[0]!.id },
  ]);

  return {
    inUseTagId: insertedTags[0]!.id,
    unusedTagId: insertedTags[1]!.id,
  };
}

describe("tags routes", () => {
  it("returns usage details for a tag", async () => {
    const { inUseTagId } = await seedTagFixture();
    const app = createTestApp();

    const res = await invoke(app, { method: "GET", url: `/api/tags/${inUseTagId}/usage` });

    expect(res.status).toBe(200);
    expect(res.body?.tag.name).toBe("Legacy");
    expect(res.body?.issueCount).toBe(2);
    expect(res.body?.issues.map((issue: { jiraKey: string }) => issue.jiraKey)).toEqual(["AM-1", "AM-2"]);
  });

  it("deletes an unused tag immediately", async () => {
    const { unusedTagId } = await seedTagFixture();
    const app = createTestApp();

    const res = await invoke(app, { method: "DELETE", url: `/api/tags/${unusedTagId}` });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, removedIssueCount: 0 });

    const remainingTags = await db.select().from(localTags);
    expect(remainingTags.map((tag) => tag.name)).toEqual(["Legacy"]);
  });

  it("rejects deleting an in-use tag without force", async () => {
    const { inUseTagId } = await seedTagFixture();
    const app = createTestApp();

    const res = await invoke(app, { method: "DELETE", url: `/api/tags/${inUseTagId}` });

    expect(res.status).toBe(409);
    expect(res.body?.usage?.issueCount).toBe(2);

    const remainingTags = await db.select().from(localTags);
    expect(remainingTags).toHaveLength(2);
    const remainingLinks = await db.select().from(issueTags).where(eq(issueTags.tagId, inUseTagId));
    expect(remainingLinks).toHaveLength(2);
  });

  it("deletes an in-use tag when force=true", async () => {
    const { inUseTagId } = await seedTagFixture();
    const app = createTestApp();

    const res = await invoke(app, { method: "DELETE", url: `/api/tags/${inUseTagId}?force=true` });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, removedIssueCount: 2 });

    const remainingTags = await db.select().from(localTags);
    expect(remainingTags.map((tag) => tag.name)).toEqual(["Unused"]);
    const remainingLinks = await db.select().from(issueTags).where(eq(issueTags.tagId, inUseTagId));
    expect(remainingLinks).toHaveLength(0);
  });

  it("counts unsynced issue assignments in usage and delete responses", async () => {
    const insertedTags = await db
      .insert(localTags)
      .values([{ name: "Needs Sync", color: "#f97316" }])
      .returning();
    const tagId = insertedTags[0]!.id;

    rawDb.pragma("foreign_keys = OFF");
    try {
      rawDb.prepare("INSERT INTO issue_tags (jira_key, tag_id) VALUES (?, ?)").run("AM-999", tagId);
    } finally {
      rawDb.pragma("foreign_keys = ON");
    }

    const app = createTestApp();

    const usageRes = await invoke(app, { method: "GET", url: `/api/tags/${tagId}/usage` });
    expect(usageRes.status).toBe(200);
    expect(usageRes.body).toMatchObject({
      tag: { id: tagId, name: "Needs Sync", color: "#f97316" },
      issueCount: 1,
      issues: [],
    });

    const blockedDeleteRes = await invoke(app, { method: "DELETE", url: `/api/tags/${tagId}` });
    expect(blockedDeleteRes.status).toBe(409);
    expect(blockedDeleteRes.body?.usage?.issueCount).toBe(1);

    const forcedDeleteRes = await invoke(app, { method: "DELETE", url: `/api/tags/${tagId}?force=true` });
    expect(forcedDeleteRes.status).toBe(200);
    expect(forcedDeleteRes.body).toEqual({ success: true, removedIssueCount: 1 });

    const remainingLinks = await db.select().from(issueTags).where(eq(issueTags.tagId, tagId));
    expect(remainingLinks).toHaveLength(0);
    const remainingTag = await db.select().from(localTags).where(eq(localTags.id, tagId));
    expect(remainingTag).toHaveLength(0);
  });

  it("de-duplicates repeated tag ids when setting issue tags", async () => {
    const { unusedTagId } = await seedTagFixture();
    const service = new TagService();

    const tags = await service.setIssueTags("AM-1", [unusedTagId, unusedTagId]);
    expect(tags).toEqual([
      {
        id: unusedTagId,
        name: "Unused",
        color: "#22c55e",
      },
    ]);

    const usage = await service.getUsage(unusedTagId);
    expect(usage?.issueCount).toBe(1);
    expect(usage?.issues.map((issue) => issue.jiraKey)).toEqual(["AM-1"]);

    const links = await db
      .select()
      .from(issueTags)
      .where(and(eq(issueTags.jiraKey, "AM-1"), eq(issueTags.tagId, unusedTagId)));
    expect(links).toHaveLength(1);
  });
});
