import { and, eq } from "drizzle-orm";
import type {
  TrackerDeveloperStatus,
  TrackerItemState,
  TrackerItemType,
  TrackerDeveloperDay,
  TrackerWorkItem,
  TrackerCheckIn,
  TeamTrackerBoardResponse,
  TrackerBoardSummary,
  Developer,
} from "shared/types";
import { db } from "../db/connection";
import {
  developers,
  teamTrackerDays,
  teamTrackerItems,
  teamTrackerCheckIns,
} from "../db/schema";

const STALE_HOURS = 4;

function nowIso(): string {
  return new Date().toISOString();
}

function isStale(lastCheckInAt: string | null, now = new Date()): boolean {
  if (!lastCheckInAt) return true;
  const diff = now.getTime() - new Date(lastCheckInAt).getTime();
  return diff > STALE_HOURS * 60 * 60 * 1000;
}

function mapItem(row: typeof teamTrackerItems.$inferSelect): TrackerWorkItem {
  return {
    id: row.id,
    dayId: row.dayId,
    itemType: row.itemType as TrackerItemType,
    jiraKey: row.jiraKey ?? undefined,
    title: row.title,
    state: row.state as TrackerItemState,
    position: row.position,
    note: row.note ?? undefined,
    completedAt: row.completedAt ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapCheckIn(
  row: typeof teamTrackerCheckIns.$inferSelect
): TrackerCheckIn {
  return {
    id: row.id,
    dayId: row.dayId,
    summary: row.summary,
    createdAt: row.createdAt,
  };
}

function buildCarryForwardKey(
  item: Pick<
    typeof teamTrackerItems.$inferSelect,
    "itemType" | "jiraKey" | "title" | "note"
  >
): string {
  return JSON.stringify([
    item.itemType,
    item.jiraKey ?? null,
    item.title,
    item.note ?? null,
  ]);
}

export class TeamTrackerService {
  async getBoard(date: string): Promise<TeamTrackerBoardResponse> {
    const devRows = await db
      .select()
      .from(developers)
      .where(eq(developers.isActive, 1));

    const devList: Developer[] = devRows.map((r) => ({
      accountId: r.accountId,
      displayName: r.displayName,
      email: r.email ?? undefined,
      avatarUrl: r.avatarUrl ?? undefined,
      isActive: r.isActive === 1,
    }));

    const devDays: TrackerDeveloperDay[] = [];

    for (const dev of devList) {
      const day = await this.ensureDay(date, dev.accountId);
      const items = await db
        .select()
        .from(teamTrackerItems)
        .where(eq(teamTrackerItems.dayId, day.id));
      const checkIns = await db
        .select()
        .from(teamTrackerCheckIns)
        .where(eq(teamTrackerCheckIns.dayId, day.id));

      const mapped = items.map(mapItem).sort((a, b) => a.position - b.position);
      const currentItem = mapped.find((i) => i.state === "in_progress");
      const plannedItems = mapped.filter((i) => i.state === "planned");
      const completedItems = mapped.filter((i) => i.state === "done");
      const droppedItems = mapped.filter((i) => i.state === "dropped");

      devDays.push({
        id: day.id,
        date,
        developer: dev,
        status: day.status as TrackerDeveloperStatus,
        managerNotes: day.managerNotes ?? undefined,
        lastCheckInAt: day.lastCheckInAt ?? undefined,
        currentItem,
        plannedItems,
        completedItems,
        droppedItems,
        checkIns: checkIns.map(mapCheckIn),
        isStale: isStale(day.lastCheckInAt),
        createdAt: day.createdAt,
        updatedAt: day.updatedAt,
      });
    }

    const summary = this.computeSummary(devDays);
    return { date, developers: devDays, summary };
  }

  async ensureDay(
    date: string,
    developerAccountId: string
  ): Promise<typeof teamTrackerDays.$inferSelect> {
    const now = nowIso();
    await db
      .insert(teamTrackerDays)
      .values({
        date,
        developerAccountId,
        status: "on_track",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({
        target: [teamTrackerDays.date, teamTrackerDays.developerAccountId],
      });

    const rows = await db
      .select()
      .from(teamTrackerDays)
      .where(
        and(
          eq(teamTrackerDays.date, date),
          eq(teamTrackerDays.developerAccountId, developerAccountId)
        )
      )
      .limit(1);

    if (!rows[0]) {
      throw new Error(
        `Failed to initialize tracker day for ${developerAccountId} on ${date}`
      );
    }

    return rows[0];
  }

  async updateDay(
    accountId: string,
    date: string,
    updates: {
      status?: TrackerDeveloperStatus;
      managerNotes?: string;
    }
  ): Promise<typeof teamTrackerDays.$inferSelect> {
    const day = await this.ensureDay(date, accountId);
    const now = nowIso();

    await db
      .update(teamTrackerDays)
      .set({
        ...(updates.status !== undefined && { status: updates.status }),
        ...(updates.managerNotes !== undefined && {
          managerNotes: updates.managerNotes,
        }),
        updatedAt: now,
      })
      .where(eq(teamTrackerDays.id, day.id));

    const updated = await db
      .select()
      .from(teamTrackerDays)
      .where(eq(teamTrackerDays.id, day.id))
      .limit(1);
    return updated[0]!;
  }

  async addItem(
    accountId: string,
    date: string,
    params: {
      itemType: TrackerItemType;
      jiraKey?: string;
      title: string;
      note?: string;
    }
  ): Promise<TrackerWorkItem> {
    const day = await this.ensureDay(date, accountId);

    // Get next position
    const existing = await db
      .select()
      .from(teamTrackerItems)
      .where(eq(teamTrackerItems.dayId, day.id));
    const maxPosition = existing.reduce(
      (max, i) => Math.max(max, i.position),
      -1
    );

    const now = nowIso();
    const inserted = await db
      .insert(teamTrackerItems)
      .values({
        dayId: day.id,
        itemType: params.itemType,
        jiraKey: params.jiraKey ?? null,
        title: params.title,
        state: "planned",
        position: maxPosition + 1,
        note: params.note ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return mapItem(inserted[0]!);
  }

  async updateItem(
    itemId: number,
    updates: {
      title?: string;
      state?: TrackerItemState;
      note?: string;
      position?: number;
    }
  ): Promise<TrackerWorkItem> {
    const now = nowIso();
    const setFields: Record<string, unknown> = { updatedAt: now };

    if (updates.title !== undefined) setFields.title = updates.title;
    if (updates.note !== undefined) setFields.note = updates.note;
    if (updates.position !== undefined) setFields.position = updates.position;
    if (updates.state !== undefined) {
      setFields.state = updates.state;
      if (updates.state === "done") {
        setFields.completedAt = now;
      }
    }

    await db
      .update(teamTrackerItems)
      .set(setFields)
      .where(eq(teamTrackerItems.id, itemId));

    const rows = await db
      .select()
      .from(teamTrackerItems)
      .where(eq(teamTrackerItems.id, itemId))
      .limit(1);

    if (!rows[0]) throw new Error("Item not found");
    return mapItem(rows[0]!);
  }

  async deleteItem(itemId: number): Promise<void> {
    await db
      .delete(teamTrackerItems)
      .where(eq(teamTrackerItems.id, itemId));
  }

  async setCurrentItem(itemId: number): Promise<TrackerWorkItem> {
    // Get the item to find its day
    const items = await db
      .select()
      .from(teamTrackerItems)
      .where(eq(teamTrackerItems.id, itemId))
      .limit(1);

    if (!items[0]) throw new Error("Item not found");
    const dayId = items[0].dayId;
    const now = nowIso();

    // Reset all current in_progress items for this day to planned
    await db
      .update(teamTrackerItems)
      .set({ state: "planned", updatedAt: now })
      .where(
        and(
          eq(teamTrackerItems.dayId, dayId),
          eq(teamTrackerItems.state, "in_progress")
        )
      );

    // Set the target item to in_progress
    await db
      .update(teamTrackerItems)
      .set({ state: "in_progress", updatedAt: now })
      .where(eq(teamTrackerItems.id, itemId));

    const updated = await db
      .select()
      .from(teamTrackerItems)
      .where(eq(teamTrackerItems.id, itemId))
      .limit(1);

    if (!updated[0]) throw new Error("Item not found after update");
    return mapItem(updated[0]);
  }

  async addCheckIn(
    accountId: string,
    date: string,
    params: {
      summary: string;
      status?: TrackerDeveloperStatus;
    }
  ): Promise<TrackerCheckIn> {
    const day = await this.ensureDay(date, accountId);
    const now = nowIso();

    const inserted = await db
      .insert(teamTrackerCheckIns)
      .values({
        dayId: day.id,
        summary: params.summary,
        createdAt: now,
      })
      .returning();

    const checkInRow = inserted[0]!;

    // Update last check-in time on the day row
    const dayUpdates: Record<string, unknown> = {
      lastCheckInAt: now,
      updatedAt: now,
    };
    if (params.status) {
      dayUpdates.status = params.status;
    }
    await db
      .update(teamTrackerDays)
      .set(dayUpdates)
      .where(eq(teamTrackerDays.id, day.id));

    return mapCheckIn(checkInRow);
  }

  async carryForward(fromDate: string, toDate: string): Promise<number> {
    const dayRows = await db
      .select()
      .from(teamTrackerDays)
      .where(eq(teamTrackerDays.date, fromDate));

    let carried = 0;

    for (const dayRow of dayRows) {
      const items = await db
        .select()
        .from(teamTrackerItems)
        .where(eq(teamTrackerItems.dayId, dayRow.id));

      const unfinished = items.filter(
        (i) => i.state === "planned" || i.state === "in_progress"
      );

      if (unfinished.length === 0) continue;

      const newDay = await this.ensureDay(toDate, dayRow.developerAccountId);
      const targetItems = await db
        .select()
        .from(teamTrackerItems)
        .where(eq(teamTrackerItems.dayId, newDay.id));
      const targetCounts = new Map<string, number>();
      for (const item of targetItems) {
        const key = buildCarryForwardKey(item);
        targetCounts.set(key, (targetCounts.get(key) ?? 0) + 1);
      }

      const sourceCounts = new Map<string, number>();
      for (const item of unfinished) {
        const key = buildCarryForwardKey(item);
        sourceCounts.set(key, (sourceCounts.get(key) ?? 0) + 1);
      }

      const remainingToCarry = new Map<string, number>();
      for (const [key, count] of sourceCounts.entries()) {
        remainingToCarry.set(key, Math.max(0, count - (targetCounts.get(key) ?? 0)));
      }

      let nextPosition =
        targetItems.reduce((max, item) => Math.max(max, item.position), -1) + 1;
      const now = nowIso();

      for (const item of unfinished.sort((a, b) => a.position - b.position)) {
        const key = buildCarryForwardKey(item);
        const remaining = remainingToCarry.get(key) ?? 0;
        if (remaining === 0) {
          continue;
        }

        await db.insert(teamTrackerItems).values({
          dayId: newDay.id,
          itemType: item.itemType,
          jiraKey: item.jiraKey,
          title: item.title,
          state: "planned",
          position: nextPosition,
          note: item.note,
          createdAt: now,
          updatedAt: now,
        });
        remainingToCarry.set(key, remaining - 1);
        nextPosition += 1;
        carried++;
      }
    }

    return carried;
  }

  private computeSummary(days: TrackerDeveloperDay[]): TrackerBoardSummary {
    return {
      total: days.length,
      stale: days.filter((d) => d.isStale).length,
      blocked: days.filter((d) => d.status === "blocked").length,
      atRisk: days.filter((d) => d.status === "at_risk").length,
      waiting: days.filter((d) => d.status === "waiting").length,
      noCurrent: days.filter((d) => !d.currentItem).length,
      doneForToday: days.filter((d) => d.status === "done_for_today").length,
    };
  }
}
