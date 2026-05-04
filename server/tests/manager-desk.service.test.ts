import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db, resetDatabase } from "./helpers/db";
import { developers } from "../src/db/schema";
import { TeamTrackerService } from "../src/services/team-tracker.service";
import { ManagerDeskService } from "../src/services/manager-desk.service";

const trackerService = new TeamTrackerService();
const managerDeskService = new ManagerDeskService(trackerService);

describe("ManagerDeskService", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-08T08:00:00.000Z"));
    await resetDatabase();
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
      {
        accountId: "dev-3",
        displayName: "Zara Archived",
        email: "zara@example.com",
        avatarUrl: null,
        isActive: 0,
      },
    ]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns only available developers for blank quick-capture search", async () => {
    await trackerService.updateAvailability("dev-2", {
      effectiveDate: "2026-03-08",
      state: "inactive",
      note: "PTO today",
    });

    const items = await managerDeskService.lookupDevelopers("", "2026-03-08");

    expect(items).toEqual([
      {
        accountId: "dev-1",
        displayName: "Alice Smith",
        email: "alice@example.com",
        avatarUrl: undefined,
        availability: undefined,
      },
    ]);
  });
});
