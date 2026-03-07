import type {
  MyDayResponse,
  TrackerCheckIn,
  TrackerDeveloperStatus,
  TrackerWorkItem,
} from "shared/types";
import { TeamTrackerService } from "./team-tracker.service";

interface AddMyDayItemParams {
  date: string;
  itemType: "jira" | "custom";
  jiraKey?: string;
  title: string;
  note?: string;
}

interface UpdateMyDayItemParams {
  title?: string;
  note?: string;
  state?: "planned" | "in_progress" | "done" | "dropped";
  position?: number;
}

export class MyDayService {
  constructor(private readonly trackerService: TeamTrackerService) {}

  async getMyDay(accountId: string, date: string): Promise<MyDayResponse> {
    const day = await this.trackerService.getDeveloperDay(date, accountId, {
      includeManagerNotes: false,
    });

    return {
      date: day.date,
      developer: day.developer,
      status: day.status,
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
    status?: TrackerDeveloperStatus
  ): Promise<MyDayResponse> {
    await this.trackerService.updateDay(accountId, date, { status });
    return this.getMyDay(accountId, date);
  }

  async addItem(accountId: string, params: AddMyDayItemParams): Promise<TrackerWorkItem> {
    return this.trackerService.addItem(accountId, params.date, {
      itemType: params.itemType,
      jiraKey: params.jiraKey,
      title: params.title,
      note: params.note,
    });
  }

  async updateItem(
    accountId: string,
    itemId: number,
    updates: UpdateMyDayItemParams
  ): Promise<TrackerWorkItem> {
    await this.trackerService.assertItemBelongsToDeveloper(itemId, accountId);
    return this.trackerService.updateItem(itemId, updates);
  }

  async deleteItem(accountId: string, itemId: number): Promise<void> {
    await this.trackerService.assertItemBelongsToDeveloper(itemId, accountId);
    await this.trackerService.deleteItem(itemId);
  }

  async setCurrentItem(accountId: string, itemId: number): Promise<TrackerWorkItem> {
    await this.trackerService.assertItemBelongsToDeveloper(itemId, accountId);
    return this.trackerService.setCurrentItem(itemId);
  }

  async addCheckIn(
    accountId: string,
    date: string,
    params: {
      summary: string;
      status?: TrackerDeveloperStatus;
    }
  ): Promise<TrackerCheckIn> {
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
      }
    );
  }
}
