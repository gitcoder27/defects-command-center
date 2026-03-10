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
        jiraKey: issues.jiraKey,
        summary: issues.summary,
        assigneeName: issues.assigneeName,
        statusName: issues.statusName,
        updatedAt: issues.updatedAt,
      })
      .from(issueTags)
      .innerJoin(issues, eq(issueTags.jiraKey, issues.jiraKey))
      .where(eq(issueTags.tagId, id))
      .orderBy(desc(issues.updatedAt));

    return {
      tag,
      issueCount: rows.length,
      issues: rows,
    };
  }

  async remove(id: number): Promise<void> {
    await db.delete(issueTags).where(eq(issueTags.tagId, id));
    await db.delete(localTags).where(eq(localTags.id, id));
  }

  async setIssueTags(jiraKey: string, tagIds: number[]): Promise<LocalTag[]> {
    await db.delete(issueTags).where(eq(issueTags.jiraKey, jiraKey));
    for (const tagId of tagIds) {
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
