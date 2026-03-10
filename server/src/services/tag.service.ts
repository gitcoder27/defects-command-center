import { and, desc, eq } from "drizzle-orm";
import type { LocalTag, TagUsageResponse } from "shared/types";
import { db } from "../db/connection";
import { issues, localTags, issueTags } from "../db/schema";

export class TagService {
  async getAll(): Promise<LocalTag[]> {
    return db.select().from(localTags);
  }

  async getById(id: number): Promise<LocalTag | undefined> {
    const rows = await db.select().from(localTags).where(eq(localTags.id, id)).limit(1);
    return rows[0];
  }

  async create(name: string, color: string): Promise<LocalTag> {
    const rows = await db
      .insert(localTags)
      .values({ name, color })
      .returning({ id: localTags.id, name: localTags.name, color: localTags.color });
    return rows[0]!;
  }

  async getUsage(id: number): Promise<TagUsageResponse | undefined> {
    const tag = await this.getById(id);
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
      .leftJoin(issues, eq(issueTags.jiraKey, issues.jiraKey))
      .where(eq(issueTags.tagId, id))
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

  async remove(id: number): Promise<void> {
    await db.delete(issueTags).where(eq(issueTags.tagId, id));
    await db.delete(localTags).where(eq(localTags.id, id));
  }

  async setIssueTags(jiraKey: string, tagIds: number[]): Promise<LocalTag[]> {
    const uniqueTagIds = Array.from(new Set(tagIds));

    await db.delete(issueTags).where(eq(issueTags.jiraKey, jiraKey));
    for (const tagId of uniqueTagIds) {
      await db.insert(issueTags).values({ jiraKey, tagId });
    }
    const rows = await db
      .select({ id: localTags.id, name: localTags.name, color: localTags.color })
      .from(issueTags)
      .innerJoin(localTags, eq(issueTags.tagId, localTags.id))
      .where(eq(issueTags.jiraKey, jiraKey));
    return rows;
  }

  async addIssueTag(jiraKey: string, tagId: number): Promise<void> {
    await db.insert(issueTags).values({ jiraKey, tagId }).onConflictDoNothing();
  }

  async removeIssueTag(jiraKey: string, tagId: number): Promise<void> {
    await db
      .delete(issueTags)
      .where(and(eq(issueTags.jiraKey, jiraKey), eq(issueTags.tagId, tagId)));
  }
}
