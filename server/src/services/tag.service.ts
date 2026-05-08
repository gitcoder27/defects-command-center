import { and, desc, eq } from "drizzle-orm";
import type { LocalTag, TagUsageResponse } from "shared/types";
import { db } from "../db/connection";
import { issues, localTags, issueTags } from "../db/schema";
import { HttpError } from "../middleware/errorHandler";
import { normalizeWorkspaceId } from "./workspace.service";

export class TagService {
  async getAll(workspaceId?: string): Promise<LocalTag[]> {
    return db.select().from(localTags).where(eq(localTags.workspaceId, normalizeWorkspaceId(workspaceId)));
  }

  async getById(id: number, workspaceId?: string): Promise<LocalTag | undefined> {
    const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
    const rows = await db
      .select()
      .from(localTags)
      .where(and(eq(localTags.workspaceId, normalizedWorkspaceId), eq(localTags.id, id)))
      .limit(1);
    return rows[0];
  }

  async create(name: string, color: string, workspaceId?: string): Promise<LocalTag> {
    const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
    const rows = await db
      .insert(localTags)
      .values({ workspaceId: normalizedWorkspaceId, name, color })
      .returning({ id: localTags.id, name: localTags.name, color: localTags.color });
    return rows[0]!;
  }

  async getUsage(id: number, workspaceId?: string): Promise<TagUsageResponse | undefined> {
    const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
    const tag = await this.getById(id, normalizedWorkspaceId);
    if (!tag) {
      return undefined;
    }

    const rows = await db
      .select({
        jiraKey: issueTags.jiraKey,
        summary: issues.summary,
        assigneeName: issues.assigneeName,
        statusName: issues.statusName,
        updatedAt: issues.updatedAt,
      })
      .from(issueTags)
      .leftJoin(issues, and(eq(issueTags.workspaceId, issues.workspaceId), eq(issueTags.jiraKey, issues.jiraKey)))
      .where(and(eq(issueTags.workspaceId, normalizedWorkspaceId), eq(issueTags.tagId, id)))
      .orderBy(desc(issues.updatedAt));

    const issueKeys = new Set<string>();
    const syncedIssues = new Map<string, TagUsageResponse["issues"][number]>();

    for (const row of rows) {
      issueKeys.add(row.jiraKey);

      if (
        row.summary !== null &&
        row.statusName !== null &&
        row.updatedAt !== null &&
        !syncedIssues.has(row.jiraKey)
      ) {
        syncedIssues.set(row.jiraKey, {
          jiraKey: row.jiraKey,
          summary: row.summary,
          assigneeName: row.assigneeName ?? undefined,
          statusName: row.statusName,
          updatedAt: row.updatedAt,
        });
      }
    }

    return {
      tag,
      issueCount: issueKeys.size,
      issues: Array.from(syncedIssues.values()),
    };
  }

  async remove(id: number, workspaceId?: string): Promise<void> {
    const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
    await db.delete(issueTags).where(and(eq(issueTags.workspaceId, normalizedWorkspaceId), eq(issueTags.tagId, id)));
    await db.delete(localTags).where(and(eq(localTags.workspaceId, normalizedWorkspaceId), eq(localTags.id, id)));
  }

  async setIssueTags(jiraKey: string, tagIds: number[], workspaceId?: string): Promise<LocalTag[]> {
    const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
    const uniqueTagIds = Array.from(new Set(tagIds));

    const issueRows = await db
      .select({ jiraKey: issues.jiraKey })
      .from(issues)
      .where(and(eq(issues.workspaceId, normalizedWorkspaceId), eq(issues.jiraKey, jiraKey)))
      .limit(1);
    if (!issueRows[0]) {
      throw new HttpError(404, "Issue not found");
    }

    if (uniqueTagIds.length > 0) {
      const ownedTags = await db
        .select({ id: localTags.id })
        .from(localTags)
        .where(eq(localTags.workspaceId, normalizedWorkspaceId));
      const ownedTagIds = new Set(ownedTags.map((tag) => tag.id));
      if (!uniqueTagIds.every((tagId) => ownedTagIds.has(tagId))) {
        throw new HttpError(400, "One or more tags do not belong to this workspace");
      }
    }

    await db.delete(issueTags).where(and(eq(issueTags.workspaceId, normalizedWorkspaceId), eq(issueTags.jiraKey, jiraKey)));
    for (const tagId of uniqueTagIds) {
      await db.insert(issueTags).values({ workspaceId: normalizedWorkspaceId, jiraKey, tagId });
    }
    const rows = await db
      .select({ id: localTags.id, name: localTags.name, color: localTags.color })
      .from(issueTags)
      .innerJoin(localTags, eq(issueTags.tagId, localTags.id))
      .where(and(eq(issueTags.workspaceId, normalizedWorkspaceId), eq(issueTags.jiraKey, jiraKey)));
    return rows;
  }

  async addIssueTag(jiraKey: string, tagId: number, workspaceId?: string): Promise<void> {
    const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
    await db.insert(issueTags).values({ workspaceId: normalizedWorkspaceId, jiraKey, tagId }).onConflictDoNothing();
  }

  async removeIssueTag(jiraKey: string, tagId: number, workspaceId?: string): Promise<void> {
    const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
    await db
      .delete(issueTags)
      .where(and(eq(issueTags.workspaceId, normalizedWorkspaceId), eq(issueTags.jiraKey, jiraKey), eq(issueTags.tagId, tagId)));
  }
}
