import { beforeEach, describe, expect, it } from "vitest";
import express from "express";
import { eq } from "drizzle-orm";
import { createManagerDeskRouter } from "../src/routes/manager-desk";
import { errorHandler, notFoundHandler } from "../src/middleware/errorHandler";
import { AuthService, serializeSessionCookie } from "../src/services/auth.service";
import { ManagerDeskService } from "../src/services/manager-desk.service";
import { TeamTrackerService } from "../src/services/team-tracker.service";
import { resetDatabase, db } from "./helpers/db";
import {
  developers,
  issues,
  managerDeskItems,
  teamTrackerDays,
  teamTrackerItems,
} from "../src/db/schema";
import { invoke } from "./helpers/http";

const authService = new AuthService();
const managerDeskService = new ManagerDeskService();
const trackerService = new TeamTrackerService();

async function seedDevelopers() {
  await db.insert(developers).values([
    {
      accountId: "dev-1",
      displayName: "Alice Smith",
      email: "alice@example.com",
      avatarUrl: null,
      isActive: 1,
    },
    {
      accountId: "dev-2",
      displayName: "Rahul Sharma",
      email: "rahul@example.com",
      avatarUrl: "https://example.com/rahul.png",
      isActive: 1,
    },
  ]);
}

async function seedIssues() {
  await db.insert(issues).values([
    {
      jiraKey: "PROJ-221",
      summary: "Rahul blocker on review flow",
      description: null,
      aspenSeverity: null,
      priorityName: "High",
      priorityId: "1",
      statusName: "In Progress",
      statusCategory: "indeterminate",
      assigneeId: "dev-2",
      assigneeName: "Rahul Sharma",
      teamScopeState: "in_team",
      syncScopeState: "active",
      reporterName: "Lead",
      component: null,
      labels: JSON.stringify([]),
      dueDate: "2026-03-10",
      developmentDueDate: "2026-03-09",
      flagged: 0,
      createdAt: "2026-03-07T08:00:00.000Z",
      updatedAt: "2026-03-07T08:00:00.000Z",
      syncedAt: "2026-03-07T08:00:00.000Z",
      lastSeenInScopedSyncAt: "2026-03-07T08:00:00.000Z",
      lastReconciledAt: "2026-03-07T08:00:00.000Z",
      scopeChangedAt: null,
      analysisNotes: null,
      excluded: 0,
    },
    {
      jiraKey: "PROJ-321",
      summary: "Investigate design gap in review flow",
      description: null,
      aspenSeverity: null,
      priorityName: "Medium",
      priorityId: "2",
      statusName: "To Do",
      statusCategory: "new",
      assigneeId: "dev-1",
      assigneeName: "Alice Smith",
      teamScopeState: "in_team",
      syncScopeState: "active",
      reporterName: "Lead",
      component: null,
      labels: JSON.stringify([]),
      dueDate: "2026-03-12",
      developmentDueDate: null,
      flagged: 0,
      createdAt: "2026-03-07T08:00:00.000Z",
      updatedAt: "2026-03-08T08:00:00.000Z",
      syncedAt: "2026-03-08T08:00:00.000Z",
      lastSeenInScopedSyncAt: "2026-03-08T08:00:00.000Z",
      lastReconciledAt: "2026-03-08T08:00:00.000Z",
      scopeChangedAt: null,
      analysisNotes: null,
      excluded: 0,
    },
  ]);
}

async function loginCookie(username: string, password: string): Promise<string> {
  const { sessionId } = await authService.authenticate(username, password);
  return serializeSessionCookie(sessionId, authService.sessionMaxAgeSeconds);
}

