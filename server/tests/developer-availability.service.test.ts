import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { DeveloperAvailabilityService } from "../src/services/developer-availability.service";
import { developerAvailabilityPeriods, developers } from "../src/db/schema";
import { db, resetDatabase } from "./helpers/db";

const service = new DeveloperAvailabilityService();

async function seedDevelopers() {
  await db.insert(developers).values([
    {
      accountId: "alice-1",
      displayName: "Alice Smith",
      email: null,
      avatarUrl: null,
      isActive: 1,
    },
    {
      accountId: "bob-2",
      displayName: "Bob Jones",
      email: null,
      avatarUrl: null,
      isActive: 1,
    },
    {
      accountId: "inactive-3",
      displayName: "Inactive Dev",
      email: null,
      avatarUrl: null,
      isActive: 0,
    },
  ]);
}

describe("DeveloperAvailabilityService", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedDevelopers();
  });

  it("marks developers inactive, trims notes, and lists inactive developers alphabetically", async () => {
    const availability = await service.setAvailability({
      accountId: "bob-2",
      effectiveDate: "2026-03-09",
      state: "inactive",
      note: "  PTO today  ",
    });

    expect(availability).toEqual({
      state: "inactive",
      startDate: "2026-03-09",
      note: "PTO today",
    });

    const map = await service.getAvailabilityMapForDate(["alice-1", "bob-2"], "2026-03-09");
    expect(map.get("alice-1")).toBeUndefined();
    expect(map.get("bob-2")).toEqual({
      state: "inactive",
      startDate: "2026-03-09",
      note: "PTO today",
    });

    const inactiveDevelopers = await service.listInactiveDevelopersForDate(
      [
        { accountId: "bob-2", displayName: "Bob Jones", isActive: true },
        { accountId: "alice-1", displayName: "Alice Smith", isActive: true },
      ],
      "2026-03-09"
    );

    expect(inactiveDevelopers.map((item) => item.developer.displayName)).toEqual(["Bob Jones"]);
    await expect(service.assertAvailableForDate("bob-2", "2026-03-09")).rejects.toMatchObject({
      status: 409,
      message: "Developer is inactive on 2026-03-09",
    });
  });

  it("closes an inactive period on the day before reactivation", async () => {
    await service.setAvailability({
      accountId: "alice-1",
      effectiveDate: "2026-03-01",
      state: "inactive",
      note: "Sabbatical",
    });

    const active = await service.setAvailability({
      accountId: "alice-1",
      effectiveDate: "2026-03-10",
      state: "active",
    });

    expect(active).toEqual({ state: "active" });
    expect(await service.getAvailabilityForDate("alice-1", "2026-03-09")).toMatchObject({
      state: "inactive",
      endDate: "2026-03-09",
    });
    expect(await service.getAvailabilityForDate("alice-1", "2026-03-10")).toEqual({
      state: "active",
    });

    const rows = await db
      .select()
      .from(developerAvailabilityPeriods)
      .where(eq(developerAvailabilityPeriods.developerAccountId, "alice-1"));
    expect(rows).toHaveLength(1);
    expect(rows[0].endDate).toBe("2026-03-09");
  });

  it("deletes an inactive period when reactivation starts on or before the inactive start", async () => {
    await service.setAvailability({
      accountId: "alice-1",
      effectiveDate: "2026-03-09",
      state: "inactive",
      note: "One-day PTO",
    });

    await service.setAvailability({
      accountId: "alice-1",
      effectiveDate: "2026-03-09",
      state: "active",
    });

    expect(await service.getAvailabilityForDate("alice-1", "2026-03-09")).toEqual({
      state: "active",
    });

    const rows = await db
      .select()
      .from(developerAvailabilityPeriods)
      .where(eq(developerAvailabilityPeriods.developerAccountId, "alice-1"));
    expect(rows).toHaveLength(0);
  });

  it("uses the most recent overlapping inactive period for map lookups", async () => {
    await db.insert(developerAvailabilityPeriods).values([
      {
        developerAccountId: "alice-1",
        startDate: "2026-03-01",
        endDate: "2026-03-31",
        note: "Older period",
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-01T00:00:00.000Z",
      },
      {
        developerAccountId: "alice-1",
        startDate: "2026-03-05",
        endDate: null,
        note: "Latest period",
        createdAt: "2026-03-05T00:00:00.000Z",
        updatedAt: "2026-03-05T00:00:00.000Z",
      },
    ]);

    const availability = await service.getAvailabilityMapForDate(["alice-1"], "2026-03-09");

    expect(availability.get("alice-1")).toEqual({
      state: "inactive",
      startDate: "2026-03-05",
      note: "Latest period",
    });
  });

  it("rejects missing and inactive developer records before writing availability", async () => {
    await expect(
      service.setAvailability({
        accountId: "missing-9",
        effectiveDate: "2026-03-09",
        state: "inactive",
      })
    ).rejects.toMatchObject({
      status: 404,
      message: "Developer missing-9 not found",
    });

    await expect(
      service.setAvailability({
        accountId: "inactive-3",
        effectiveDate: "2026-03-09",
        state: "inactive",
      })
    ).rejects.toMatchObject({
      status: 404,
      message: "Developer inactive-3 not found",
    });

    const rows = await db.select().from(developerAvailabilityPeriods);
    expect(rows).toHaveLength(0);
  });
});
