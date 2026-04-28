import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { developers } from "../src/db/schema";
import { AuthService, serializeSessionCookie } from "../src/services/auth.service";
import { WorkloadService } from "../src/services/workload.service";
import { db, resetDatabase } from "./helpers/db";
import { invoke } from "./helpers/http";

const authService = new AuthService();

function createTestApp() {
  return createApp({
    issueService: {} as any,
    workloadService: new WorkloadService(),
    alertService: {} as any,
    automationService: {} as any,
    syncEngine: {} as any,
    backupService: {} as any,
    tagService: {} as any,
    teamTrackerService: {} as any,
    authService,
    myDayService: {} as any,
    managerDeskService: {} as any,
  });
}

async function managerCookie() {
  await authService.createUser({
    username: "manager",
    displayName: "Manager",
    password: "secret123",
    role: "manager",
  });
  const session = await authService.authenticate("manager", "secret123");
  return serializeSessionCookie(session.sessionId);
}

describe("team routes", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("creates manual team members without requiring Jira identity", async () => {
    const app = createTestApp();
    const cookie = await managerCookie();

    const res = await invoke(app, {
      method: "POST",
      url: "/api/team/developers/manual",
      headers: { cookie },
      body: {
        displayName: "Priya Manual",
        email: "priya@example.com",
      },
    });

    expect(res.status).toBe(201);
    expect(res.body?.developer).toMatchObject({
      displayName: "Priya Manual",
      email: "priya@example.com",
      source: "manual",
      isActive: true,
    });
    expect(res.body?.developer?.accountId).toMatch(/^manual:priya-manual-/);

    const rows = await db.select().from(developers);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      displayName: "Priya Manual",
      source: "manual",
      jiraAccountId: null,
      isActive: 1,
    });
  });

  it("stores imported Jira users with explicit Jira link metadata", async () => {
    const app = createTestApp();
    const cookie = await managerCookie();

    const res = await invoke(app, {
      method: "POST",
      url: "/api/team/developers",
      headers: { cookie },
      body: {
        developers: [
          {
            accountId: "jira-dev-1",
            displayName: "Jira Dev",
            email: "jira@example.com",
          },
        ],
      },
    });

    expect(res.status).toBe(200);
    const rows = await db.select().from(developers);
    expect(rows[0]).toMatchObject({
      accountId: "jira-dev-1",
      source: "jira",
      jiraAccountId: "jira-dev-1",
    });
  });

  it("updates team member details and optional Jira link metadata", async () => {
    const app = createTestApp();
    const cookie = await managerCookie();

    const createRes = await invoke(app, {
      method: "POST",
      url: "/api/team/developers/manual",
      headers: { cookie },
      body: {
        displayName: "Manual Dev",
        email: "manual@example.com",
      },
    });

    const accountId = createRes.body?.developer?.accountId as string;
    const updateRes = await invoke(app, {
      method: "PATCH",
      url: `/api/team/developers/${encodeURIComponent(accountId)}`,
      headers: { cookie },
      body: {
        displayName: "Manual Linked",
        email: "",
        jiraAccountId: "jira-linked-1",
      },
    });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body?.developer).toMatchObject({
      accountId,
      displayName: "Manual Linked",
      source: "manual",
      jiraAccountId: "jira-linked-1",
      isActive: true,
    });

    const rows = await db.select().from(developers);
    expect(rows[0]).toMatchObject({
      displayName: "Manual Linked",
      email: null,
      jiraAccountId: "jira-linked-1",
    });
  });
});