function createTestApp() {
  const app = express();
  app.use(
    "/api/manager-desk",
    createManagerDeskRouter(managerDeskService, authService)
  );
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe("manager desk routes", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedDevelopers();
    await seedIssues();
    await authService.createUser({
      username: "manager",
      displayName: "Manager One",
      password: "secret123",
      role: "manager",
    });
    await authService.createUser({
      username: "developer",
      displayName: "Developer One",
      password: "secret123",
      role: "developer",
      developerAccountId: "dev-1",
    });
  });

  it("GET /api/manager-desk returns an empty manager day for managers", async () => {
    const app = createTestApp();
    const res = await invoke(app, {
      method: "GET",
      url: "/api/manager-desk?date=2026-03-08",
      headers: {
        cookie: await loginCookie("manager", "secret123"),
      },
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      date: "2026-03-08",
      items: [],
      summary: {
        totalOpen: 0,
        inbox: 0,
        planned: 0,
        inProgress: 0,
        waiting: 0,
        overdueFollowUps: 0,
        meetings: 0,
        completed: 0,
      },
    });
  });

  it("developer-role users receive 403 on manager desk routes", async () => {
    const app = createTestApp();
    const res = await invoke(app, {
      method: "GET",
      url: "/api/manager-desk?date=2026-03-08",
      headers: {
        cookie: await loginCookie("developer", "secret123"),
      },
    });

    expect(res.status).toBe(403);
    expect(res.body?.error).toBe("Manager access required");
  });

  it("GET /api/manager-desk/tracker-items/:trackerItemId/detail lazily converts tracker-only work into a shared manager desk task", async () => {
    const trackerItem = await trackerService.addItem("dev-1", "2026-03-08", {
      jiraKey: "PROJ-221",
      title: "Follow up from tracker",
      note: "Execution detail captured in tracker",
    });
    const app = createTestApp();
    const cookie = await loginCookie("manager", "secret123");

    const first = await invoke(app, {
      method: "GET",
      url: `/api/manager-desk/tracker-items/${trackerItem.id}/detail`,
      headers: { cookie },
    });

    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({
      date: "2026-03-08",
      developer: {
        accountId: "dev-1",
        displayName: "Alice Smith",
      },
      trackerItem: {
        id: trackerItem.id,
        managerDeskItemId: first.body.managerDeskItem.id,
        jiraKey: "PROJ-221",
        note: "Execution detail captured in tracker",
      },
      managerDeskItem: {
        title: "Follow up from tracker",
        status: "planned",
        contextNote: "Execution detail captured in tracker",
        assignee: {
          accountId: "dev-1",
          displayName: "Alice Smith",
        },
        links: [
          expect.objectContaining({
            linkType: "issue",
            issueKey: "PROJ-221",
            displayLabel: "PROJ-221",
          }),
        ],
      },
    });

    const second = await invoke(app, {
      method: "GET",
      url: `/api/manager-desk/tracker-items/${trackerItem.id}/detail`,
      headers: { cookie },
    });

    expect(second.status).toBe(200);
    expect(second.body?.managerDeskItem?.id).toBe(first.body?.managerDeskItem?.id);

    const linkedTrackerRows = await db
      .select()
      .from(teamTrackerItems)
      .where(eq(teamTrackerItems.id, trackerItem.id));
    expect(linkedTrackerRows[0]?.managerDeskItemId).toBe(first.body?.managerDeskItem?.id);

    const managerDeskRows = await db
      .select()
      .from(managerDeskItems)
      .where(eq(managerDeskItems.id, first.body?.managerDeskItem?.id));
    expect(managerDeskRows).toHaveLength(1);

    const mirroredTrackerRows = await db
      .select()
      .from(teamTrackerItems)
      .where(eq(teamTrackerItems.managerDeskItemId, first.body?.managerDeskItem?.id));
    expect(mirroredTrackerRows).toHaveLength(1);
    expect(mirroredTrackerRows[0]?.id).toBe(trackerItem.id);
  });

  it("POST /api/manager-desk/items quick-captures an inbox item with defaults", async () => {
    const app = createTestApp();
    const res = await invoke(app, {
      method: "POST",
      url: "/api/manager-desk/items",
      headers: {
        cookie: await loginCookie("manager", "secret123"),
      },
      body: {
        date: "2026-03-08",
        title: " Follow up with Rahul on blocker ",
      },
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: "Follow up with Rahul on blocker",
      kind: "action",
      category: "other",
      status: "inbox",
      priority: "medium",
      links: [],
    });

    const day = await invoke(app, {
      method: "GET",
      url: "/api/manager-desk?date=2026-03-08",
      headers: {
        cookie: await loginCookie("manager", "secret123"),
      },
    });

    expect(day.body?.summary).toMatchObject({
      totalOpen: 1,
      inbox: 1,
    });
  });

  it("POST /api/manager-desk/items supports structured create with validated links", async () => {
    const app = createTestApp();
    const res = await invoke(app, {
      method: "POST",
      url: "/api/manager-desk/items",
      headers: {
        cookie: await loginCookie("manager", "secret123"),
      },
      body: {
        date: "2026-03-08",
        title: "Prepare discussion points for design sync",
        kind: "meeting",
        category: "design",
        status: "planned",
        priority: "high",
        assigneeDeveloperAccountId: "dev-1",
        participants: "Onshore Design Team",
        contextNote: "Need alignment on API edge cases before implementation starts.",
        nextAction: "Review open assumptions from yesterday.",
        plannedStartAt: "2026-03-08T15:00:00.000Z",
        plannedEndAt: "2026-03-08T15:30:00.000Z",
        followUpAt: "2026-03-08T17:00:00.000Z",
        links: [
          { linkType: "issue", issueKey: "proj-321" },
          { linkType: "developer", developerAccountId: "dev-2" },
        ],
      },
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: "Prepare discussion points for design sync",
      kind: "meeting",
      category: "design",
      status: "planned",
      priority: "high",
      assignee: {
        accountId: "dev-1",
        displayName: "Alice Smith",
      },
      participants: "Onshore Design Team",
      contextNote: "Need alignment on API edge cases before implementation starts.",
      nextAction: "Review open assumptions from yesterday.",
      plannedStartAt: "2026-03-08T15:00:00.000Z",
      plannedEndAt: "2026-03-08T15:30:00.000Z",
      followUpAt: "2026-03-08T17:00:00.000Z",
      links: [
        expect.objectContaining({
          linkType: "issue",
          issueKey: "PROJ-321",
          displayLabel: "PROJ-321",
        }),
        expect.objectContaining({
          linkType: "developer",
          developerAccountId: "dev-2",
          displayLabel: "Rahul Sharma",
        }),
      ],
    });

    const trackerDayRows = await db
      .select()
      .from(teamTrackerDays)
      .where(eq(teamTrackerDays.developerAccountId, "dev-1"));
    expect(trackerDayRows[0]?.date).toBe("2026-03-08");

    const trackerRows = await db
      .select()
      .from(teamTrackerItems)
      .where(eq(teamTrackerItems.managerDeskItemId, res.body.id));
    expect(trackerRows).toEqual([
      expect.objectContaining({
        dayId: trackerDayRows[0]?.id,
        managerDeskItemId: res.body.id,
        itemType: "jira",
        jiraKey: "PROJ-321",
        title: "Prepare discussion points for design sync",
        state: "planned",
      }),
    ]);
  });

  it("PATCH /api/manager-desk/items/:itemId manages done transitions and clearing optional fields", async () => {
    const app = createTestApp();
    const created = await invoke(app, {
      method: "POST",
      url: "/api/manager-desk/items",
      headers: {
        cookie: await loginCookie("manager", "secret123"),
      },
      body: {
        date: "2026-03-08",
        title: "Analyze PROJ-221 root cause",
        status: "in_progress",
        contextNote: "Initial notes",
      },
    });

    const completed = await invoke(app, {
      method: "PATCH",
      url: `/api/manager-desk/items/${created.body.id}`,
      headers: {
        cookie: await loginCookie("manager", "secret123"),
      },
      body: {
        status: "done",
        outcome: "Shared root cause and next steps.",
      },
    });

    expect(completed.status).toBe(200);
    expect(completed.body?.status).toBe("done");
    expect(completed.body?.completedAt).toBeDefined();
    expect(completed.body?.outcome).toBe("Shared root cause and next steps.");

    const reopened = await invoke(app, {
      method: "PATCH",
      url: `/api/manager-desk/items/${created.body.id}`,
      headers: {
        cookie: await loginCookie("manager", "secret123"),
      },
      body: {
        status: "planned",
        contextNote: null,
      },
    });

    expect(reopened.status).toBe(200);
    expect(reopened.body?.status).toBe("planned");
    expect("completedAt" in reopened.body).toBe(false);
    expect("contextNote" in reopened.body).toBe(false);
  });

  it("does not mirror closed items and removes tracker work when an assigned item is closed", async () => {
    const app = createTestApp();
    const cookie = await loginCookie("manager", "secret123");

    const closed = await invoke(app, {
      method: "POST",
      url: "/api/manager-desk/items",
      headers: { cookie },
      body: {
        date: "2026-03-08",
        title: "Already resolved follow-up",
        status: "done",
        assigneeDeveloperAccountId: "dev-1",
      },
    });

    expect(closed.status).toBe(201);

    const closedTrackerRows = await db
      .select()
      .from(teamTrackerItems)
      .where(eq(teamTrackerItems.managerDeskItemId, closed.body.id));
    expect(closedTrackerRows).toHaveLength(0);

    const created = await invoke(app, {
      method: "POST",
      url: "/api/manager-desk/items",
      headers: { cookie },
      body: {
        date: "2026-03-08",
        title: "Investigate active blocker",
        status: "planned",
        assigneeDeveloperAccountId: "dev-1",
      },
    });

    const originalTrackerRows = await db
      .select()
      .from(teamTrackerItems)
      .where(eq(teamTrackerItems.managerDeskItemId, created.body.id));
    expect(originalTrackerRows).toHaveLength(1);

    const completed = await invoke(app, {
      method: "PATCH",
      url: `/api/manager-desk/items/${created.body.id}`,
      headers: { cookie },
      body: {
        status: "cancelled",
      },
    });

    expect(completed.status).toBe(200);
    expect(completed.body?.status).toBe("cancelled");

    const removedTrackerRows = await db
      .select()
      .from(teamTrackerItems)
      .where(eq(teamTrackerItems.managerDeskItemId, created.body.id));
    expect(removedTrackerRows).toHaveLength(0);
  });

  it("reassigns mirrored tracker work to the new owner and resets it to planned", async () => {
    const app = createTestApp();
    const cookie = await loginCookie("manager", "secret123");

    const created = await invoke(app, {
      method: "POST",
      url: "/api/manager-desk/items",
      headers: { cookie },
      body: {
        date: "2026-03-08",
        title: "Coordinate review follow-up",
        assigneeDeveloperAccountId: "dev-1",
        links: [{ linkType: "issue", issueKey: "PROJ-221" }],
      },
    });

    const originalTracker = await db
      .select()
      .from(teamTrackerItems)
      .where(eq(teamTrackerItems.managerDeskItemId, created.body.id));
    expect(originalTracker[0]).toBeDefined();

    await db
      .update(teamTrackerItems)
      .set({
        state: "in_progress",
        note: "Developer-owned note",
      })
      .where(eq(teamTrackerItems.id, originalTracker[0]!.id));

    const reassigned = await invoke(app, {
      method: "PATCH",
      url: `/api/manager-desk/items/${created.body.id}`,
      headers: { cookie },
      body: {
        assigneeDeveloperAccountId: "dev-2",
      },
    });

    expect(reassigned.status).toBe(200);
    expect(reassigned.body?.assignee).toEqual({
      accountId: "dev-2",
      displayName: "Rahul Sharma",
      avatarUrl: "https://example.com/rahul.png",
    });

    const trackerRows = await db
      .select()
      .from(teamTrackerItems)
      .where(eq(teamTrackerItems.managerDeskItemId, created.body.id));
    expect(trackerRows).toHaveLength(1);
    expect(trackerRows[0]).toMatchObject({
      managerDeskItemId: created.body.id,
      itemType: "jira",
      jiraKey: "PROJ-221",
      title: "Coordinate review follow-up",
      state: "planned",
      note: null,
    });

    const targetDay = await db
      .select()
      .from(teamTrackerDays)
      .where(eq(teamTrackerDays.id, trackerRows[0]!.dayId));
    expect(targetDay[0]?.developerAccountId).toBe("dev-2");
  });

  it("clearing the assignee removes the mirrored tracker item", async () => {
    const app = createTestApp();
    const cookie = await loginCookie("manager", "secret123");

    const created = await invoke(app, {
      method: "POST",
      url: "/api/manager-desk/items",
      headers: { cookie },
      body: {
        date: "2026-03-08",
        title: "Custom manager follow-up",
        assigneeDeveloperAccountId: "dev-1",
      },
    });

    const cleared = await invoke(app, {
      method: "PATCH",
      url: `/api/manager-desk/items/${created.body.id}`,
      headers: { cookie },
      body: {
        assigneeDeveloperAccountId: null,
      },
    });

    expect(cleared.status).toBe(200);
    expect("assignee" in cleared.body).toBe(false);

    const trackerRows = await db
      .select()
      .from(teamTrackerItems)
      .where(eq(teamTrackerItems.managerDeskItemId, created.body.id));
    expect(trackerRows).toHaveLength(0);
  });

  it("POST /api/manager-desk/items/:itemId/links adds issue, developer, and external links and rejects duplicates", async () => {
    const app = createTestApp();
    const created = await invoke(app, {
      method: "POST",
      url: "/api/manager-desk/items",
      headers: {
        cookie: await loginCookie("manager", "secret123"),
      },
      body: {
        date: "2026-03-08",
        title: "Cross-team follow-up",
      },
    });

    const itemId = created.body.id;

    const issueLink = await invoke(app, {
      method: "POST",
      url: `/api/manager-desk/items/${itemId}/links`,
      headers: {
        cookie: await loginCookie("manager", "secret123"),
      },
      body: {
        linkType: "issue",
        issueKey: "PROJ-221",
      },
    });
    expect(issueLink.status).toBe(201);

    const developerLink = await invoke(app, {
      method: "POST",
      url: `/api/manager-desk/items/${itemId}/links`,
      headers: {
        cookie: await loginCookie("manager", "secret123"),
      },
      body: {
        linkType: "developer",
        developerAccountId: "dev-2",
      },
    });
    expect(developerLink.status).toBe(201);
    expect(developerLink.body?.displayLabel).toBe("Rahul Sharma");

    const externalLink = await invoke(app, {
      method: "POST",
      url: `/api/manager-desk/items/${itemId}/links`,
      headers: {
        cookie: await loginCookie("manager", "secret123"),
      },
      body: {
        linkType: "external_group",
        externalLabel: "Onshore Design Team",
      },
    });
    expect(externalLink.status).toBe(201);
    expect(externalLink.body?.displayLabel).toBe("Onshore Design Team");

    const duplicate = await invoke(app, {
      method: "POST",
      url: `/api/manager-desk/items/${itemId}/links`,
      headers: {
        cookie: await loginCookie("manager", "secret123"),
      },
      body: {
        linkType: "issue",
        issueKey: "PROJ-221",
      },
    });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body?.error).toBe("Identical link already exists for this item");
  });

  it("rejects invalid link payloads", async () => {
    const app = createTestApp();
    const created = await invoke(app, {
      method: "POST",
      url: "/api/manager-desk/items",
      headers: {
        cookie: await loginCookie("manager", "secret123"),
      },
      body: {
        date: "2026-03-08",
        title: "Waiting on response",
      },
    });

    const res = await invoke(app, {
      method: "POST",
      url: `/api/manager-desk/items/${created.body.id}/links`,
      headers: {
        cookie: await loginCookie("manager", "secret123"),
      },
      body: {
        linkType: "developer",
      },
    });

    expect(res.status).toBe(400);
    expect(res.body?.error).toContain("developerAccountId is required for developer links");
  });

  it("lookup endpoints return lightweight issue and developer results", async () => {
    const app = createTestApp();
    const cookie = await loginCookie("manager", "secret123");

    const issueLookup = await invoke(app, {
      method: "GET",
      url: "/api/manager-desk/lookups/issues?q=design",
      headers: {
        cookie,
      },
    });

    expect(issueLookup.status).toBe(200);
    expect(issueLookup.body?.items).toEqual([
      {
        jiraKey: "PROJ-321",
        summary: "Investigate design gap in review flow",
        priorityName: "Medium",
        statusName: "To Do",
        assigneeName: "Alice Smith",
      },
    ]);

    const developerLookup = await invoke(app, {
      method: "GET",
      url: "/api/manager-desk/lookups/developers?q=rahul",
      headers: {
        cookie,
      },
    });

    expect(developerLookup.status).toBe(200);
    expect(developerLookup.body?.items).toEqual([
      {
        accountId: "dev-2",
        displayName: "Rahul Sharma",
        email: "rahul@example.com",
        avatarUrl: "https://example.com/rahul.png",
      },
    ]);
  });

  it("GET /api/manager-desk/lookups/developers includes inactive metadata when a date is provided", async () => {
    await trackerService.updateAvailability("dev-2", {
      effectiveDate: "2026-03-08",
      state: "inactive",
      note: "PTO today",
    });

    const app = createTestApp();
    const cookie = await loginCookie("manager", "secret123");
    const developerLookup = await invoke(app, {
      method: "GET",
      url: "/api/manager-desk/lookups/developers?q=rahul&date=2026-03-08",
      headers: {
        cookie,
      },
    });

    expect(developerLookup.status).toBe(200);
    expect(developerLookup.body?.items).toEqual([
      {
        accountId: "dev-2",
        displayName: "Rahul Sharma",
        email: "rahul@example.com",
        avatarUrl: "https://example.com/rahul.png",
        availability: {
          state: "inactive",
          note: "PTO today",
          startDate: "2026-03-08",
        },
      },
    ]);
  });

  it("carry-forward copies unfinished items with links and skips duplicates on repeat runs", async () => {
    const app = createTestApp();
    const cookie = await loginCookie("manager", "secret123");

    const created = await invoke(app, {
      method: "POST",
      url: "/api/manager-desk/items",
      headers: {
        cookie,
      },
      body: {
        date: "2026-03-08",
        title: "Follow up with Rahul on blocker",
        kind: "waiting",
        category: "follow_up",
        status: "waiting",
        priority: "high",
        followUpAt: "2026-03-08T15:00:00.000Z",
        links: [
          { linkType: "developer", developerAccountId: "dev-2" },
          { linkType: "issue", issueKey: "PROJ-221" },
        ],
      },
    });

    const active = await invoke(app, {
      method: "POST",
      url: "/api/manager-desk/items",
      headers: {
        cookie,
      },
      body: {
        date: "2026-03-08",
        title: "Continue design review",
        kind: "action",
        category: "design",
        status: "in_progress",
      },
    });

    const carryForward = await invoke(app, {
      method: "POST",
      url: "/api/manager-desk/carry-forward",
      headers: {
        cookie,
      },
      body: {
        fromDate: "2026-03-08",
        toDate: "2026-03-09",
        itemIds: [created.body.id, active.body.id],
      },
    });

    expect(carryForward.status).toBe(200);
    expect(carryForward.body).toEqual({ created: 2 });

    const nextDay = await invoke(app, {
      method: "GET",
      url: "/api/manager-desk?date=2026-03-09",
      headers: {
        cookie,
      },
    });

    expect(nextDay.status).toBe(200);
    expect(nextDay.body?.items).toHaveLength(2);
    expect(nextDay.body?.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Follow up with Rahul on blocker",
          status: "waiting",
          links: expect.arrayContaining([
            expect.objectContaining({
              linkType: "developer",
              developerAccountId: "dev-2",
            }),
            expect.objectContaining({
              linkType: "issue",
              issueKey: "PROJ-221",
            }),
          ]),
        }),
        expect.objectContaining({
          title: "Continue design review",
          status: "planned",
        }),
      ])
    );

    const repeat = await invoke(app, {
      method: "POST",
      url: "/api/manager-desk/carry-forward",
      headers: {
        cookie,
      },
      body: {
        fromDate: "2026-03-08",
        toDate: "2026-03-09",
        itemIds: [created.body.id, active.body.id],
      },
    });

    expect(repeat.status).toBe(200);
    expect(repeat.body).toEqual({ created: 0 });
  });

  it("carry-forward preserves tracker notes for mirrored manager desk items", async () => {
    const app = createTestApp();
    const cookie = await loginCookie("manager", "secret123");

    const created = await invoke(app, {
      method: "POST",
      url: "/api/manager-desk/items",
      headers: { cookie },
      body: {
        date: "2026-03-08",
        title: "Continue review follow-up",
        status: "in_progress",
        assigneeDeveloperAccountId: "dev-1",
        links: [{ linkType: "issue", issueKey: "PROJ-321" }],
      },
    });

    const sourceTrackerRows = await db
      .select()
      .from(teamTrackerItems)
      .where(eq(teamTrackerItems.managerDeskItemId, created.body.id));
    expect(sourceTrackerRows).toHaveLength(1);

    await db
      .update(teamTrackerItems)
      .set({
        note: "Carry forward after confirming edge-case repro steps.",
      })
      .where(eq(teamTrackerItems.id, sourceTrackerRows[0]!.id));

    const carryForward = await invoke(app, {
      method: "POST",
      url: "/api/manager-desk/carry-forward",
      headers: { cookie },
      body: {
        fromDate: "2026-03-08",
        toDate: "2026-03-09",
        itemIds: [created.body.id],
      },
    });

    expect(carryForward.status).toBe(200);
    expect(carryForward.body).toEqual({ created: 1 });

    const carriedItems = await db
      .select()
      .from(managerDeskItems)
      .where(eq(managerDeskItems.sourceItemId, created.body.id));
    const carriedItem = carriedItems[0];
    expect(carriedItem).toBeDefined();

    const carriedTrackerRows = await db
      .select()
      .from(teamTrackerItems)
      .where(eq(teamTrackerItems.managerDeskItemId, carriedItem.id));
    expect(carriedTrackerRows).toEqual([
      expect.objectContaining({
        managerDeskItemId: carriedItem.id,
        jiraKey: "PROJ-321",
        note: "Carry forward after confirming edge-case repro steps.",
        state: "planned",
      }),
    ]);
  });
});
