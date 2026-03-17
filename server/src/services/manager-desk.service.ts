import { and, desc, eq, inArray, like, or } from "drizzle-orm";
import type {
  ManagerDeskAssignee,
  ManagerDeskCategory,
  ManagerDeskDayResponse,
  ManagerDeskDeveloperLookupItem,
  ManagerDeskIssueLookupItem,
  ManagerDeskItem,
  ManagerDeskItemKind,
  ManagerDeskLink,
  ManagerDeskLinkType,
  ManagerDeskPriority,
  ManagerDeskStatus,
  ManagerDeskSummary,
  TrackerItemState,
  TrackerSharedTaskDetailResponse,
} from "shared/types";
import { db } from "../db/connection";
import {
  developers,
  issues,
  managerDeskDays,
  managerDeskItems,
  managerDeskLinks,
  teamTrackerItems,
} from "../db/schema";
import { HttpError } from "../middleware/errorHandler";
import { TeamTrackerService } from "./team-tracker.service";
import { DeveloperAvailabilityService } from "./developer-availability.service";

interface ManagerDeskLinkInput {
  linkType: ManagerDeskLinkType;
  issueKey?: string;
  developerAccountId?: string;
  externalLabel?: string;
}

interface CreateManagerDeskItemParams {
  date: string;
  title: string;
  kind?: ManagerDeskItemKind;
  category?: ManagerDeskCategory;
  status?: ManagerDeskStatus;
  priority?: ManagerDeskPriority;
  assigneeDeveloperAccountId?: string | null;
  participants?: string | null;
  contextNote?: string | null;
  nextAction?: string | null;
  outcome?: string | null;
  plannedStartAt?: string | null;
  plannedEndAt?: string | null;
  followUpAt?: string | null;
  links?: ManagerDeskLinkInput[];
}

interface UpdateManagerDeskItemParams {
  title?: string;
  kind?: ManagerDeskItemKind;
  category?: ManagerDeskCategory;
  status?: ManagerDeskStatus;
  priority?: ManagerDeskPriority;
  assigneeDeveloperAccountId?: string | null;
  participants?: string | null;
  contextNote?: string | null;
  nextAction?: string | null;
  outcome?: string | null;
  plannedStartAt?: string | null;
  plannedEndAt?: string | null;
  followUpAt?: string | null;
}

interface CarryForwardParams {
  fromDate: string;
  toDate: string;
  itemIds?: number[];
}

interface NormalizedManagerDeskLink {
  linkType: ManagerDeskLinkType;
  issueKey?: string;
  developerAccountId?: string;
  externalLabel?: string;
}

type ManagerDeskItemRow = typeof managerDeskItems.$inferSelect;
type ManagerDeskLinkRow = typeof managerDeskLinks.$inferSelect;

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeRequiredTitle(title: string): string {
  const normalized = title.trim();
  if (!normalized) {
    throw new HttpError(400, "title is required");
  }
  return normalized;
}

