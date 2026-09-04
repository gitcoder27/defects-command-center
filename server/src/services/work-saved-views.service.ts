import { and, eq, ne } from "drizzle-orm";
import type {
  FilterType,
  WorkSavedView,
  WorkSavedViewInput,
  WorkSavedViewUpdate,
} from "shared/types";
import { db } from "../db/connection";
import { workSavedViews } from "../db/schema";
import { HttpError } from "../middleware/errorHandler";
import { normalizeWorkspaceId } from "./workspace.service";

const FILTER_VALUES: FilterType[] = [
  "all",
  "new",
  "recentlyAssigned",
  "inProgress",
  "reopened",
  "unassigned",
  "dueToday",
  "dueThisWeek",
  "noDueDate",
  "overdue",
  "blocked",
  "stale",
  "highPriority",
  "outOfTeam",
];

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeFilter(filter: FilterType): FilterType {
  return FILTER_VALUES.includes(filter) ? filter : "all";
}

function mapSavedView(row: typeof workSavedViews.$inferSelect): WorkSavedView {
  return {
    id: row.id,
    name: row.name,
    filter: row.filter as FilterType,
    developerAccountId: row.developerAccountId,
    tagId: row.tagId,
    noTagsFilter: row.noTags === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class WorkSavedViewsService {
  async listSavedViews(managerAccountId: string, workspaceId?: string): Promise<WorkSavedView[]> {
    const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
    const rows = await db
      .select()
      .from(workSavedViews)
      .where(
        and(
          eq(workSavedViews.workspaceId, normalizedWorkspaceId),
          eq(workSavedViews.managerAccountId, managerAccountId)
        )
      );

    return rows
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || right.id - left.id)
      .map(mapSavedView);
  }

  async createSavedView(
    managerAccountId: string,
    input: WorkSavedViewInput,
    workspaceId?: string
  ): Promise<WorkSavedView> {
    const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
    const name = input.name.trim();
    if (!name) {
      throw new HttpError(400, "name is required");
    }

    await this.assertSavedViewNameAvailable(managerAccountId, name, undefined, normalizedWorkspaceId);

    const now = nowIso();
    const inserted = await db
      .insert(workSavedViews)
      .values({
        workspaceId: normalizedWorkspaceId,
        managerAccountId,
        name,
        filter: normalizeFilter(input.filter ?? "all"),
        developerAccountId: input.developerAccountId ?? null,
        tagId: input.tagId ?? null,
        noTags: input.noTagsFilter ? 1 : 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return mapSavedView(inserted[0]!);
  }

  async updateSavedView(
    managerAccountId: string,
    viewId: number,
    input: WorkSavedViewUpdate,
    workspaceId?: string
  ): Promise<WorkSavedView> {
    const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
    const existing = await this.getOwnedSavedViewRow(managerAccountId, viewId, normalizedWorkspaceId);
    const nextName = input.name !== undefined ? input.name.trim() : existing.name;

    if (!nextName) {
      throw new HttpError(400, "name is required");
    }

    await this.assertSavedViewNameAvailable(managerAccountId, nextName, viewId, normalizedWorkspaceId);

    await db
      .update(workSavedViews)
      .set({
        name: nextName,
        filter: normalizeFilter(input.filter ?? (existing.filter as FilterType)),
        developerAccountId:
          input.developerAccountId !== undefined ? input.developerAccountId : existing.developerAccountId,
        tagId: input.tagId !== undefined ? input.tagId : existing.tagId,
        noTags: input.noTagsFilter !== undefined ? (input.noTagsFilter ? 1 : 0) : existing.noTags,
        updatedAt: nowIso(),
      })
      .where(eq(workSavedViews.id, viewId));

    const updated = await this.getOwnedSavedViewRow(managerAccountId, viewId, normalizedWorkspaceId);
    return mapSavedView(updated);
  }

  async deleteSavedView(managerAccountId: string, viewId: number, workspaceId?: string): Promise<void> {
    await this.getOwnedSavedViewRow(managerAccountId, viewId, workspaceId);

    await db.delete(workSavedViews).where(eq(workSavedViews.id, viewId));
  }

  private async getOwnedSavedViewRow(
    managerAccountId: string,
    viewId: number,
    workspaceId?: string
  ): Promise<typeof workSavedViews.$inferSelect> {
    const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
    const rows = await db
      .select()
      .from(workSavedViews)
      .where(
        and(
          eq(workSavedViews.id, viewId),
          eq(workSavedViews.workspaceId, normalizedWorkspaceId),
          eq(workSavedViews.managerAccountId, managerAccountId)
        )
      )
      .limit(1);

    const row = rows[0];
    if (!row) {
      throw new HttpError(404, "Saved view not found");
    }

    return row;
  }

  private async assertSavedViewNameAvailable(
    managerAccountId: string,
    name: string,
    excludeViewId: number | undefined,
    workspaceId: string
  ): Promise<void> {
    const rows = await db
      .select({ id: workSavedViews.id })
      .from(workSavedViews)
      .where(
        and(
          eq(workSavedViews.workspaceId, workspaceId),
          eq(workSavedViews.managerAccountId, managerAccountId),
          eq(workSavedViews.name, name),
          excludeViewId !== undefined ? ne(workSavedViews.id, excludeViewId) : undefined
        )
      )
      .limit(1);

    if (rows.length > 0) {
      throw new HttpError(409, `A saved view named "${name}" already exists`);
    }
  }
}
