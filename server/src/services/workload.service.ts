import { eq, inArray } from "drizzle-orm";
import type { AssignmentSuggestion, Developer, DeveloperWorkload, WorkloadLevel } from "shared/types";
import { db } from "../db/connection";
import { developers, issues, teamTrackerDays, teamTrackerItems } from "../db/schema";
import { todayIsoDate } from "../utils/date";
import { getEffectiveDueDate, isActiveTeamIssue } from "./issue-rules";
import { DeveloperAvailabilityService } from "./developer-availability.service";

const PRIORITY_WEIGHTS: Record<string, number> = {
  Highest: 5,
  High: 3,
  Medium: 1,
  Low: 0.5,
  Lowest: 0.5,
};

const TRACKER_STALE_HOURS = 4;

function isTrackerStale(lastCheckInAt: string | null, now = new Date()): boolean {
  if (!lastCheckInAt) {
    return true;
  }

  const diff = now.getTime() - new Date(lastCheckInAt).getTime();
  return diff > TRACKER_STALE_HOURS * 60 * 60 * 1000;
}

export class WorkloadService {
  constructor(
    private readonly availability = new DeveloperAvailabilityService()
  ) {}

  async getDevelopers(date?: string): Promise<Developer[]> {
    const rows = await db.select().from(developers).where(eq(developers.isActive, 1));
    const mapped = rows.map((row) => ({
      accountId: row.accountId,
      displayName: row.displayName,
      email: row.email ?? undefined,
      avatarUrl: row.avatarUrl ?? undefined,
      isActive: row.isActive === 1,
    }));

    if (!date) {
      return mapped;
    }

    const availabilityByAccountId = await this.availability.getAvailabilityMapForDate(
      mapped.map((developer) => developer.accountId),
      date
    );
    return mapped.map((developer) => ({
      ...developer,
      availability: availabilityByAccountId.get(developer.accountId) ?? { state: "active" as const },
    }));
  }

  async getTeamWorkload(date = todayIsoDate()): Promise<DeveloperWorkload[]> {
    const devs = (await this.getDevelopers(date)).filter(
      (developer) => developer.availability?.state !== "inactive"
    );
    const issueRows = await db.select().from(issues);
    const dayRows = await db
      .select()
      .from(teamTrackerDays)
      .where(eq(teamTrackerDays.date, date));
    const trackerItems = dayRows.length > 0
      ? await db
        .select()
        .from(teamTrackerItems)
        .where(inArray(teamTrackerItems.dayId, dayRows.map((row) => row.id)))
      : [];

    const trackerDayByDeveloper = new Map(
      dayRows.map((row) => [row.developerAccountId, row])
    );
    const trackerItemsByDayId = new Map<number, Array<typeof teamTrackerItems.$inferSelect>>();

    for (const item of trackerItems) {
      const existing = trackerItemsByDayId.get(item.dayId);
      if (existing) {
        existing.push(item);
      } else {
        trackerItemsByDayId.set(item.dayId, [item]);
      }
    }

    return devs.map((dev) => {
      const mine = issueRows.filter(
        (issue) => issue.assigneeId === dev.accountId && isActiveTeamIssue(issue)
      );
      const score = this.calculateScore(mine.map((item) => item.priorityName));
      const trackerDay = trackerDayByDeveloper.get(dev.accountId);
      const trackerDayItems = trackerDay ? trackerItemsByDayId.get(trackerDay.id) ?? [] : [];
      const currentCount = trackerDayItems.some((item) => item.state === "in_progress") ? 1 : 0;
      const plannedCount = trackerDayItems.filter((item) => item.state === "planned").length;
      const completedTodayCount = trackerDayItems.filter((item) => item.state === "done").length;
      const droppedTodayCount = trackerDayItems.filter((item) => item.state === "dropped").length;
      const assignedTodayCount = currentCount + plannedCount;
      const capacityUnits = trackerDay?.capacityUnits ?? undefined;
      const capacityUsed = assignedTodayCount;
      const capacityRemaining = capacityUnits !== undefined
        ? capacityUnits - capacityUsed
        : undefined;
      const capacityUtilization = capacityUnits !== undefined && capacityUnits > 0
        ? capacityUsed / capacityUnits
        : undefined;
      const hasCurrentItem = currentCount === 1;
      const overCapacity = capacityUnits !== undefined && capacityUsed > capacityUnits;
      const noCurrentItem = assignedTodayCount > 0 && !hasCurrentItem;

      return {
        developer: dev,
        activeDefects: mine.length,
        dueToday: mine.filter((item) => getEffectiveDueDate(item) === date).length,
        blocked: mine.filter((item) => item.flagged === 1).length,
        score,
        level: this.getLevel(score),
        currentCount,
        plannedCount,
        assignedTodayCount,
        completedTodayCount,
        droppedTodayCount,
        trackerStatus: trackerDay?.status as DeveloperWorkload["trackerStatus"],
        isTrackerStale: trackerDay ? isTrackerStale(trackerDay.lastCheckInAt) : false,
        hasCurrentItem,
        capacityUnits,
        capacityUsed,
        capacityRemaining,
        capacityUtilization,
        signals: {
          noCurrentItem,
          overCapacity,
          backlogTrackerMismatch: mine.length > 0 && assignedTodayCount === 0,
        },
      };
    });
  }

  async getDeveloperIssues(accountId: string): Promise<Array<typeof issues.$inferSelect>> {
    const rows = await db.select().from(issues).where(eq(issues.assigneeId, accountId));
    return rows.filter((issue) => isActiveTeamIssue(issue));
  }

  async getIdleDevelopers(): Promise<Developer[]> {
    const team = await this.getTeamWorkload();
    return team.filter((entry) => entry.activeDefects === 0).map((entry) => entry.developer);
  }

  async suggestAssignee(): Promise<AssignmentSuggestion[]> {
    const team = await this.getTeamWorkload();
    return [...team]
      .sort((a, b) => {
        const blockedDelta =
          Number(a.trackerStatus === "blocked") - Number(b.trackerStatus === "blocked");
        if (blockedDelta !== 0) {
          return blockedDelta;
        }

        const overCapacityDelta =
          Number(a.signals?.overCapacity === true) - Number(b.signals?.overCapacity === true);
        if (overCapacityDelta !== 0) {
          return overCapacityDelta;
        }

        if (
          a.capacityUtilization !== undefined &&
          b.capacityUtilization !== undefined &&
          a.capacityUtilization !== b.capacityUtilization
        ) {
          return a.capacityUtilization - b.capacityUtilization;
        }

        const assignedDelta = (a.assignedTodayCount ?? 0) - (b.assignedTodayCount ?? 0);
        if (assignedDelta !== 0) {
          return assignedDelta;
        }

        const scoreDelta = a.score - b.score;
        if (scoreDelta !== 0) {
          return scoreDelta;
        }

        return a.activeDefects - b.activeDefects;
      })
      .map((entry) => ({
        developer: entry.developer,
        score: entry.score,
        reason:
          entry.capacityUnits !== undefined
            ? `${entry.assignedTodayCount ?? 0}/${entry.capacityUnits} planned today, score ${entry.score}`
            : `${entry.assignedTodayCount ?? 0} planned today, score ${entry.score}`,
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
}
