import type {
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
    const day = await this.trackerService.getDeveloperDay(date, accountId, {
      includeManagerNotes: false,
    }, workspaceId);

    return {
      date: day.date,
      developer: day.developer,
      status: day.status,
      capacityUnits: day.capacityUnits,
      availability: day.availability,
      isReadOnly: day.availability.state === "inactive",
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
    await this.assertAvailable(accountId, date, workspaceId);
    await this.trackerService.updateDay(accountId, date, { status }, workspaceId);
    return this.getMyDay(accountId, date, workspaceId);
  }

  async addItem(accountId: string, params: AddMyDayItemParams, workspaceId?: string): Promise<TrackerWorkItem> {
    await this.assertAvailable(accountId, params.date, workspaceId);
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
    updates: UpdateMyDayItemParams,
    workspaceId?: string
  ): Promise<TrackerWorkItem> {
    const ownership = await this.trackerService.assertItemBelongsToDeveloper(itemId, accountId, workspaceId);
    await this.assertAvailable(accountId, ownership.date, workspaceId);
    return this.trackerService.updateItem(itemId, updates, workspaceId);
  }

  async deleteItem(accountId: string, itemId: number, workspaceId?: string): Promise<void> {
    const ownership = await this.trackerService.assertItemBelongsToDeveloper(itemId, accountId, workspaceId);
    await this.assertAvailable(accountId, ownership.date, workspaceId);
    await this.trackerService.deleteItem(itemId, undefined, workspaceId);
  }

  async setCurrentItem(accountId: string, itemId: number, workspaceId?: string): Promise<TrackerWorkItem> {
    const ownership = await this.trackerService.assertItemBelongsToDeveloper(itemId, accountId, workspaceId);
    await this.assertAvailable(accountId, ownership.date, workspaceId);
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
    await this.assertAvailable(accountId, date, workspaceId);
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

  private async assertAvailable(accountId: string, date: string, workspaceId?: string): Promise<void> {
    const availability = await this.trackerService.getAvailabilityForDate(accountId, date, workspaceId);
    if (availability.state === "inactive") {
      throw new HttpError(409, `Developer is inactive on ${date}`);
    }
  }
}
