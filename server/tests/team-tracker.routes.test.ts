import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import { eq } from "drizzle-orm";
import { Readable, Writable } from "node:stream";
import { createTeamTrackerRouter } from "../src/routes/team-tracker";
import { ManagerDeskService } from "../src/services/manager-desk.service";
import { TeamTrackerService } from "../src/services/team-tracker.service";
import { notFoundHandler, errorHandler } from "../src/middleware/errorHandler";
import { resetDatabase, db } from "./helpers/db";
import { developers, issues, managerDeskItems } from "../src/db/schema";

const trackerService = new TeamTrackerService();
const managerDeskService = new ManagerDeskService(trackerService);

async function seedDevelopers() {
  await db.insert(developers).values([
    { accountId: "dev-1", displayName: "Alice Smith", email: null, avatarUrl: null, isActive: 1 },
    { accountId: "dev-2", displayName: "Bob Jones", email: null, avatarUrl: null, isActive: 0 },
  ]);
}

async function seedIssue(
  jiraKey = "AM-123",
  overrides: Partial<typeof issues.$inferInsert> = {}
) {
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
    ...overrides,
  });
}

function createTestApp() {
  const app = express();
  app.use((req, _res, next) => {
    req.auth = {
      sessionId: "test-session",
      user: {
        username: "manager",
        accountId: "manager-1",
        displayName: "Manager One",
        role: "manager",
      },
    };
    next();
  });
  app.use(
    "/api/team-tracker",
    createTeamTrackerRouter(trackerService, managerDeskService)
  );
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
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-07T08:00:00.000Z"));
    await resetDatabase();
    await seedDevelopers();
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it("GET /api/team-tracker returns a ranked attention queue", async () => {
    await db.insert(developers).values([
      { accountId: "dev-3", displayName: "Cara Diaz", email: null, avatarUrl: null, isActive: 1 },
      { accountId: "dev-4", displayName: "Derek Long", email: null, avatarUrl: null, isActive: 1 },
      { accountId: "dev-5", displayName: "Evan Park", email: null, avatarUrl: null, isActive: 1 },
      { accountId: "dev-6", displayName: "Fiona West", email: null, avatarUrl: null, isActive: 1 },
    ]);
    await seedIssue("AM-123", {
      developmentDueDate: "2026-03-06",
      dueDate: "2026-03-09",
    });

    await trackerService.updateDay("dev-1", "2026-03-07", { status: "blocked" });
    await trackerService.updateDay("dev-3", "2026-03-07", { status: "at_risk" });
    await trackerService.updateDay("dev-4", "2026-03-07", { status: "waiting" });
    await trackerService.addCheckIn("dev-4", "2026-03-07", { summary: "Waiting on QA handoff" });
    const waitingItem = await trackerService.addItem("dev-4", "2026-03-07", {
      title: "Follow up with QA",
    });
    await trackerService.setCurrentItem(waitingItem.id);
    const overdueItem = await trackerService.addItem("dev-1", "2026-03-07", {
      jiraKey: "AM-123",
      title: "Linked Jira task",
    });
    await trackerService.setCurrentItem(overdueItem.id);

    await trackerService.addCheckIn("dev-6", "2026-03-07", { summary: "Planning next work" });
    vi.setSystemTime(new Date("2026-03-07T12:00:00.000Z"));

    const app = createTestApp();
    const res = await invoke(app, {
      method: "GET",
      url: "/api/team-tracker?date=2026-03-07",
    });

    expect(res.status).toBe(200);
    expect(res.body?.attentionQueue.map((item: any) => item.developer.accountId)).toEqual([
      "dev-1",
      "dev-3",
      "dev-4",
      "dev-5",
      "dev-6",
    ]);
    expect(res.body?.attentionQueue[0]?.reasons.map((reason: any) => reason.code)).toEqual([
      "blocked",
      "stale_with_open_risk",
      "overdue_linked_work",
      "status_change_without_follow_up",
    ]);
    expect(res.body?.attentionQueue[2]?.reasons.map((reason: any) => reason.code)).toEqual([
      "stale_with_open_risk",
      "waiting",
    ]);
    expect(res.body?.attentionQueue[0]?.signals?.risk?.overdueLinkedWork).toBe(true);
  });

  it("PATCH /api/team-tracker/:accountId/day updates capacity", async () => {
    const app = createTestApp();

    const res = await invoke(app, {
      method: "PATCH",
      url: "/api/team-tracker/dev-1/day",
      body: {
        date: "2026-03-07",
        capacityUnits: 4,
      },
    });

    expect(res.status).toBe(200);
    expect(res.body?.capacityUnits).toBe(4);
  });

  it("POST /api/team-tracker/:accountId/items supports unlinked descriptive tasks", async () => {
    const app = createTestApp();

    const res = await invoke(app, {
      method: "POST",
      url: "/api/team-tracker/dev-1/items",
      body: {
        date: "2026-03-07",
        title: "Investigate login regression",
      },
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      lifecycle: "tracker_only",
      itemType: "custom",
      title: "Investigate login regression",
    });
  });

  it("POST /api/team-tracker/:accountId/items rejects Jira keys missing from synced issues", async () => {
    const app = createTestApp();

    const res = await invoke(app, {
      method: "POST",
      url: "/api/team-tracker/dev-1/items",
      body: {
        date: "2026-03-07",
        jiraKey: "AM-999",
        title: "Linked Jira task",
      },
    });

    expect(res.status).toBe(400);
    expect(res.body?.error).toBe(
      "Jira issue AM-999 is not available in synced issues"
    );
  });

  it("POST /api/team-tracker/:accountId/items allows multiple descriptive tasks for the same Jira issue", async () => {
    await seedIssue();
    await trackerService.addItem("dev-1", "2026-03-07", {
      jiraKey: "AM-123",
      title: "Reproduce the customer report",
    });

    const app = createTestApp();
    const res = await invoke(app, {
      method: "POST",
      url: "/api/team-tracker/dev-1/items",
      body: {
        date: "2026-03-07",
        jiraKey: "AM-123",
        title: "Patch the validation path",
      },
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      jiraKey: "AM-123",
      jiraSummary: "Linked Jira task",
      title: "Patch the validation path",
    });
  });

  it("GET /api/team-tracker/issues/:jiraKey/assignment returns active linked tasks", async () => {
    await seedIssue();
    const firstItem = await trackerService.addItem("dev-1", "2026-03-07", {
      jiraKey: "AM-123",
      title: "Reproduce the customer report",
    });
    const secondItem = await trackerService.addItem("dev-1", "2026-03-07", {
      jiraKey: "AM-123",
      title: "Patch the validation path",
    });

    const app = createTestApp();
    const res = await invoke(app, {
      method: "GET",
      url: "/api/team-tracker/issues/AM-123/assignment?date=2026-03-07",
    });

    expect(res.status).toBe(200);
    expect(res.body?.assignments).toEqual([
      {
        date: "2026-03-07",
        jiraKey: "AM-123",
        itemId: firstItem.id,
        title: "Reproduce the customer report",
        state: "planned",
        developer: {
          accountId: "dev-1",
          displayName: "Alice Smith",
          email: undefined,
          avatarUrl: undefined,
          isActive: true,
        },
      },
      {
        date: "2026-03-07",
        jiraKey: "AM-123",
        itemId: secondItem.id,
        title: "Patch the validation path",
        state: "planned",
        developer: {
          accountId: "dev-1",
          displayName: "Alice Smith",
          email: undefined,
          avatarUrl: undefined,
          isActive: true,
        },
      },
    ]);
  });

  it("GET /api/team-tracker/issues/:jiraKey/assignment returns an empty list when no assignment exists", async () => {
    await seedIssue("AM-35627");

    const app = createTestApp();
    const res = await invoke(app, {
      method: "GET",
      url: "/api/team-tracker/issues/AM-35627/assignment?date=2026-03-09",
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ assignments: [] });
  });

  it("GET /api/team-tracker/carry-forward-preview reports remaining carryable items", async () => {
    await seedIssue();
    await trackerService.addItem("dev-1", "2026-03-06", {
      jiraKey: "AM-123",
      title: "Linked Jira task",
    });
    await managerDeskService.createItem("manager-1", {
      date: "2026-03-06",
      title: "Manager follow-up",
      status: "planned",
      assigneeDeveloperAccountId: "dev-1",
    });
    await trackerService.addItem("dev-1", "2026-03-06", {
      title: "Write release notes",
    });
    await trackerService.addItem("dev-1", "2026-03-07", {
      jiraKey: "AM-123",
      title: "Linked Jira task",
    });

    const app = createTestApp();
    const res = await invoke(app, {
      method: "GET",
      url: "/api/team-tracker/carry-forward-preview?fromDate=2026-03-06&toDate=2026-03-07",
    });

    expect(res.status).toBe(200);
    expect(res.body?.carryable).toBe(2);
  });

  it("POST /api/team-tracker/carry-forward carries tracker-only and linked work together", async () => {
    await seedIssue();
    const sourceManagerItem = await managerDeskService.createItem("manager-1", {
      date: "2026-03-06",
      title: "Manager follow-up",
      status: "in_progress",
      assigneeDeveloperAccountId: "dev-1",
      links: [{ linkType: "issue", issueKey: "AM-123" }],
    });
    await trackerService.addItem("dev-1", "2026-03-06", {
      title: "Write release notes",
    });

    const app = createTestApp();
    const res = await invoke(app, {
      method: "POST",
      url: "/api/team-tracker/carry-forward",
      body: {
        fromDate: "2026-03-06",
        toDate: "2026-03-07",
      },
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ carried: 2 });

    const board = await trackerService.getBoard("2026-03-07");
    const devDay = board.developers.find(
      (developerDay) => developerDay.developer.accountId === "dev-1"
    )!;
    expect(devDay.plannedItems.map((item) => item.title)).toEqual([
      "Write release notes",
      "Manager follow-up",
    ]);

    const carriedManagerItems = await db
      .select()
      .from(managerDeskItems)
      .where(eq(managerDeskItems.sourceItemId, sourceManagerItem.id));
    expect(carriedManagerItems).toHaveLength(1);

    const linkedItem = devDay.plannedItems.find(
      (item) => item.title === "Manager follow-up"
    );
    expect(linkedItem?.lifecycle).toBe("manager_desk_linked");
    expect(linkedItem?.managerDeskItemId).toBe(carriedManagerItems[0]!.id);
  });
});
