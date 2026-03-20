import type { Alert } from "shared/types";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/connection";
import { alertDismissals, issues } from "../db/schema";
import { isOlderThanHours, todayIsoDate } from "../utils/date";
import { getEffectiveDueDate, isActiveTeamIssue, isStaleIssue } from "./issue-rules";
import { SettingsService } from "./settings.service";
import { WorkloadService } from "./workload.service";

export class AlertService {
  constructor(
    private readonly workloadService: WorkloadService,
    private readonly settings = new SettingsService(),
  ) {}

  async listAlertsForManager(managerAccountId: string, now = new Date()): Promise<Alert[]> {
    const alerts = await this.computeAlerts(now);
    const activeAlertIds = new Set(alerts.map((alert) => alert.id));
    const dismissalRows = await db
      .select()
      .from(alertDismissals)
      .where(eq(alertDismissals.managerAccountId, managerAccountId));

    const staleDismissalIds = dismissalRows
      .map((row) => row.alertId)
      .filter((alertId) => !activeAlertIds.has(alertId));

    if (staleDismissalIds.length > 0) {
      await db
        .delete(alertDismissals)
        .where(
          and(
            eq(alertDismissals.managerAccountId, managerAccountId),
            inArray(alertDismissals.alertId, staleDismissalIds),
          ),
        );
    }

    const dismissedIds = new Set(
      dismissalRows
        .map((row) => row.alertId)
        .filter((alertId) => activeAlertIds.has(alertId)),
    );

    return alerts.filter((alert) => !dismissedIds.has(alert.id));
  }

  async dismissAlerts(managerAccountId: string, alertIds: string[], now = new Date()): Promise<string[]> {
    const uniqueAlertIds = Array.from(new Set(alertIds.map((alertId) => alertId.trim()).filter(Boolean)));

    if (uniqueAlertIds.length === 0) {
      return [];
    }

    await db
      .delete(alertDismissals)
      .where(
        and(
          eq(alertDismissals.managerAccountId, managerAccountId),
          inArray(alertDismissals.alertId, uniqueAlertIds),
        ),
      );

    await db.insert(alertDismissals).values(
      uniqueAlertIds.map((alertId) => ({
        managerAccountId,
        alertId,
        dismissedAt: now.toISOString(),
      })),
    );

    return uniqueAlertIds;
  }

  async computeAlerts(now = new Date()): Promise<Alert[]> {
    const rows = await db.select().from(issues);
    const staleThresholdHours = await this.settings.getStaleThresholdHours();
    const today = todayIsoDate(now);
    const alerts: Alert[] = [];

    for (const row of rows) {
      if (!isActiveTeamIssue(row)) {
        continue;
      }

      const effectiveDueDate = getEffectiveDueDate(row);

      if (effectiveDueDate && effectiveDueDate < today) {
        alerts.push(this.makeIssueAlert("overdue", "high", row.jiraKey, `Issue ${row.jiraKey} is overdue.`));
      }
      if (isStaleIssue(row, staleThresholdHours, now)) {
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

    const idleDevelopers = await this.workloadService.getIdleDevelopers(today);
    for (const dev of idleDevelopers) {
      alerts.push({
        id: `idle_developer:${dev.accountId}`,
        type: "idle_developer",
        severity: "medium",
        developerAccountId: dev.accountId,
        developerName: dev.displayName,
        message: `${dev.displayName} has no current or planned work today.`,
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