function normalizeOptionalText(value: string | null | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function buildLinkIdentity(link: NormalizedManagerDeskLink): string {
  switch (link.linkType) {
    case "issue":
      return `issue:${link.issueKey}`;
    case "developer":
      return `developer:${link.developerAccountId}`;
    case "external_group":
      return `external_group:${link.externalLabel}`;
  }
}

function isOpenStatus(status: ManagerDeskStatus): boolean {
  return status !== "done" && status !== "cancelled";
}

function getItemSortTimestamp(item: Pick<ManagerDeskItemRow, "plannedStartAt" | "followUpAt" | "createdAt">): number {
  return new Date(item.plannedStartAt ?? item.followUpAt ?? item.createdAt).getTime();
}

function compareItemRows(left: ManagerDeskItemRow, right: ManagerDeskItemRow): number {
  return getItemSortTimestamp(left) - getItemSortTimestamp(right) || left.id - right.id;
}

function getCarryForwardStatus(status: ManagerDeskStatus): ManagerDeskStatus {
  if (status === "in_progress") {
    return "planned";
  }
  return status;
}

function getLegacyTrackerManagerDeskStatus(state: TrackerItemState): ManagerDeskStatus {
  if (state === "in_progress") {
    return "in_progress";
  }
  return "planned";
}

export class ManagerDeskService {
  constructor(
    private readonly trackerService = new TeamTrackerService(),
    private readonly availability = new DeveloperAvailabilityService()
  ) {}

  async getDay(managerAccountId: string, date: string): Promise<ManagerDeskDayResponse> {
    const day = await this.ensureDay(managerAccountId, date);
    const itemRows = await db
      .select()
      .from(managerDeskItems)
      .where(eq(managerDeskItems.dayId, day.id));
    const linksByItemId = await this.getLinksByItemIds(itemRows.map((item) => item.id));
    const assigneesByAccountId = await this.getAssigneeMap(itemRows, date);
    const items = itemRows
      .sort(compareItemRows)
      .map((item) =>
        this.mapItem(
          item,
          linksByItemId.get(item.id) ?? [],
          item.assigneeDeveloperAccountId
            ? assigneesByAccountId.get(item.assigneeDeveloperAccountId) ?? undefined
            : undefined
        )
      );

    return {
      date,
      items,
      summary: this.buildSummary(items),
    };
  }

  async createItem(
    managerAccountId: string,
    params: CreateManagerDeskItemParams
  ): Promise<ManagerDeskItem> {
    const day = await this.ensureDay(managerAccountId, params.date);
    const title = normalizeRequiredTitle(params.title);
    const plannedStartAt = params.plannedStartAt ?? null;
    const plannedEndAt = params.plannedEndAt ?? null;
    const followUpAt = params.followUpAt ?? null;

    this.assertTimeRange(plannedStartAt, plannedEndAt);

    const normalizedLinks = await this.normalizeLinkInputs(params.links ?? []);
    this.assertNoDuplicateLinks(normalizedLinks);
    const assigneeDeveloperAccountId = await this.normalizeAssigneeAccountId(
      params.assigneeDeveloperAccountId
    );

    const now = nowIso();
    const inserted = await db
      .insert(managerDeskItems)
      .values({
        dayId: day.id,
        sourceItemId: null,
        title,
        kind: params.kind ?? "action",
        category: params.category ?? "other",
        status: params.status ?? "inbox",
        priority: params.priority ?? "medium",
        assigneeDeveloperAccountId,
        participants: normalizeOptionalText(params.participants) ?? null,
        contextNote: normalizeOptionalText(params.contextNote) ?? null,
        nextAction: normalizeOptionalText(params.nextAction) ?? null,
        outcome: normalizeOptionalText(params.outcome) ?? null,
        plannedStartAt,
        plannedEndAt,
        followUpAt,
        completedAt: (params.status ?? "inbox") === "done" ? now : null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const item = inserted[0];
    if (!item) {
      throw new Error("Failed to create manager desk item");
    }

    for (const link of normalizedLinks) {
      await db.insert(managerDeskLinks).values({
        itemId: item.id,
        linkType: link.linkType,
        issueKey: link.issueKey ?? null,
        developerAccountId: link.developerAccountId ?? null,
        externalLabel: link.externalLabel ?? null,
        createdAt: now,
      });
    }

    await this.syncTrackerAssignment(
      item.id,
      assigneeDeveloperAccountId,
      params.date,
      title,
      normalizedLinks,
      item.status as ManagerDeskStatus
    );

    return this.getItemById(managerAccountId, item.id);
  }

  async updateItem(
    managerAccountId: string,
    itemId: number,
    updates: UpdateManagerDeskItemParams
  ): Promise<ManagerDeskItem> {
    const existing = await this.getOwnedItemRow(managerAccountId, itemId);

    const nextPlannedStartAt =
      updates.plannedStartAt !== undefined ? updates.plannedStartAt : existing.plannedStartAt;
    const nextPlannedEndAt =
      updates.plannedEndAt !== undefined ? updates.plannedEndAt : existing.plannedEndAt;
    this.assertTimeRange(nextPlannedStartAt, nextPlannedEndAt);

    const now = nowIso();
    const setFields: Partial<typeof managerDeskItems.$inferInsert> = {
      updatedAt: now,
    };

    if (updates.title !== undefined) {
      setFields.title = normalizeRequiredTitle(updates.title);
    }
    if (updates.kind !== undefined) {
      setFields.kind = updates.kind;
    }
    if (updates.category !== undefined) {
      setFields.category = updates.category;
    }
    if (updates.priority !== undefined) {
      setFields.priority = updates.priority;
    }
    if (updates.assigneeDeveloperAccountId !== undefined) {
      setFields.assigneeDeveloperAccountId = await this.normalizeAssigneeAccountId(
        updates.assigneeDeveloperAccountId
      );
    }
    if (updates.participants !== undefined) {
      setFields.participants = normalizeOptionalText(updates.participants) ?? null;
    }
    if (updates.contextNote !== undefined) {
      setFields.contextNote = normalizeOptionalText(updates.contextNote) ?? null;
    }
    if (updates.nextAction !== undefined) {
      setFields.nextAction = normalizeOptionalText(updates.nextAction) ?? null;
    }
    if (updates.outcome !== undefined) {
      setFields.outcome = normalizeOptionalText(updates.outcome) ?? null;
    }
    if (updates.plannedStartAt !== undefined) {
      setFields.plannedStartAt = updates.plannedStartAt ?? null;
    }
    if (updates.plannedEndAt !== undefined) {
      setFields.plannedEndAt = updates.plannedEndAt ?? null;
    }
    if (updates.followUpAt !== undefined) {
      setFields.followUpAt = updates.followUpAt ?? null;
    }
    if (updates.status !== undefined) {
      setFields.status = updates.status;
      if (updates.status === "done") {
        setFields.completedAt = existing.completedAt ?? now;
      } else if (existing.status === "done") {
        setFields.completedAt = null;
      }
    }

    await db
      .update(managerDeskItems)
      .set(setFields)
      .where(eq(managerDeskItems.id, itemId));

    const updatedItem = await this.getOwnedItemRow(managerAccountId, itemId);
    const updatedLinks = await this.getNormalizedLinksByItemId(itemId);
    const day = await this.getDayById(updatedItem.dayId);
    if (!day) {
      throw new Error(`Manager desk day ${updatedItem.dayId} was not found`);
    }

    await this.syncTrackerAssignment(
      itemId,
      updatedItem.assigneeDeveloperAccountId,
      day.date,
      updatedItem.title,
      updatedLinks,
      updatedItem.status as ManagerDeskStatus
    );

    return this.getItemById(managerAccountId, itemId);
  }

  async deleteItem(managerAccountId: string, itemId: number): Promise<void> {
    await this.getOwnedItemRow(managerAccountId, itemId);
    await this.trackerService.syncManagerDeskItem({
      managerDeskItemId: itemId,
      assigneeDeveloperAccountId: null,
      date: "",
      title: "",
      issueKeys: [],
    });
    await db.delete(managerDeskLinks).where(eq(managerDeskLinks.itemId, itemId));
    await db.delete(managerDeskItems).where(eq(managerDeskItems.id, itemId));
  }

  async addLink(
    managerAccountId: string,
    itemId: number,
    payload: ManagerDeskLinkInput
  ): Promise<ManagerDeskLink> {
    await this.getOwnedItemRow(managerAccountId, itemId);
    const normalizedLink = await this.normalizeLinkInput(payload);
    await this.assertItemDoesNotAlreadyHaveLink(itemId, normalizedLink);

    const now = nowIso();
    const inserted = await db
      .insert(managerDeskLinks)
      .values({
        itemId,
        linkType: normalizedLink.linkType,
        issueKey: normalizedLink.issueKey ?? null,
        developerAccountId: normalizedLink.developerAccountId ?? null,
        externalLabel: normalizedLink.externalLabel ?? null,
        createdAt: now,
      })
      .returning();

    const insertedLink = inserted[0];
    if (!insertedLink) {
      throw new Error("Failed to create manager desk link");
    }

    const linksByItemId = await this.getLinksByItemIds([itemId]);
    const createdLink = (linksByItemId.get(itemId) ?? []).find(
      (link) => link.id === insertedLink.id
    );
    if (!createdLink) {
      throw new Error("Failed to load manager desk link after insert");
    }

    const item = await this.getOwnedItemRow(managerAccountId, itemId);
    const day = await this.getDayById(item.dayId);
    if (day) {
      await this.syncTrackerAssignment(
        itemId,
        item.assigneeDeveloperAccountId,
        day.date,
        item.title,
        await this.getNormalizedLinksByItemId(itemId),
        item.status as ManagerDeskStatus
      );
    }

    return createdLink;
  }

  async deleteLink(
    managerAccountId: string,
    itemId: number,
    linkId: number
  ): Promise<void> {
    await this.getOwnedItemRow(managerAccountId, itemId);
    const rows = await db
      .select()
      .from(managerDeskLinks)
      .where(and(eq(managerDeskLinks.id, linkId), eq(managerDeskLinks.itemId, itemId)))
      .limit(1);

    if (!rows[0]) {
      throw new HttpError(404, "Link not found");
    }

    await db.delete(managerDeskLinks).where(eq(managerDeskLinks.id, linkId));

    const item = await this.getOwnedItemRow(managerAccountId, itemId);
    const day = await this.getDayById(item.dayId);
    if (day) {
      await this.syncTrackerAssignment(
        itemId,
        item.assigneeDeveloperAccountId,
        day.date,
        item.title,
        await this.getNormalizedLinksByItemId(itemId),
        item.status as ManagerDeskStatus
      );
    }
  }

  async carryForward(
    managerAccountId: string,
    params: CarryForwardParams
  ): Promise<number> {
    if (params.toDate <= params.fromDate) {
      throw new HttpError(400, "toDate must be after fromDate");
    }

    const sourceDay = await this.findDay(managerAccountId, params.fromDate);
    if (!sourceDay) {
      return 0;
    }

    let sourceItems = await db
      .select()
      .from(managerDeskItems)
      .where(eq(managerDeskItems.dayId, sourceDay.id));

    if (params.itemIds && params.itemIds.length > 0) {
      const requestedIds = new Set(params.itemIds);
      sourceItems = sourceItems.filter((item) => requestedIds.has(item.id));
      if (sourceItems.length !== requestedIds.size) {
        throw new HttpError(404, "One or more items were not found for the source date");
      }
    }

    const eligibleItems = sourceItems
      .filter((item) => item.status !== "done" && item.status !== "cancelled")
      .sort(compareItemRows);

    if (eligibleItems.length === 0) {
      return 0;
    }

    const targetDay = await this.ensureDay(managerAccountId, params.toDate);
    const targetItems = await db
      .select({
        sourceItemId: managerDeskItems.sourceItemId,
      })
      .from(managerDeskItems)
      .where(eq(managerDeskItems.dayId, targetDay.id));
    const existingSourceItemIds = new Set(
      targetItems
        .map((item) => item.sourceItemId)
        .filter((itemId): itemId is number => typeof itemId === "number")
    );
    const sourceLinksByItemId = await this.getRawLinksByItemIds(
      eligibleItems.map((item) => item.id)
    );
    const sourceTrackerNotesByItemId = await this.getTrackerNotesByManagerDeskItemIds(
      eligibleItems.map((item) => item.id)
    );

    let created = 0;
    const now = nowIso();

    for (const item of eligibleItems) {
      if (existingSourceItemIds.has(item.id)) {
        continue;
      }

      const inserted = await db
        .insert(managerDeskItems)
        .values({
          dayId: targetDay.id,
          sourceItemId: item.id,
          assigneeDeveloperAccountId: item.assigneeDeveloperAccountId,
          title: item.title,
          kind: item.kind,
          category: item.category,
          status: getCarryForwardStatus(item.status as ManagerDeskStatus),
          priority: item.priority,
          participants: item.participants,
          contextNote: item.contextNote,
          nextAction: item.nextAction,
          outcome: item.outcome,
          plannedStartAt: item.plannedStartAt,
          plannedEndAt: item.plannedEndAt,
          followUpAt: item.followUpAt,
          completedAt: null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      const carriedItem = inserted[0];
      if (!carriedItem) {
        throw new Error("Failed to carry manager desk item forward");
      }

      for (const link of sourceLinksByItemId.get(item.id) ?? []) {
        await db.insert(managerDeskLinks).values({
          itemId: carriedItem.id,
          linkType: link.linkType,
          issueKey: link.issueKey,
          developerAccountId: link.developerAccountId,
          externalLabel: link.externalLabel,
          createdAt: now,
        });
      }

      await this.syncTrackerAssignment(
        carriedItem.id,
        carriedItem.assigneeDeveloperAccountId,
        params.toDate,
        carriedItem.title,
        (sourceLinksByItemId.get(item.id) ?? []).map((link) => ({
          linkType: link.linkType as ManagerDeskLinkType,
          issueKey: link.issueKey ?? undefined,
          developerAccountId: link.developerAccountId ?? undefined,
          externalLabel: link.externalLabel ?? undefined,
        })),
        carriedItem.status as ManagerDeskStatus,
        sourceTrackerNotesByItemId.get(item.id)
      );

      existingSourceItemIds.add(item.id);
      created += 1;
    }

    return created;
  }

  async lookupIssues(query: string): Promise<ManagerDeskIssueLookupItem[]> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      return [];
    }

    const pattern = `%${normalizedQuery}%`;
    const rows = await db
      .select({
        jiraKey: issues.jiraKey,
        summary: issues.summary,
        priorityName: issues.priorityName,
        statusName: issues.statusName,
        assigneeName: issues.assigneeName,
      })
      .from(issues)
      .where(or(like(issues.jiraKey, pattern), like(issues.summary, pattern)))
      .orderBy(desc(issues.updatedAt))
      .limit(20);

    return rows.map((row) => ({
      jiraKey: row.jiraKey,
      summary: row.summary,
      priorityName: row.priorityName,
      statusName: row.statusName,
      assigneeName: row.assigneeName ?? undefined,
    }));
  }

  async lookupDevelopers(query: string, date?: string): Promise<ManagerDeskDeveloperLookupItem[]> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      return [];
    }

    const pattern = `%${normalizedQuery}%`;
    const rows = await db
      .select({
        accountId: developers.accountId,
        displayName: developers.displayName,
        email: developers.email,
        avatarUrl: developers.avatarUrl,
      })
      .from(developers)
      .where(
        and(
          eq(developers.isActive, 1),
          or(
            like(developers.accountId, pattern),
            like(developers.displayName, pattern),
            like(developers.email, pattern)
          )
        )
      )
      .limit(20);

    const availabilityByAccountId = date
      ? await this.availability.getAvailabilityMapForDate(
          rows.map((row) => row.accountId),
          date
        )
      : new Map();

    return rows
      .map((row) => ({
        accountId: row.accountId,
        displayName: row.displayName,
        email: row.email ?? undefined,
        avatarUrl: row.avatarUrl ?? undefined,
        availability: availabilityByAccountId.get(row.accountId),
      }))
      .sort((left, right) => {
        const leftInactive = left.availability?.state === "inactive" ? 1 : 0;
        const rightInactive = right.availability?.state === "inactive" ? 1 : 0;
        return leftInactive - rightInactive || left.displayName.localeCompare(right.displayName);
      });
  }

  async getTrackerTaskDetail(
    managerAccountId: string,
    trackerItemId: number
  ): Promise<TrackerSharedTaskDetailResponse> {
    const trackerContext = await this.trackerService.getItemDetailContext(trackerItemId);
    const managerDeskItemId =
      trackerContext.trackerItem.managerDeskItemId ??
      (await this.createManagerDeskItemFromTrackerItem(managerAccountId, trackerContext));

    const managerDeskItem = await this.getItemById(managerAccountId, managerDeskItemId);

    return {
      date: trackerContext.date,
      developer: trackerContext.developer,
      managerDeskItem,
      trackerItem: {
        ...trackerContext.trackerItem,
        managerDeskItemId,
      },
    };
  }

  async getTaskDetailByItemId(
    managerAccountId: string,
    itemId: number
  ): Promise<TrackerSharedTaskDetailResponse> {
    const managerDeskItem = await this.getItemById(managerAccountId, itemId);
    const trackerContext =
      await this.trackerService.getItemDetailContextForManagerDeskItem(itemId);

    if (!trackerContext) {
      throw new HttpError(404, "Task is no longer assigned in Team Tracker");
    }

    return {
      date: trackerContext.date,
      developer: trackerContext.developer,
      managerDeskItem,
      trackerItem: trackerContext.trackerItem,
    };
  }

  async ensureDay(
    managerAccountId: string,
    date: string
  ): Promise<typeof managerDeskDays.$inferSelect> {
    const now = nowIso();
    await db
      .insert(managerDeskDays)
      .values({
        date,
        managerAccountId,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({
        target: [managerDeskDays.date, managerDeskDays.managerAccountId],
      });

    const day = await this.findDay(managerAccountId, date);
    if (!day) {
      throw new Error(`Failed to initialize manager desk day for ${managerAccountId} on ${date}`);
    }

    return day;
  }

  private buildSummary(items: ManagerDeskItem[]): ManagerDeskSummary {
    const now = Date.now();

    return {
      totalOpen: items.filter((item) => isOpenStatus(item.status)).length,
      inbox: items.filter((item) => item.status === "inbox").length,
      planned: items.filter((item) => item.status === "planned").length,
      inProgress: items.filter((item) => item.status === "in_progress").length,
      waiting: items.filter((item) => item.status === "waiting").length,
      overdueFollowUps: items.filter((item) => {
        if (!item.followUpAt || !isOpenStatus(item.status)) {
          return false;
        }
        return new Date(item.followUpAt).getTime() < now;
      }).length,
      meetings: items.filter((item) => item.kind === "meeting").length,
      completed: items.filter((item) => item.status === "done").length,
    };
  }

  private async findDay(
    managerAccountId: string,
    date: string
  ): Promise<typeof managerDeskDays.$inferSelect | undefined> {
    const rows = await db
      .select()
      .from(managerDeskDays)
      .where(
        and(
          eq(managerDeskDays.managerAccountId, managerAccountId),
          eq(managerDeskDays.date, date)
        )
      )
      .limit(1);

    return rows[0];
  }

  private async getItemById(
    managerAccountId: string,
    itemId: number
  ): Promise<ManagerDeskItem> {
    const item = await this.getOwnedItemRow(managerAccountId, itemId);
    const day = await this.getDayById(item.dayId);
    const linksByItemId = await this.getLinksByItemIds([item.id]);
    const assigneesByAccountId = await this.getAssigneeMap([item], day?.date);
    return this.mapItem(
      item,
      linksByItemId.get(item.id) ?? [],
      item.assigneeDeveloperAccountId
        ? assigneesByAccountId.get(item.assigneeDeveloperAccountId) ?? undefined
        : undefined
    );
  }

  private async getOwnedItemRow(
    managerAccountId: string,
    itemId: number
  ): Promise<ManagerDeskItemRow> {
    const item = await this.getItemRow(itemId);
    const day = await this.getDayById(item.dayId);

    if (!day || day.managerAccountId !== managerAccountId) {
      throw new HttpError(404, "Item not found");
    }

    return item;
  }

  private async getItemRow(itemId: number): Promise<ManagerDeskItemRow> {
    const rows = await db
      .select()
      .from(managerDeskItems)
      .where(eq(managerDeskItems.id, itemId))
      .limit(1);

    const row = rows[0];
    if (!row) {
      throw new HttpError(404, "Item not found");
    }

    return row;
  }

  private async getDayById(dayId: number): Promise<typeof managerDeskDays.$inferSelect | undefined> {
    const rows = await db
      .select()
      .from(managerDeskDays)
      .where(eq(managerDeskDays.id, dayId))
      .limit(1);

    return rows[0];
  }

  private async getLinksByItemIds(itemIds: number[]): Promise<Map<number, ManagerDeskLink[]>> {
    const rawLinksByItemId = await this.getRawLinksByItemIds(itemIds);
    const allLinkRows = [...rawLinksByItemId.values()].flat();
    if (allLinkRows.length === 0) {
      return new Map(itemIds.map((itemId) => [itemId, []]));
    }

    const developerIds = [...new Set(
      allLinkRows
        .map((link) => link.developerAccountId)
        .filter((accountId): accountId is string => Boolean(accountId))
    )];
    const developerNames = await this.getDeveloperDisplayNameMap(developerIds);

    const mapped = new Map<number, ManagerDeskLink[]>();
    for (const [itemId, rows] of rawLinksByItemId.entries()) {
      mapped.set(
        itemId,
        rows
          .sort((left, right) => left.id - right.id)
          .map((row) => this.mapLink(row, developerNames))
      );
    }

    return mapped;
  }

  private async getRawLinksByItemIds(itemIds: number[]): Promise<Map<number, ManagerDeskLinkRow[]>> {
    if (itemIds.length === 0) {
      return new Map();
    }

    const rows = await db
      .select()
      .from(managerDeskLinks)
      .where(inArray(managerDeskLinks.itemId, itemIds));

    const grouped = new Map<number, ManagerDeskLinkRow[]>();
    for (const itemId of itemIds) {
      grouped.set(itemId, []);
    }
    for (const row of rows) {
      const bucket = grouped.get(row.itemId);
      if (bucket) {
        bucket.push(row);
      } else {
        grouped.set(row.itemId, [row]);
      }
    }

    return grouped;
  }

  private async getDeveloperDisplayNameMap(
    developerIds: string[]
  ): Promise<Map<string, string>> {
    if (developerIds.length === 0) {
      return new Map();
    }

    const rows = await db
      .select({
        accountId: developers.accountId,
        displayName: developers.displayName,
      })
      .from(developers)
      .where(inArray(developers.accountId, developerIds));

    return new Map(rows.map((row) => [row.accountId, row.displayName]));
  }

  private async getAssigneeMap(
    items: Pick<ManagerDeskItemRow, "assigneeDeveloperAccountId">[],
    date?: string
  ): Promise<Map<string, ManagerDeskAssignee>> {
    const assigneeIds = [...new Set(
      items
        .map((item) => item.assigneeDeveloperAccountId)
        .filter((accountId): accountId is string => Boolean(accountId))
    )];

    if (assigneeIds.length === 0) {
      return new Map();
    }

    const rows = await db
      .select({
        accountId: developers.accountId,
        displayName: developers.displayName,
        avatarUrl: developers.avatarUrl,
      })
      .from(developers)
      .where(inArray(developers.accountId, assigneeIds));

    const availabilityByAccountId = date
      ? await this.availability.getAvailabilityMapForDate(assigneeIds, date)
      : new Map();

    return new Map(
      rows.map((row) => [
        row.accountId,
        {
          accountId: row.accountId,
          displayName: row.displayName,
          avatarUrl: row.avatarUrl ?? undefined,
          availability: availabilityByAccountId.get(row.accountId),
        },
      ])
    );
  }

  private mapItem(
    item: ManagerDeskItemRow,
    links: ManagerDeskLink[],
    assignee?: ManagerDeskAssignee
  ): ManagerDeskItem {
    return {
      id: item.id,
      dayId: item.dayId,
      title: item.title,
      kind: item.kind as ManagerDeskItemKind,
      category: item.category as ManagerDeskCategory,
      status: item.status as ManagerDeskStatus,
      priority: item.priority as ManagerDeskPriority,
      assigneeDeveloperAccountId: item.assigneeDeveloperAccountId ?? undefined,
      participants: item.participants ?? undefined,
      contextNote: item.contextNote ?? undefined,
      nextAction: item.nextAction ?? undefined,
      outcome: item.outcome ?? undefined,
      plannedStartAt: item.plannedStartAt ?? undefined,
      plannedEndAt: item.plannedEndAt ?? undefined,
      followUpAt: item.followUpAt ?? undefined,
      completedAt: item.completedAt ?? undefined,
      assignee,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      links,
    };
  }

  private mapLink(
    link: ManagerDeskLinkRow,
    developerNames: Map<string, string>
  ): ManagerDeskLink {
    return {
      id: link.id,
      itemId: link.itemId,
      linkType: link.linkType as ManagerDeskLinkType,
      issueKey: link.issueKey ?? undefined,
      developerAccountId: link.developerAccountId ?? undefined,
      externalLabel: link.externalLabel ?? undefined,
      displayLabel: this.getLinkDisplayLabel(link, developerNames),
      createdAt: link.createdAt,
    };
  }

  private getLinkDisplayLabel(
    link: Pick<
      ManagerDeskLinkRow,
      "linkType" | "issueKey" | "developerAccountId" | "externalLabel"
    >,
    developerNames: Map<string, string>
  ): string {
    if (link.linkType === "issue") {
      return link.issueKey ?? "Issue";
    }

    if (link.linkType === "developer") {
      return developerNames.get(link.developerAccountId ?? "") ?? link.developerAccountId ?? "Developer";
    }

    return link.externalLabel ?? "External Group";
  }

  private assertTimeRange(
    plannedStartAt: string | null | undefined,
    plannedEndAt: string | null | undefined
  ): void {
    if (!plannedStartAt || !plannedEndAt) {
      return;
    }

    if (new Date(plannedEndAt).getTime() < new Date(plannedStartAt).getTime()) {
      throw new HttpError(400, "plannedEndAt must be greater than or equal to plannedStartAt");
    }
  }

  private async normalizeLinkInputs(
    links: ManagerDeskLinkInput[]
  ): Promise<NormalizedManagerDeskLink[]> {
    const normalized: NormalizedManagerDeskLink[] = [];
    for (const link of links) {
      normalized.push(await this.normalizeLinkInput(link));
    }
    return normalized;
  }

  private async getNormalizedLinksByItemId(itemId: number): Promise<NormalizedManagerDeskLink[]> {
    const rows = (await this.getRawLinksByItemIds([itemId])).get(itemId) ?? [];
    return rows.map((row) => ({
      linkType: row.linkType as ManagerDeskLinkType,
      issueKey: row.issueKey ?? undefined,
      developerAccountId: row.developerAccountId ?? undefined,
      externalLabel: row.externalLabel ?? undefined,
    }));
  }

  private async normalizeAssigneeAccountId(
    accountId: string | null | undefined
  ): Promise<string | null | undefined> {
    if (accountId === undefined) {
      return undefined;
    }
    if (accountId === null) {
      return null;
    }

    const normalized = accountId.trim();
    if (!normalized) {
      return null;
    }

    const rows = await db
      .select({ accountId: developers.accountId })
      .from(developers)
      .where(and(eq(developers.accountId, normalized), eq(developers.isActive, 1)))
      .limit(1);

    if (!rows[0]) {
      throw new HttpError(400, `Active team member ${normalized} was not found`);
    }

    return normalized;
  }

  private async syncTrackerAssignment(
    managerDeskItemId: number,
    assigneeDeveloperAccountId: string | null | undefined,
    date: string,
    title: string,
    links: NormalizedManagerDeskLink[],
    status: ManagerDeskStatus,
    note?: string | null
  ): Promise<void> {
    await this.trackerService.syncManagerDeskItem({
      managerDeskItemId,
      assigneeDeveloperAccountId: isOpenStatus(status) ? assigneeDeveloperAccountId : null,
      date,
      title,
      issueKeys: links
        .filter((link) => link.linkType === "issue" && link.issueKey)
        .map((link) => link.issueKey!),
      note,
    });
  }

  private async getTrackerNotesByManagerDeskItemIds(
    itemIds: number[]
  ): Promise<Map<number, string | null>> {
    if (itemIds.length === 0) {
      return new Map();
    }

    const rows = await db
      .select({
        managerDeskItemId: teamTrackerItems.managerDeskItemId,
        note: teamTrackerItems.note,
      })
      .from(teamTrackerItems)
      .where(inArray(teamTrackerItems.managerDeskItemId, itemIds));

    return new Map(
      rows
        .filter((row): row is { managerDeskItemId: number; note: string | null } => {
          return row.managerDeskItemId !== null;
        })
        .map((row) => [row.managerDeskItemId, row.note])
    );
  }

  private async createManagerDeskItemFromTrackerItem(
    managerAccountId: string,
    trackerContext: Awaited<ReturnType<TeamTrackerService["getItemDetailContext"]>>
  ): Promise<number> {
    const day = await this.ensureDay(managerAccountId, trackerContext.date);
    const now = nowIso();
    const inserted = await db
      .insert(managerDeskItems)
      .values({
        dayId: day.id,
        sourceItemId: null,
        assigneeDeveloperAccountId: trackerContext.developer.accountId,
        title: trackerContext.trackerItem.title,
        kind: "action",
        category: "other",
        status: getLegacyTrackerManagerDeskStatus(trackerContext.trackerItem.state),
        priority: "medium",
        participants: null,
        contextNote: trackerContext.trackerItem.note ?? null,
        nextAction: null,
        outcome: null,
        plannedStartAt: null,
        plannedEndAt: null,
        followUpAt: null,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const item = inserted[0];
    if (!item) {
      throw new Error("Failed to create manager desk item from tracker item");
    }

    if (trackerContext.trackerItem.jiraKey) {
      await db.insert(managerDeskLinks).values({
        itemId: item.id,
        linkType: "issue",
        issueKey: trackerContext.trackerItem.jiraKey,
        developerAccountId: null,
        externalLabel: null,
        createdAt: now,
      });
    }

    await this.trackerService.linkManagerDeskItem(trackerContext.trackerItem.id, item.id);

    return item.id;
  }

  private async normalizeLinkInput(
    link: ManagerDeskLinkInput
  ): Promise<NormalizedManagerDeskLink> {
    if (link.linkType === "issue") {
      const issueKey = link.issueKey?.trim().toUpperCase();
      if (!issueKey) {
        throw new HttpError(400, "issueKey is required for issue links");
      }

      const issueRows = await db
        .select({ jiraKey: issues.jiraKey })
        .from(issues)
        .where(eq(issues.jiraKey, issueKey))
        .limit(1);
      if (!issueRows[0]) {
        throw new HttpError(400, `Jira issue ${issueKey} is not available in synced issues`);
      }

      return {
        linkType: "issue",
        issueKey,
      };
    }

    if (link.linkType === "developer") {
      const developerAccountId = link.developerAccountId?.trim();
      if (!developerAccountId) {
        throw new HttpError(400, "developerAccountId is required for developer links");
      }

      const developerRows = await db
        .select({ accountId: developers.accountId })
        .from(developers)
        .where(eq(developers.accountId, developerAccountId))
        .limit(1);
      if (!developerRows[0]) {
        throw new HttpError(400, `Developer ${developerAccountId} was not found`);
      }

      return {
        linkType: "developer",
        developerAccountId,
      };
    }

    const externalLabel = link.externalLabel?.trim();
    if (!externalLabel) {
      throw new HttpError(400, "externalLabel is required for external_group links");
    }

    return {
      linkType: "external_group",
      externalLabel,
    };
  }

  private assertNoDuplicateLinks(links: NormalizedManagerDeskLink[]): void {
    const seen = new Set<string>();

    for (const link of links) {
      const identity = buildLinkIdentity(link);
      if (seen.has(identity)) {
        throw new HttpError(409, "Duplicate links are not allowed on the same item");
      }
      seen.add(identity);
    }
  }

  private async assertItemDoesNotAlreadyHaveLink(
    itemId: number,
    link: NormalizedManagerDeskLink
  ): Promise<void> {
    const existingLinks = (await this.getRawLinksByItemIds([itemId])).get(itemId) ?? [];
    const existingIdentities = new Set(
      existingLinks.map((existingLink) =>
        buildLinkIdentity({
          linkType: existingLink.linkType as ManagerDeskLinkType,
          issueKey: existingLink.issueKey ?? undefined,
          developerAccountId: existingLink.developerAccountId ?? undefined,
          externalLabel: existingLink.externalLabel ?? undefined,
        })
      )
    );

    if (existingIdentities.has(buildLinkIdentity(link))) {
      throw new HttpError(409, "Identical link already exists for this item");
    }
  }
}
