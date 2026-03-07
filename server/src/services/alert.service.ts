import type { Alert } from "shared/types";
import { db } from "../db/connection";
import { issues } from "../db/schema";
import { isOlderThanHours, todayIsoDate } from "../utils/date";
import { getEffectiveDueDate, isStaleIssue } from "./issue-rules";
import { SettingsService } from "./settings.service";
import { WorkloadService } from "./workload.service";

export class AlertService {
  constructor(
    private readonly workloadService: WorkloadService,
    private readonly settings = new SettingsService(),
  ) {}

  async computeAlerts(now = new Date()): Promise<Alert[]> {
    const rows = await db.select().from(issues);
    const staleThresholdHours = await this.settings.getStaleThresholdHours();
    const today = todayIsoDate(now);
    const alerts: Alert[] = [];

    for (const row of rows) {
      const effectiveDueDate = getEffectiveDueDate(row);

      if (effectiveDueDate && effectiveDueDate < today && row.statusCategory !== "done") {
        alerts.push(this.makeIssueAlert("overdue", "high", row.jiraKey, `Issue ${row.jiraKey} is overdue.`));
      }
      if (row.statusCategory !== "done" && isStaleIssue(row, staleThresholdHours, now)) {
        alerts.push(this.makeIssueAlert("stale", "medium", row.jiraKey, `Issue ${row.jiraKey} is stale.`));
      }
      if (row.flagged === 1) {
        alerts.push(this.makeIssueAlert("blocked", "high", row.jiraKey, `Issue ${row.jiraKey} is blocked.`));
      }
      if (
        (row.priorityName === "Highest" || row.priorityName === "High") &&
        row.statusName === "To Do" &&
        isOlderThanHours(row.createdAt, 4, now)
      ) {
        alerts.push(
          this.makeIssueAlert(
            "high_priority_not_started",
            "high",
            row.jiraKey,
            `High-priority issue ${row.jiraKey} has not started for over 4 hours.`,
          ),
        );
      }
    }

    const idleDevelopers = await this.workloadService.getIdleDevelopers();
    for (const dev of idleDevelopers) {
      alerts.push({
        id: `idle_developer:${dev.accountId}`,
        type: "idle_developer",
        severity: "medium",
        developerAccountId: dev.accountId,
        developerName: dev.displayName,
        message: `${dev.displayName} has no active defects assigned.`,
        detectedAt: now.toISOString(),
      });
    }

    return alerts;
  }

  private makeIssueAlert(type: Alert["type"], severity: Alert["severity"], issueKey: string, message: string): Alert {
    return {
      id: `${type}:${issueKey}`,
      type,
      severity,
      issueKey,
      message,
      detectedAt: new Date().toISOString(),
    };
  }
}
