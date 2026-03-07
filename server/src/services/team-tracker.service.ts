import { and, eq, inArray } from "drizzle-orm";
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
  issues,
  teamTrackerDays,
  teamTrackerItems,
  teamTrackerCheckIns,
} from "../db/schema";
import { getEffectiveDueDate } from "./issue-rules";
import { HttpError } from "../middleware/errorHandler";

const STALE_HOURS = 4;

function nowIso(): string {
  return new Date().toISOString();
}

function isStale(lastCheckInAt: string | null, now = new Date()): boolean {
  if (!lastCheckInAt) return true;
  const diff = now.getTime() - new Date(lastCheckInAt).getTime();
  return diff > STALE_HOURS * 60 * 60 * 1000;
}

type TrackerIssueContext = Pick<
  typeof issues.$inferSelect,
  "jiraKey" | "priorityName" | "dueDate" | "developmentDueDate"
>;

function mapItem(
  row: typeof teamTrackerItems.$inferSelect,
  issueContext?: TrackerIssueContext
): TrackerWorkItem {
  return {
    id: row.id,
    dayId: row.dayId,
    itemType: row.itemType as TrackerItemType,
    jiraKey: row.jiraKey ?? undefined,
    jiraPriorityName: issueContext?.priorityName ?? undefined,
    jiraDueDate: issueContext
      ? getEffectiveDueDate(issueContext) ?? undefined
      : undefined,
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

      const mapped = (await this.mapItemsWithIssueContext(items)).sort(
        (a, b) => a.position - b.position
      );
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
    const normalizedJiraKey = params.jiraKey?.trim();

    if (params.itemType === "jira") {
      if (!normalizedJiraKey) {
        throw new HttpError(400, "jiraKey is required for Jira items");
      }

      const issueRows = await db
        .select({ jiraKey: issues.jiraKey })
        .from(issues)
        .where(eq(issues.jiraKey, normalizedJiraKey))
        .limit(1);

      if (!issueRows[0]) {
        throw new HttpError(
          400,
          `Jira issue ${normalizedJiraKey} is not available in synced issues`
        );
      }
    }

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
        jiraKey: normalizedJiraKey ?? null,
        title: params.title,
        state: "planned",
        position: maxPosition + 1,
        note: params.note ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.getItemById(inserted[0]!.id);
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
    const existing = await this.getItemRow(itemId);
    const now = nowIso();
    const setFields: Record<string, unknown> = { updatedAt: now };

    if (updates.title !== undefined) setFields.title = updates.title;
    if (updates.note !== undefined) setFields.note = updates.note;
    if (updates.state !== undefined) {
      if (updates.state === "in_progress") {
        await this.setSingleInProgress(existing.dayId, itemId, now);
      }
      setFields.state = updates.state;
      if (updates.state === "done") {
        setFields.completedAt = now;
      } else {
        setFields.completedAt = null;
      }
    }

    if (updates.position !== undefined) {
      await this.reorderItem(existing, updates.position, now);
    }

    if (Object.keys(setFields).length > 1) {
      await db
        .update(teamTrackerItems)
        .set(setFields)
        .where(eq(teamTrackerItems.id, itemId));
    }

    return this.getItemById(itemId);
  }

  async deleteItem(itemId: number): Promise<void> {
    await db
      .delete(teamTrackerItems)
      .where(eq(teamTrackerItems.id, itemId));
  }

  async setCurrentItem(itemId: number): Promise<TrackerWorkItem> {
    // Get the item to find its day
    const item = await this.getItemRow(itemId);
    const now = nowIso();

    await this.setSingleInProgress(item.dayId, itemId, now);

    const updated = await db
      .select()
      .from(teamTrackerItems)
      .where(eq(teamTrackerItems.id, itemId))
      .limit(1);

    if (!updated[0]) throw new Error("Item not found after update");
    return this.getItemById(updated[0].id);
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

  async previewCarryForward(fromDate: string, toDate: string): Promise<number> {
    const dayRows = await db
      .select()
      .from(teamTrackerDays)
      .where(eq(teamTrackerDays.date, fromDate));

    let carryable = 0;

    for (const dayRow of dayRows) {
      const items = await db
        .select()
        .from(teamTrackerItems)
        .where(eq(teamTrackerItems.dayId, dayRow.id));

      const unfinished = items
        .filter((i) => i.state === "planned" || i.state === "in_progress")
        .sort((a, b) => a.position - b.position);

      if (unfinished.length === 0) {
        continue;
      }

      const targetItems = await this.getTargetCarryForwardItems(
        toDate,
        dayRow.developerAccountId
      );
      const remainingToCarry = this.buildRemainingCarryForwardMap(
        unfinished,
        targetItems
      );

      for (const item of unfinished) {
        const key = buildCarryForwardKey(item);
        const remaining = remainingToCarry.get(key) ?? 0;
        if (remaining > 0) {
          carryable += 1;
          remainingToCarry.set(key, remaining - 1);
        }
      }
    }

    return carryable;
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
      const remainingToCarry = this.buildRemainingCarryForwardMap(
        unfinished,
        targetItems
      );

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

  private async getItemRow(
    itemId: number
  ): Promise<typeof teamTrackerItems.$inferSelect> {
    const rows = await db
      .select()
      .from(teamTrackerItems)
      .where(eq(teamTrackerItems.id, itemId))
      .limit(1);

    if (!rows[0]) throw new Error("Item not found");
    return rows[0];
  }

  private async getItemById(itemId: number): Promise<TrackerWorkItem> {
    const row = await this.getItemRow(itemId);
    const issueContextMap = await this.getIssueContextMap(
      row.jiraKey ? [row.jiraKey] : []
    );
    return mapItem(row, row.jiraKey ? issueContextMap.get(row.jiraKey) : undefined);
  }

  private async mapItemsWithIssueContext(
    rows: Array<typeof teamTrackerItems.$inferSelect>
  ): Promise<TrackerWorkItem[]> {
    const jiraKeys = rows
      .map((row) => row.jiraKey)
      .filter((jiraKey): jiraKey is string => Boolean(jiraKey));
    const issueContextMap = await this.getIssueContextMap(jiraKeys);

    return rows.map((row) =>
      mapItem(row, row.jiraKey ? issueContextMap.get(row.jiraKey) : undefined)
    );
  }

  private async getIssueContextMap(
    jiraKeys: string[]
  ): Promise<Map<string, TrackerIssueContext>> {
    const uniqueKeys = [...new Set(jiraKeys)];
    if (uniqueKeys.length === 0) {
      return new Map();
    }

    const rows = await db
      .select({
        jiraKey: issues.jiraKey,
        priorityName: issues.priorityName,
        dueDate: issues.dueDate,
        developmentDueDate: issues.developmentDueDate,
      })
      .from(issues)
      .where(inArray(issues.jiraKey, uniqueKeys));

    return new Map(rows.map((row) => [row.jiraKey, row]));
  }

  private buildRemainingCarryForwardMap(
    sourceItems: Array<
      Pick<
        typeof teamTrackerItems.$inferSelect,
        "itemType" | "jiraKey" | "title" | "note"
      >
    >,
    targetItems: Array<
      Pick<
        typeof teamTrackerItems.$inferSelect,
        "itemType" | "jiraKey" | "title" | "note"
      >
    >
  ): Map<string, number> {
    const targetCounts = new Map<string, number>();
    for (const item of targetItems) {
      const key = buildCarryForwardKey(item);
      targetCounts.set(key, (targetCounts.get(key) ?? 0) + 1);
    }

    const sourceCounts = new Map<string, number>();
    for (const item of sourceItems) {
      const key = buildCarryForwardKey(item);
      sourceCounts.set(key, (sourceCounts.get(key) ?? 0) + 1);
    }

    const remainingToCarry = new Map<string, number>();
    for (const [key, count] of sourceCounts.entries()) {
      remainingToCarry.set(
        key,
        Math.max(0, count - (targetCounts.get(key) ?? 0))
      );
    }

    return remainingToCarry;
  }

  private async getTargetCarryForwardItems(
    toDate: string,
    developerAccountId: string
  ): Promise<Array<typeof teamTrackerItems.$inferSelect>> {
    const targetDayRows = await db
      .select()
      .from(teamTrackerDays)
      .where(
        and(
          eq(teamTrackerDays.date, toDate),
          eq(teamTrackerDays.developerAccountId, developerAccountId)
        )
      )
      .limit(1);

    const targetDay = targetDayRows[0];
    if (!targetDay) {
      return [];
    }

    return db
      .select()
      .from(teamTrackerItems)
      .where(eq(teamTrackerItems.dayId, targetDay.id));
  }

  private async reorderItem(
    item: typeof teamTrackerItems.$inferSelect,
    targetPosition: number,
    now: string
  ): Promise<void> {
    const siblings = await db
      .select()
      .from(teamTrackerItems)
      .where(eq(teamTrackerItems.dayId, item.dayId));

    const ordered = [...siblings].sort(
      (left, right) => left.position - right.position || left.id - right.id
    );
    const currentIndex = ordered.findIndex((candidate) => candidate.id === item.id);
    if (currentIndex === -1) {
      throw new Error("Item not found");
    }

    const boundedIndex = Math.max(0, Math.min(targetPosition, ordered.length - 1));
    if (currentIndex === boundedIndex) {
      return;
    }

    const [moved] = ordered.splice(currentIndex, 1);
    if (!moved) {
      throw new Error("Item not found");
    }
    ordered.splice(boundedIndex, 0, moved);

    for (const [index, sibling] of ordered.entries()) {
      if (sibling.position === index) {
        continue;
      }

      await db
        .update(teamTrackerItems)
        .set({ position: index, updatedAt: now })
        .where(eq(teamTrackerItems.id, sibling.id));
    }
  }

  private async setSingleInProgress(
    dayId: number,
    itemId: number,
    now: string
  ): Promise<void> {
    await db
      .update(teamTrackerItems)
      .set({ state: "planned", updatedAt: now })
      .where(
        and(
          eq(teamTrackerItems.dayId, dayId),
          eq(teamTrackerItems.state, "in_progress")
        )
      );

    await db
      .update(teamTrackerItems)
      .set({ state: "in_progress", updatedAt: now, completedAt: null })
      .where(eq(teamTrackerItems.id, itemId));
  }
}
