import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";
import { db, resetDatabase } from "./helpers/db";
import { invoke } from "./helpers/http";
import { developers } from "../src/db/schema";
import { AuthService, serializeSessionCookie } from "../src/services/auth.service";
import { IssueService } from "../src/services/issue.service";
import { ManagerDeskService } from "../src/services/manager-desk.service";
import { TeamTrackerService } from "../src/services/team-tracker.service";
import { TodayService } from "../src/services/today.service";

const authService = new AuthService();
const trackerService = new TeamTrackerService();
const managerDeskService = new ManagerDeskService(trackerService);
const issueService = new IssueService(undefined, undefined, trackerService);
const todayService = new TodayService(issueService, trackerService, managerDeskService, {
  getLastSyncLog: async () => undefined,
  getRuntimeStatus: () => ({ status: "idle" }),
});

function createTestApp() {
  return createApp({
    issueService,
    workloadService: {} as any,
    alertService: {} as any,
    automationService: {} as any,
    syncEngine: {
      getLastSyncLog: async () => undefined,
      getRuntimeStatus: () => ({ status: "idle" }),
    } as any,
    backupService: {} as any,
    tagService: {} as any,
    teamTrackerService: trackerService,
    authService,
    myDayService: {} as any,
    managerDeskService,
    todayService,
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

describe("today routes", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-08T02:30:00.000Z"));
    await resetDatabase();
    await db.insert(developers).values({
      accountId: "dev-1",
      displayName: "Alice Smith",
      email: "alice@example.com",
      avatarUrl: null,
      isActive: 1,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("GET /api/today returns a manager-only read model", async () => {
    const cookie = await managerCookie();
    const response = await invoke(createTestApp(), {
      method: "GET",
      url: "/api/today?date=2026-03-08",
      headers: { cookie },
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      date: "2026-03-08",
      rhythm: { stage: "morning_plan" },
    });
    expect(response.body.summary).toHaveLength(6);
    expect(response.body.actionItems[0]).toMatchObject({
      target: expect.objectContaining({ view: "team" }),
    });
  });

  it("rejects invalid dates", async () => {
    const cookie = await managerCookie();
    const response = await invoke(createTestApp(), {
      method: "GET",
      url: "/api/today?date=03-08-2026",
      headers: { cookie },
    });

    expect(response.status).toBe(400);
    expect(response.body?.error).toContain("date must be YYYY-MM-DD");
  });
});
