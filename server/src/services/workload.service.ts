import { eq } from "drizzle-orm";
import type { AssignmentSuggestion, Developer, DeveloperWorkload, WorkloadLevel } from "shared/types";
import { db } from "../db/connection";
import { developers, issues } from "../db/schema";
import { todayIsoDate } from "../utils/date";

const PRIORITY_WEIGHTS: Record<string, number> = {
  Highest: 5,
  High: 3,
  Medium: 1,
  Low: 0.5,
  Lowest: 0.5,
};

export class WorkloadService {
  async getDevelopers(): Promise<Developer[]> {
    const rows = await db.select().from(developers).where(eq(developers.isActive, 1));
    return rows.map((row) => ({
      accountId: row.accountId,
      displayName: row.displayName,
      email: row.email ?? undefined,
      avatarUrl: row.avatarUrl ?? undefined,
      isActive: row.isActive === 1,
    }));
  }

  async getTeamWorkload(): Promise<DeveloperWorkload[]> {
    const devs = await this.getDevelopers();
    const activeIssues = await db.select().from(issues);
    const today = todayIsoDate();

    return devs.map((dev) => {
      const mine = activeIssues.filter((issue) => issue.assigneeId === dev.accountId && this.isActiveTeamIssue(issue));
      const score = this.calculateScore(mine.map((item) => item.priorityName));
      return {
        developer: dev,
        activeDefects: mine.length,
        dueToday: mine.filter((item) => this.getEffectiveDueDate(item) === today).length,
        blocked: mine.filter((item) => item.flagged === 1).length,
        score,
        level: this.getLevel(score),
      };
    });
  }

  async getDeveloperIssues(accountId: string): Promise<Array<typeof issues.$inferSelect>> {
    const rows = await db.select().from(issues).where(eq(issues.assigneeId, accountId));
    return rows.filter((issue) => this.isActiveTeamIssue(issue));
  }

  async getIdleDevelopers(): Promise<Developer[]> {
    const team = await this.getTeamWorkload();
    return team.filter((entry) => entry.activeDefects === 0).map((entry) => entry.developer);
  }

  async suggestAssignee(): Promise<AssignmentSuggestion[]> {
    const team = await this.getTeamWorkload();
    return [...team]
      .sort((a, b) => a.score - b.score)
      .map((entry) => ({
        developer: entry.developer,
        score: entry.score,
        reason: `Current workload score ${entry.score} (${entry.level})`,
      }));
  }

  calculateScore(priorities: string[]): number {
    return priorities.reduce((sum, p) => sum + (PRIORITY_WEIGHTS[p] ?? 0.5), 0);
  }

  getLevel(score: number): WorkloadLevel {
    if (score < 5) {
      return "light";
    }
    if (score < 12) {
      return "medium";
    }
    return "heavy";
  }

  private isActiveTeamIssue(issue: typeof issues.$inferSelect): boolean {
    const teamScopeState = issue.teamScopeState ?? "in_team";
    const syncScopeState = issue.syncScopeState ?? "active";
    return issue.statusCategory !== "done" && teamScopeState !== "out_of_team" && syncScopeState === "active";
  }

  private getEffectiveDueDate(issue: typeof issues.$inferSelect): string | null {
    return issue.developmentDueDate ?? issue.dueDate ?? null;
  }
}
