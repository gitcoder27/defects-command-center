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

  async getMyDay(accountId: string, date: string): Promise<MyDayResponse> {
    const day = await this.trackerService.getDeveloperDay(date, accountId, {
      includeManagerNotes: false,
    });

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
    status?: TrackerDeveloperStatus
  ): Promise<MyDayResponse> {
    await this.assertAvailable(accountId, date);
    await this.trackerService.updateDay(accountId, date, { status });
    return this.getMyDay(accountId, date);
  }

  async addItem(accountId: string, params: AddMyDayItemParams): Promise<TrackerWorkItem> {
    await this.assertAvailable(accountId, params.date);
    return this.trackerService.addItem(accountId, params.date, {
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
    const ownership = await this.trackerService.assertItemBelongsToDeveloper(itemId, accountId);
    await this.assertAvailable(accountId, ownership.date);
    return this.trackerService.updateItem(itemId, updates);
  }

  async deleteItem(accountId: string, itemId: number): Promise<void> {
    const ownership = await this.trackerService.assertItemBelongsToDeveloper(itemId, accountId);
    await this.assertAvailable(accountId, ownership.date);
    await this.trackerService.deleteItem(itemId);
  }

  async setCurrentItem(accountId: string, itemId: number): Promise<TrackerWorkItem> {
    const ownership = await this.trackerService.assertItemBelongsToDeveloper(itemId, accountId);
    await this.assertAvailable(accountId, ownership.date);
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
    await this.assertAvailable(accountId, date);
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

  private async assertAvailable(accountId: string, date: string): Promise<void> {
    const availability = await this.trackerService.getAvailabilityForDate(accountId, date);
    if (availability.state === "inactive") {
      throw new HttpError(409, `Developer is inactive on ${date}`);
    }
  }
}
