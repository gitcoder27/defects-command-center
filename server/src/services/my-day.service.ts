import type {
  MyDayReadOnlyReason,
  MyDayResponse,
  TrackerCheckIn,
  TrackerDeveloperStatus,
  TrackerWorkItem,
} from "shared/types";
import { TeamTrackerService } from "./team-tracker.service";
import { HttpError } from "../middleware/errorHandler";

interface AddMyDayItemParams {
  date: string;
  jiraKey?: string;
  relatedIssueKeys?: string[];
  title: string;
  note?: string;
}

interface UpdateMyDayItemParams {
  title?: string;
  note?: string | null;
  state?: "planned" | "in_progress" | "done" | "dropped";
  position?: number;
}

export class MyDayService {
  constructor(private readonly trackerService: TeamTrackerService) {}

  async getMyDay(accountId: string, date: string, workspaceId?: string): Promise<MyDayResponse> {
    const { day, viewMode } = await this.trackerService.getDeveloperDayView(date, accountId, {
      includeManagerNotes: false,
    }, workspaceId);
    const readOnlyReason = this.getReadOnlyReason(day.availability.state, viewMode);

    return {
      date: day.date,
      viewMode,
      readOnlyReason,
      developer: day.developer,
      status: day.status,
      capacityUnits: day.capacityUnits,
      availability: day.availability,
      isReadOnly: readOnlyReason !== undefined,
      lastCheckInAt: day.lastCheckInAt,
      currentItem: day.currentItem,
      plannedItems: day.plannedItems,
      completedItems: day.completedItems,
      droppedItems: day.droppedItems,
      checkIns: day.checkIns,
      isStale: day.isStale,
    };
  }

  async updateStatus(
    accountId: string,
    date: string,
    status?: TrackerDeveloperStatus,
    workspaceId?: string
  ): Promise<MyDayResponse> {
    await this.assertWritable(accountId, date, workspaceId);
    await this.trackerService.updateDay(accountId, date, { status }, workspaceId);
    return this.getMyDay(accountId, date, workspaceId);
  }

  async addItem(accountId: string, params: AddMyDayItemParams, workspaceId?: string): Promise<TrackerWorkItem> {
    await this.assertWritable(accountId, params.date, workspaceId);
    return this.trackerService.addItem(accountId, params.date, {
      jiraKey: params.jiraKey,
      relatedIssueKeys: params.relatedIssueKeys,
      title: params.title,
      note: params.note,
    }, workspaceId);
  }

  async updateItem(
    accountId: string,
    itemId: number,
    date: string,
    updates: UpdateMyDayItemParams,
    workspaceId?: string
  ): Promise<TrackerWorkItem> {
    const ownership = await this.trackerService.assertItemBelongsToDeveloper(itemId, accountId, workspaceId);
    await this.assertWritable(accountId, date, workspaceId);
    this.assertItemAvailableInSelectedView(ownership.date, date);
    return this.trackerService.updateItem(itemId, updates, workspaceId);
  }

  async deleteItem(accountId: string, itemId: number, date: string, workspaceId?: string): Promise<void> {
    const ownership = await this.trackerService.assertItemBelongsToDeveloper(itemId, accountId, workspaceId);
    await this.assertWritable(accountId, date, workspaceId);
    this.assertItemAvailableInSelectedView(ownership.date, date);
    await this.trackerService.deleteItem(itemId, undefined, workspaceId);
  }

  async setCurrentItem(accountId: string, itemId: number, date: string, workspaceId?: string): Promise<TrackerWorkItem> {
    const ownership = await this.trackerService.assertItemBelongsToDeveloper(itemId, accountId, workspaceId);
    await this.assertWritable(accountId, date, workspaceId);
    this.assertItemAvailableInSelectedView(ownership.date, date);
    return this.trackerService.setCurrentItem(itemId, undefined, workspaceId);
  }

  async addCheckIn(
    accountId: string,
    date: string,
    params: {
      summary: string;
      status?: TrackerDeveloperStatus;
    },
    workspaceId?: string
  ): Promise<TrackerCheckIn> {
    await this.assertWritable(accountId, date, workspaceId);
    return this.trackerService.addCheckIn(
      accountId,
      date,
      {
        summary: params.summary,
        status: params.status,
      },
      {
        type: "developer",
        accountId,
      },
      workspaceId
    );
  }

  private getReadOnlyReason(
    availabilityState: "active" | "inactive",
    viewMode: "live" | "history" | "planning"
  ): MyDayReadOnlyReason | undefined {
    if (availabilityState === "inactive") {
      return "inactive";
    }
    if (viewMode === "history") {
      return "history";
    }
    if (viewMode === "planning") {
      return "future";
    }
    return undefined;
  }

  private async assertWritable(accountId: string, date: string, workspaceId?: string): Promise<void> {
    const { day, viewMode } = await this.trackerService.getDeveloperDayView(date, accountId, {
      includeManagerNotes: false,
    }, workspaceId);
    const reason = this.getReadOnlyReason(day.availability.state, viewMode);
    if (!reason) {
      return;
    }

    if (reason === "inactive") {
      throw new HttpError(409, `Developer is inactive on ${date}`);
    }
    if (reason === "history") {
      throw new HttpError(409, "My Day is read-only for past dates");
    }
    throw new HttpError(409, "My Day is read-only for future dates");
  }

  private assertItemAvailableInSelectedView(itemDate: string, selectedDate: string): void {
    if (itemDate > selectedDate) {
      throw new HttpError(409, "Item is not available in the selected My Day view");
    }
  }
}
