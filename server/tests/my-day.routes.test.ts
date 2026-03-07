import { beforeEach, describe, expect, it } from "vitest";
import express from "express";
import { createMyDayRouter } from "../src/routes/my-day";
import { notFoundHandler, errorHandler } from "../src/middleware/errorHandler";
import { AuthService, serializeSessionCookie } from "../src/services/auth.service";
import { MyDayService } from "../src/services/my-day.service";
import { TeamTrackerService } from "../src/services/team-tracker.service";
import { resetDatabase, db } from "./helpers/db";
import { developers, issues } from "../src/db/schema";
import { invoke } from "./helpers/http";

const authService = new AuthService();
const trackerService = new TeamTrackerService();
const myDayService = new MyDayService(trackerService);

async function seedDevelopers() {
  await db.insert(developers).values([
    { accountId: "dev-1", displayName: "Alice Smith", email: "alice@example.com", avatarUrl: null, isActive: 1 },
    { accountId: "dev-2", displayName: "Bob Jones", email: "bob@example.com", avatarUrl: null, isActive: 1 },
  ]);
}

async function seedIssue(jiraKey = "AM-123", assigneeId = "dev-1", assigneeName = "Alice Smith") {
  await db.insert(issues).values({
    jiraKey,
    summary: "Linked Jira task",
    description: null,
    aspenSeverity: null,
    priorityName: "High",
    priorityId: "1",
    statusName: "In Progress",
    statusCategory: "indeterminate",
    assigneeId,
    assigneeName,
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

async function loginCookie(username: string, password: string): Promise<string> {
  const { sessionId } = await authService.authenticate(username, password);
  return serializeSessionCookie(sessionId, authService.sessionMaxAgeSeconds);
}

function createTestApp() {
  const app = express();
  app.use("/api/my-day", createMyDayRouter(myDayService, authService));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe("my day routes", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedDevelopers();
    await authService.createUser({
      username: "alice",
      displayName: "Alice Smith",
      password: "secret123",
      role: "developer",
      developerAccountId: "dev-1",
    });
    await authService.createUser({
      username: "bob",
      displayName: "Bob Jones",
      password: "secret123",
      role: "developer",
      developerAccountId: "dev-2",
    });
  });

  it("GET /api/my-day returns the authenticated developer day and omits manager notes", async () => {
    await trackerService.updateDay("dev-1", "2026-03-07", {
      status: "blocked",
      managerNotes: "Private manager note",
    });
    await trackerService.addItem("dev-1", "2026-03-07", {
      itemType: "custom",
      title: "Investigate login issue",
    });

    const app = createTestApp();
    const res = await invoke(app, {
      method: "GET",
      url: "/api/my-day?date=2026-03-07",
      headers: {
        cookie: await loginCookie("alice", "secret123"),
      },
    });

    expect(res.status).toBe(200);
    expect(res.body?.developer.accountId).toBe("dev-1");
    expect(res.body?.status).toBe("blocked");
    expect(res.body?.plannedItems).toHaveLength(1);
    expect("managerNotes" in res.body).toBe(false);
  });

  it("GET /api/my-day rejects unauthenticated requests", async () => {
    const app = createTestApp();
    const res = await invoke(app, {
      method: "GET",
      url: "/api/my-day?date=2026-03-07",
    });

    expect(res.status).toBe(401);
    expect(res.body?.error).toBe("Authentication required");
  });

  it("PATCH /api/my-day/items/:itemId rejects edits to another developer's item", async () => {
    const otherItem = await trackerService.addItem("dev-2", "2026-03-07", {
      itemType: "custom",
      title: "Bob's task",
    });

    const app = createTestApp();
    const res = await invoke(app, {
      method: "PATCH",
      url: `/api/my-day/items/${otherItem.id}`,
      headers: {
        cookie: await loginCookie("alice", "secret123"),
      },
      body: {
        note: "Trying to edit someone else's task",
      },
    });

    expect(res.status).toBe(403);
    expect(res.body?.error).toBe("Item does not belong to authenticated developer");
  });

  it("POST /api/my-day/checkins records developer-authored attribution", async () => {
    const app = createTestApp();
    const res = await invoke(app, {
      method: "POST",
      url: "/api/my-day/checkins",
      headers: {
        cookie: await loginCookie("alice", "secret123"),
      },
      body: {
        date: "2026-03-07",
        summary: "Started work on auth fix",
        status: "on_track",
      },
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      summary: "Started work on auth fix",
      authorType: "developer",
      authorAccountId: "dev-1",
    });
  });

  it("POST /api/my-day/items supports Jira-linked items for the authenticated developer", async () => {
    await seedIssue();

    const app = createTestApp();
    const res = await invoke(app, {
      method: "POST",
      url: "/api/my-day/items",
      headers: {
        cookie: await loginCookie("alice", "secret123"),
      },
      body: {
        date: "2026-03-07",
        itemType: "jira",
        jiraKey: "AM-123",
        title: "Linked Jira task",
      },
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      itemType: "jira",
      jiraKey: "AM-123",
      jiraPriorityName: "High",
      jiraDueDate: "2026-03-08",
      title: "Linked Jira task",
    });
  });
});
