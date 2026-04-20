import { eq, inArray } from "drizzle-orm";
import type {
  ManagerDeskMaintenancePreview,
  TeamTrackerMaintenancePreview,
  WorkspaceMaintenancePreviewResponse,
  WorkspaceMaintenanceResetResponse,
  WorkspaceMaintenanceResetTarget,
} from "shared/types";
import { db } from "../db/connection";
import {
  developerAvailabilityPeriods,
  managerDeskDays,
  managerDeskItemHistory,
  managerDeskItems,
  managerDeskLinks,
  teamTrackerCheckIns,
  teamTrackerDays,
  teamTrackerItems,
  teamTrackerSavedViews,
} from "../db/schema";
import { type BackupRecord, BackupService } from "./backup.service";
import { SettingsService } from "./settings.service";

interface ManagerDeskResetScope {
  preview: ManagerDeskMaintenancePreview;
  dayIds: number[];
  itemIds: number[];
  linkedTrackerItemIds: number[];
}

interface TeamTrackerResetScope {
  preview: TeamTrackerMaintenancePreview;
}

const toBackupSummary = (
  backup: BackupRecord | null
): WorkspaceMaintenanceResetResponse["backup"] =>
  backup
    ? {
        name: backup.name,
        createdAt: backup.createdAt,
        reason: backup.reason,
      }
    : undefined;

export class WorkspaceMaintenanceService {
  constructor(
    private readonly settings = new SettingsService(),
    private readonly backupService?: BackupService
  ) {}

  async getResetPreview(
    managerAccountId: string
  ): Promise<WorkspaceMaintenancePreviewResponse> {
    const [backupBeforeReset, managerDesk, teamTracker] = await Promise.all([
      this.settings.getBackupBeforeReset(),
      this.buildManagerDeskScope(managerAccountId),
      this.buildTeamTrackerScope(managerAccountId),
    ]);

    return {
      backupBeforeReset,
      managerDesk: managerDesk.preview,
      teamTracker: teamTracker.preview,
    };
  }

  async reset(
    managerAccountId: string,
    target: WorkspaceMaintenanceResetTarget
  ): Promise<WorkspaceMaintenanceResetResponse> {
    const backup = await this.backupService?.createPreResetBackup();

    if (target === "team_tracker" || target === "workspace") {
      const teamTrackerScope = await this.buildTeamTrackerScope(managerAccountId);
      await this.clearTeamTracker(managerAccountId, teamTrackerScope);
    }

    if (target === "manager_desk" || target === "workspace") {
      const managerDeskScope = await this.buildManagerDeskScope(managerAccountId);
      await this.clearManagerDesk(managerDeskScope, {
        deleteLinkedTrackerItems: target === "manager_desk",
      });
    }

    return {
      success: true,
      target,
      backup: toBackupSummary(backup ?? null),
    };
  }

  private async buildManagerDeskScope(
    managerAccountId: string
  ): Promise<ManagerDeskResetScope> {
    const dayRows = await db
      .select({ id: managerDeskDays.id })
      .from(managerDeskDays)
      .where(eq(managerDeskDays.managerAccountId, managerAccountId));
    const dayIds = dayRows.map((row) => row.id);

    if (dayIds.length === 0) {
      return {
        preview: {
          dayCount: 0,
          itemCount: 0,
          linkCount: 0,
          historyCount: 0,
          linkedTrackerItemCount: 0,
        },
        dayIds: [],
        itemIds: [],
        linkedTrackerItemIds: [],
      };
    }

    const itemRows = await db
      .select({ id: managerDeskItems.id })
      .from(managerDeskItems)
      .where(inArray(managerDeskItems.dayId, dayIds));
    const itemIds = itemRows.map((row) => row.id);

    const [linkRows, historyRows, linkedTrackerRows] = await Promise.all([
      itemIds.length > 0
        ? db
            .select({ id: managerDeskLinks.id })
            .from(managerDeskLinks)
            .where(inArray(managerDeskLinks.itemId, itemIds))
        : Promise.resolve([]),
      itemIds.length > 0
        ? db
            .select({ id: managerDeskItemHistory.id })
            .from(managerDeskItemHistory)
            .where(inArray(managerDeskItemHistory.itemId, itemIds))
        : Promise.resolve([]),
      itemIds.length > 0
        ? db
            .select({ id: teamTrackerItems.id })
            .from(teamTrackerItems)
            .where(inArray(teamTrackerItems.managerDeskItemId, itemIds))
        : Promise.resolve([]),
    ]);

    return {
      preview: {
        dayCount: dayIds.length,
        itemCount: itemIds.length,
        linkCount: linkRows.length,
        historyCount: historyRows.length,
        linkedTrackerItemCount: linkedTrackerRows.length,
      },
      dayIds,
      itemIds,
      linkedTrackerItemIds: linkedTrackerRows.map((row) => row.id),
    };
  }

