import { and, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import type {
  Developer,
  DeveloperAvailability,
  DeveloperAvailabilityState,
  InactiveDeveloperListItem,
} from "shared/types";
import { db } from "../db/connection";
import { developerAvailabilityPeriods, developers } from "../db/schema";
import { HttpError } from "../middleware/errorHandler";
import { addDays } from "../utils/date";

function nowIso(): string {
  return new Date().toISOString();
}

function previousIsoDate(date: string): string {
  return addDays(new Date(`${date}T00:00:00.000Z`), -1).toISOString().slice(0, 10);
}

function mapAvailability(
  row?: typeof developerAvailabilityPeriods.$inferSelect
): DeveloperAvailability {
  if (!row) {
    return { state: "active" };
  }

  return {
    state: "inactive",
    startDate: row.startDate,
    endDate: row.endDate ?? undefined,
    note: row.note ?? undefined,
  };
}

function isAvailabilityPeriodRow(
  row: unknown
): row is typeof developerAvailabilityPeriods.$inferSelect {
  return Boolean(
    row &&
      typeof row === "object" &&
      "developerAccountId" in row &&
      "startDate" in row &&
      typeof (row as { developerAccountId?: unknown }).developerAccountId === "string" &&
      typeof (row as { startDate?: unknown }).startDate === "string"
  );
}

export class DeveloperAvailabilityService {
  async getAvailabilityForDate(accountId: string, date: string): Promise<DeveloperAvailability> {
    const row = await this.findCoveringPeriod(accountId, date);
    return mapAvailability(row);
  }

  async getAvailabilityMapForDate(
    accountIds: string[],
    date: string
  ): Promise<Map<string, DeveloperAvailability>> {
    const availabilityByAccountId = new Map<string, DeveloperAvailability>();
    if (accountIds.length === 0) {
      return availabilityByAccountId;
    }

    const rows = await db
      .select()
      .from(developerAvailabilityPeriods)
      .where(
        and(
          inArray(developerAvailabilityPeriods.developerAccountId, accountIds),
          lte(developerAvailabilityPeriods.startDate, date),
          or(isNull(developerAvailabilityPeriods.endDate), gte(developerAvailabilityPeriods.endDate, date))
        )
      );

    const periods = rows.filter(isAvailabilityPeriodRow);

    periods.sort(
      (left, right) =>
        right.startDate.localeCompare(left.startDate) ||
        right.id - left.id
    );

    for (const row of periods) {
      if (!availabilityByAccountId.has(row.developerAccountId)) {
        availabilityByAccountId.set(row.developerAccountId, mapAvailability(row));
      }
    }

    return availabilityByAccountId;
  }

  async listInactiveDevelopersForDate(
    developersForDate: Developer[],
    date: string
  ): Promise<InactiveDeveloperListItem[]> {
    const availabilityByAccountId = await this.getAvailabilityMapForDate(
      developersForDate.map((developer) => developer.accountId),
      date
    );

    return developersForDate
      .map((developer) => ({
        developer,
        availability: availabilityByAccountId.get(developer.accountId) ?? { state: "active" as DeveloperAvailabilityState },
      }))
      .filter((item) => item.availability.state === "inactive")
      .sort((left, right) => left.developer.displayName.localeCompare(right.developer.displayName));
  }

  async setAvailability(params: {
    accountId: string;
    effectiveDate: string;
    state: DeveloperAvailabilityState;
    note?: string;
  }): Promise<DeveloperAvailability> {
    await this.assertDeveloperExists(params.accountId);

    if (params.state === "inactive") {
      return this.markInactive(params.accountId, params.effectiveDate, params.note);
    }

    return this.markActive(params.accountId, params.effectiveDate);
  }

  async assertAvailableForDate(accountId: string, date: string): Promise<void> {
    const availability = await this.getAvailabilityForDate(accountId, date);
    if (availability.state === "inactive") {
      throw new HttpError(409, `Developer is inactive on ${date}`);
    }
  }

  private async markInactive(
    accountId: string,
    effectiveDate: string,
    note?: string
  ): Promise<DeveloperAvailability> {
    const normalizedNote = note?.trim() || null;
    const now = nowIso();
    const existing = await this.findOpenPeriod(accountId);

    if (existing) {
      await db
        .update(developerAvailabilityPeriods)
        .set({
          startDate: existing.startDate > effectiveDate ? effectiveDate : existing.startDate,
          note: normalizedNote,
          updatedAt: now,
        })
        .where(eq(developerAvailabilityPeriods.id, existing.id));
    } else {
      await db.insert(developerAvailabilityPeriods).values({
        developerAccountId: accountId,
        startDate: effectiveDate,
        endDate: null,
        note: normalizedNote,
        createdAt: now,
        updatedAt: now,
      });
    }

    return this.getAvailabilityForDate(accountId, effectiveDate);
  }

  private async markActive(accountId: string, effectiveDate: string): Promise<DeveloperAvailability> {
    const existing = await this.findCoveringPeriod(accountId, effectiveDate);
    if (!existing) {
      return { state: "active" };
    }

    if (effectiveDate <= existing.startDate) {
      await db
        .delete(developerAvailabilityPeriods)
        .where(eq(developerAvailabilityPeriods.id, existing.id));
      return { state: "active" };
    }

    await db
      .update(developerAvailabilityPeriods)
      .set({
        endDate: previousIsoDate(effectiveDate),
        updatedAt: nowIso(),
      })
      .where(eq(developerAvailabilityPeriods.id, existing.id));

    return { state: "active" };
  }

  private async findOpenPeriod(accountId: string) {
    const rows = await db
      .select()
      .from(developerAvailabilityPeriods)
      .where(
        and(
          eq(developerAvailabilityPeriods.developerAccountId, accountId),
          isNull(developerAvailabilityPeriods.endDate)
        )
      )
      .limit(10);

    rows.sort(
      (left, right) =>
        right.startDate.localeCompare(left.startDate) ||
        right.id - left.id
    );

    return rows[0];
  }

  private async findCoveringPeriod(accountId: string, date: string) {
    const rows = await db
      .select()
      .from(developerAvailabilityPeriods)
      .where(
        and(
          eq(developerAvailabilityPeriods.developerAccountId, accountId),
          lte(developerAvailabilityPeriods.startDate, date),
          or(isNull(developerAvailabilityPeriods.endDate), gte(developerAvailabilityPeriods.endDate, date))
        )
      )
      .limit(10);

    rows.sort(
      (left, right) =>
        right.startDate.localeCompare(left.startDate) ||
        right.id - left.id
    );

    return rows[0];
  }

  private async assertDeveloperExists(accountId: string): Promise<void> {
    const rows = await db
      .select({ accountId: developers.accountId, isActive: developers.isActive })
      .from(developers)
      .where(eq(developers.accountId, accountId))
      .limit(1);

    const row = rows[0];
    if (!row || row.isActive !== 1) {
      throw new HttpError(404, `Developer ${accountId} not found`);
    }
  }
}
