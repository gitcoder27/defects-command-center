import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { serializeSessionCookie } from "../src/services/auth.service";
import { AuthService } from "../src/services/auth.service";
import { developers } from "../src/db/schema";
import { db, resetDatabase } from "./helpers/db";
import { invoke } from "./helpers/http";

const managerOnlyCases = [
  { method: "GET", url: "/api/issues" },
  { method: "GET", url: "/api/overview" },
  { method: "GET", url: "/api/team/workload" },
  { method: "GET", url: "/api/alerts" },
  { method: "POST", url: "/api/alerts/dismiss", body: { alertIds: ["overdue:PROJ-1"] } },
  { method: "GET", url: "/api/suggestions/duedate/High" },
  { method: "GET", url: "/api/sync/status" },
  { method: "GET", url: "/api/config" },
  { method: "GET", url: "/api/backups" },
  { method: "GET", url: "/api/tags" },
  { method: "GET", url: "/api/team-tracker?date=2026-03-08" },
  { method: "GET", url: "/api/manager-desk?date=2026-03-08" },
] as const;

function createTestApp(authService: AuthService) {
  return createApp({
    issueService: {} as any,
    workloadService: {} as any,
    alertService: {} as any,
    automationService: {} as any,
    syncEngine: {
      getLastSyncLog: async () => undefined,
      getRuntimeStatus: () => ({ status: "idle" }),
    } as any,
    backupService: {} as any,
    tagService: {} as any,
    teamTrackerService: {} as any,
    authService,
    myDayService: {} as any,
    managerDeskService: {} as any,
  });
}

async function seedDeveloper(accountId = "dev-1") {
  await db.insert(developers).values({
    accountId,
    displayName: "Developer",
    email: `${accountId}@example.com`,
    avatarUrl: null,
    isActive: 1,
  });
}

describe("app route authorization", () => {
  const authService = new AuthService();

  beforeEach(async () => {
    await resetDatabase();
  });

  it.each(managerOnlyCases)("$method $url rejects unauthenticated access", async ({ method, url, body }) => {
    const app = createTestApp(authService);
    const response = await invoke(app, { method, url, body });

    expect(response.status).toBe(401);
    expect(response.body?.error).toBe("Authentication required");
  });

  it.each(managerOnlyCases)("$method $url rejects developer access", async ({ method, url, body }) => {
    await seedDeveloper("dev-1");
    const developer = await authService.createUser({
      username: "dev",
      displayName: "Developer",
      password: "secret123",
      role: "developer",
      developerAccountId: "dev-1",
    });
    const session = await authService.authenticate(developer.username, "secret123");
    const app = createTestApp(authService);

    const response = await invoke(app, {
      method,
      url,
      body,
      headers: {
        cookie: serializeSessionCookie(session.sessionId),
      },
    });

    expect(response.status).toBe(403);
    expect(response.body?.error).toBe("Manager access required");
  });

  it("GET /api/my-day rejects manager access", async () => {
    await authService.createUser({
      username: "manager",
      displayName: "Manager",
      password: "secret123",
      role: "manager",
    });
    const session = await authService.authenticate("manager", "secret123");
    const app = createTestApp(authService);

    const response = await invoke(app, {
      method: "GET",
      url: "/api/my-day?date=2026-03-08",
      headers: {
        cookie: serializeSessionCookie(session.sessionId),
      },
    });

    expect(response.status).toBe(403);
    expect(response.body?.error).toBe("Developer access required");
  });
});