  private async buildTeamTrackerScope(
    managerAccountId: string
  ): Promise<TeamTrackerResetScope> {
    const [
      dayRows,
      itemRows,
      checkInRows,
      availabilityRows,
      savedViewRows,
    ] = await Promise.all([
      db.select({ id: teamTrackerDays.id }).from(teamTrackerDays),
      db
        .select({
          id: teamTrackerItems.id,
          managerDeskItemId: teamTrackerItems.managerDeskItemId,
        })
        .from(teamTrackerItems),
      db.select({ id: teamTrackerCheckIns.id }).from(teamTrackerCheckIns),
      db
        .select({ id: developerAvailabilityPeriods.id })
        .from(developerAvailabilityPeriods),
      db
        .select({ id: teamTrackerSavedViews.id })
        .from(teamTrackerSavedViews)
        .where(eq(teamTrackerSavedViews.managerAccountId, managerAccountId)),
    ]);

    return {
      preview: {
        dayCount: dayRows.length,
        itemCount: itemRows.length,
        checkInCount: checkInRows.length,
        availabilityPeriodCount: availabilityRows.length,
        savedViewCount: savedViewRows.length,
        linkedManagerDeskItemCount: itemRows.filter(
          (row) => typeof row.managerDeskItemId === "number"
        ).length,
      },
    };
  }

  private async clearManagerDesk(
    scope: ManagerDeskResetScope,
    options: { deleteLinkedTrackerItems: boolean }
  ): Promise<void> {
    if (options.deleteLinkedTrackerItems && scope.linkedTrackerItemIds.length > 0) {
      await db
        .delete(teamTrackerItems)
        .where(inArray(teamTrackerItems.id, scope.linkedTrackerItemIds));
    }

    if (scope.itemIds.length > 0) {
      await db
        .delete(managerDeskLinks)
        .where(inArray(managerDeskLinks.itemId, scope.itemIds));
      await db
        .delete(managerDeskItemHistory)
        .where(inArray(managerDeskItemHistory.itemId, scope.itemIds));
      await db
        .delete(managerDeskItems)
        .where(inArray(managerDeskItems.id, scope.itemIds));
    }

    if (scope.dayIds.length > 0) {
      await db
        .delete(managerDeskDays)
        .where(inArray(managerDeskDays.id, scope.dayIds));
    }
  }

  private async clearTeamTracker(
    managerAccountId: string,
    scope: TeamTrackerResetScope
  ): Promise<void> {
    if (scope.preview.checkInCount > 0) {
      await db.delete(teamTrackerCheckIns);
    }
    if (scope.preview.itemCount > 0) {
      await db.delete(teamTrackerItems);
    }
    if (scope.preview.dayCount > 0) {
      await db.delete(teamTrackerDays);
    }
    if (scope.preview.availabilityPeriodCount > 0) {
      await db.delete(developerAvailabilityPeriods);
    }
    if (scope.preview.savedViewCount > 0) {
      await db
        .delete(teamTrackerSavedViews)
        .where(eq(teamTrackerSavedViews.managerAccountId, managerAccountId));
    }
  }
}
