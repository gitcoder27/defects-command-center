import { and, eq, inArray } from "drizzle-orm";
import type {
  TrackerDeveloperStatus,
  TrackerItemState,
  TrackerDeveloperDay,
  TrackerDeveloperSignals,
  TrackerWorkItem,
  TrackerCheckIn,
  TeamTrackerBoardResponse,
  TrackerBoardSummary,
  TrackerAttentionItem,
  TrackerAttentionActionItem,
  TrackerAttentionReason,
  TrackerAttentionReasonCode,
  TrackerAttentionQuickAction,
  Developer,
  TrackerIssueAssignment,
  IssueTrackerAssignmentSummary,
  UserRole,
  TeamTrackerBoardQuery,
  TeamTrackerBoardResolvedQuery,
  TeamTrackerBoardSort,
  TeamTrackerBoardGroupBy,
  TrackerBoardSummaryFilter,
  TrackerDeveloperGroup,
  TeamTrackerSavedView,
} from "shared/types";
import { db } from "../db/connection";
import {
  developers,
  issues,
  teamTrackerDays,
  teamTrackerItems,
  teamTrackerCheckIns,
  teamTrackerSavedViews,
} from "../db/schema";
import { getEffectiveDueDate } from "./issue-rules";
import { HttpError } from "../middleware/errorHandler";
import { SettingsService } from "./settings.service";
import { DeveloperAvailabilityService } from "./developer-availability.service";

interface TrackerSignalConfig {
  staleThresholdHours: number;
  noCurrentThresholdHours: number;
  statusFollowUpThresholdHours: number;
}

interface CarryForwardSourceItem {
  developerAccountId: string;
  item: typeof teamTrackerItems.$inferSelect;
}

interface CarryForwardPlan {
  trackerOnlyItems: CarryForwardSourceItem[];
  managerDeskItemIds: number[];
}

interface CarryForwardExecutionOptions {
  carryManagerDeskItems?: (params: {
    fromDate: string;
    toDate: string;
    itemIds: number[];
  }) => Promise<number>;
}

interface TeamTrackerSavedViewInput {
  name: string;
  q?: string;
  summaryFilter?: TrackerBoardSummaryFilter;
  sortBy?: TeamTrackerBoardSort;
  groupBy?: TeamTrackerBoardGroupBy;
}

interface TeamTrackerSavedViewUpdate {
  name?: string;
  q?: string;
  summaryFilter?: TrackerBoardSummaryFilter;
  sortBy?: TeamTrackerBoardSort;
  groupBy?: TeamTrackerBoardGroupBy;
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeOptionalText(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function requiresStatusRationale(status: TrackerDeveloperStatus): boolean {
  return status === "blocked" || status === "at_risk";
}

const TRACKER_STATUS_LABELS: Record<TrackerDeveloperStatus, string> = {
  on_track: "On Track",
  at_risk: "At Risk",
  blocked: "Blocked",
  waiting: "Waiting",
  done_for_today: "Done for Today",
};

const DEFAULT_BOARD_QUERY: TeamTrackerBoardResolvedQuery = {
  q: "",
  summaryFilter: "all",
  sortBy: "name",
  groupBy: "none",
};

const BLOCKED_FIRST_STATUS_ORDER: Record<TrackerDeveloperStatus, number> = {
  blocked: 0,
  at_risk: 1,
  waiting: 2,
  on_track: 3,
  done_for_today: 4,
};

function buildStatusUpdateSummary(params: {
  status: TrackerDeveloperStatus;
  rationale?: string;
  summary?: string;
}): string {
  return (
    params.summary ??
    params.rationale ??
    `Status updated to ${TRACKER_STATUS_LABELS[params.status]}.`
  );
}

function normalizeBoardSearchQuery(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function mapSavedView(
  row: typeof teamTrackerSavedViews.$inferSelect
): TeamTrackerSavedView {
  return {
    id: row.id,
    name: row.name,
    q: row.searchQuery ?? "",
    summaryFilter: row.summaryFilter as TrackerBoardSummaryFilter,
    sortBy: row.sortBy as TeamTrackerBoardSort,
    groupBy: row.groupBy as TeamTrackerBoardGroupBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function getHoursSince(value: string | null | undefined, now = new Date()): number | undefined {
  if (!value) {
    return undefined;
  }

  const diff = now.getTime() - new Date(value).getTime();
  return Math.max(0, Math.round((diff / (60 * 60 * 1000)) * 10) / 10);
}

function hasOpenRiskStatus(status: TrackerDeveloperStatus): boolean {
  return status === "blocked" || status === "at_risk" || status === "waiting";
}

function buildSignals(params: {
  date: string;
  status: TrackerDeveloperStatus;
  lastCheckInAt?: string | null;
  statusUpdatedAt?: string | null;
  updatedAt: string;
  currentItem?: TrackerWorkItem;
  plannedItems: TrackerWorkItem[];
  capacityUnits?: number;
  config: TrackerSignalConfig;
  now?: Date;
}): TrackerDeveloperSignals {
  const now = params.now ?? new Date();
  const hoursSinceCheckIn = getHoursSince(params.lastCheckInAt, now);
  const effectiveStatusUpdatedAt =
    params.statusUpdatedAt ??
    (params.status !== "on_track" ? params.updatedAt : null);
  const hoursSinceStatusChange = getHoursSince(effectiveStatusUpdatedAt, now);
  const staleByTime =
    hoursSinceCheckIn === undefined ||
    hoursSinceCheckIn >= params.config.staleThresholdHours;
  const noCurrentWork =
    !params.currentItem && params.status !== "done_for_today";
  const openRisk = hasOpenRiskStatus(params.status);
  const staleWithoutCurrentWork =
    noCurrentWork &&
    (hoursSinceCheckIn === undefined ||
      hoursSinceCheckIn >= params.config.noCurrentThresholdHours);
  const overdueLinkedCount = [params.currentItem, ...params.plannedItems].filter(
    (item): item is TrackerWorkItem =>
      Boolean(item?.jiraDueDate && item.jiraDueDate < params.date)
  ).length;
  const assignedTodayCount =
    (params.currentItem ? 1 : 0) + params.plannedItems.length;
  const capacityDelta = params.capacityUnits
    ? assignedTodayCount - params.capacityUnits
    : 0;
  const hasFollowUpAfterStatusChange = Boolean(
    effectiveStatusUpdatedAt &&
      params.lastCheckInAt &&
      new Date(params.lastCheckInAt).getTime() >=
        new Date(effectiveStatusUpdatedAt).getTime()
  );
  const statusChangeWithoutFollowUp = Boolean(
    effectiveStatusUpdatedAt &&
      openRisk &&
      !hasFollowUpAfterStatusChange &&
      (hoursSinceStatusChange ?? 0) >= params.config.statusFollowUpThresholdHours
  );

  return {
    freshness: {
      staleThresholdHours: params.config.staleThresholdHours,
      noCurrentThresholdHours: params.config.noCurrentThresholdHours,
      statusFollowUpThresholdHours: params.config.statusFollowUpThresholdHours,
      hoursSinceCheckIn,
      hoursSinceStatusChange,
      staleByTime,
      staleWithOpenRisk: staleByTime && openRisk,
      staleWithoutCurrentWork,
      statusChangeWithoutFollowUp,
    },
    risk: {
      openRisk,
      overdueLinkedWork: overdueLinkedCount > 0,
      overdueLinkedCount,
      overCapacity: capacityDelta > 0,
      capacityDelta: Math.max(0, capacityDelta),
    },
  };
}

type TrackerIssueContext = Pick<
  typeof issues.$inferSelect,
  "jiraKey" | "summary" | "priorityName" | "dueDate" | "developmentDueDate"
>;

function mapItem(
  row: typeof teamTrackerItems.$inferSelect,
  issueContext?: TrackerIssueContext
): TrackerWorkItem {
  return {
    id: row.id,
    dayId: row.dayId,
    managerDeskItemId: row.managerDeskItemId ?? undefined,
    lifecycle: row.managerDeskItemId === null ? "tracker_only" : "manager_desk_linked",
    itemType: row.jiraKey ? "jira" : "custom",
    jiraKey: row.jiraKey ?? undefined,
    jiraSummary: issueContext?.summary ?? undefined,
    jiraPriorityName: issueContext?.priorityName ?? undefined,
    jiraDueDate: issueContext
      ? getEffectiveDueDate(issueContext) ?? undefined
      : undefined,
    title: row.title,
    state: row.state as TrackerItemState,
    position: row.position,
    note: row.note ?? undefined,
    completedAt: row.completedAt ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapCheckIn(
  row: typeof teamTrackerCheckIns.$inferSelect
): TrackerCheckIn {
  return {
    id: row.id,
    dayId: row.dayId,
    summary: row.summary,
    createdAt: row.createdAt,
    authorType: row.authorType as UserRole,
    authorAccountId: row.authorAccountId ?? undefined,
    status: (row.status as TrackerDeveloperStatus | null) ?? undefined,
    rationale: row.rationale ?? undefined,
    nextFollowUpAt: row.nextFollowUpAt ?? undefined,
  };
}

function mapAttentionActionItem(item: TrackerWorkItem): TrackerAttentionActionItem {
  return {
    id: item.id,
    title: item.title,
    jiraKey: item.jiraKey,
    lifecycle: item.lifecycle,
  };
}

function getAttentionQuickActions(day: TrackerDeveloperDay): TrackerAttentionQuickAction[] {
  const actions: TrackerAttentionQuickAction[] = [
    "update_status",
    "mark_inactive",
    "capture_follow_up",
  ];

  if (!day.currentItem && day.plannedItems.length > 0) {
    actions.push("set_current");
  }

  return actions;
}

function mapDeveloper(row: typeof developers.$inferSelect): Developer {
  return {
    accountId: row.accountId,
    displayName: row.displayName,
    email: row.email ?? undefined,
    avatarUrl: row.avatarUrl ?? undefined,
    isActive: row.isActive === 1,
  };
}

function buildCarryForwardKey(
  item: Pick<
    typeof teamTrackerItems.$inferSelect,
    "jiraKey" | "title" | "note"
  >
): string {
  return JSON.stringify([item.jiraKey ?? null, item.title, item.note ?? null]);
}

function isCarryForwardEligibleItem(
  item: Pick<typeof teamTrackerItems.$inferSelect, "state">
): boolean {
  return item.state === "planned" || item.state === "in_progress";
}

const ATTENTION_REASON_META: Record<
  TrackerAttentionReasonCode,
  { label: string; priority: number }
> = {
  blocked: { label: "Blocked", priority: 1 },
  stale_with_open_risk: { label: "Stale with risk", priority: 2 },
  overdue_linked_work: { label: "Overdue linked work", priority: 3 },
  at_risk: { label: "At Risk", priority: 4 },
  status_change_without_follow_up: { label: "Status changed, no follow-up", priority: 5 },
  stale_without_current_work: { label: "Stale without current work", priority: 6 },
  over_capacity: { label: "Over capacity", priority: 7 },
  stale_by_time: { label: "Stale by time", priority: 8 },
  no_current: { label: "No current item", priority: 9 },
  waiting: { label: "Waiting", priority: 10 },
};

function buildAttentionReasons(
  day: TrackerDeveloperDay
): TrackerAttentionReason[] {
  const reasons: TrackerAttentionReasonCode[] = [];

  if (day.status === "blocked") {
    reasons.push("blocked");
  }
  if (day.signals.freshness.staleWithOpenRisk) {
    reasons.push("stale_with_open_risk");
  }
  if (day.signals.risk.overdueLinkedWork) {
    reasons.push("overdue_linked_work");
  }
  if (day.status === "at_risk") {
    reasons.push("at_risk");
  }
  if (day.signals.freshness.statusChangeWithoutFollowUp) {
    reasons.push("status_change_without_follow_up");
  }
  if (day.signals.freshness.staleWithoutCurrentWork) {
    reasons.push("stale_without_current_work");
  }
  if (day.signals.risk.overCapacity) {
    reasons.push("over_capacity");
  }
  if (
    day.signals.freshness.staleByTime &&
    !day.signals.freshness.staleWithOpenRisk &&
    !day.signals.freshness.staleWithoutCurrentWork
  ) {
    reasons.push("stale_by_time");
  }
  if (!day.currentItem && day.status !== "done_for_today") {
    reasons.push("no_current");
  }
  if (day.status === "waiting") {
    reasons.push("waiting");
  }

  return reasons.map((code) => ({
    code,
    label: ATTENTION_REASON_META[code].label,
    priority: ATTENTION_REASON_META[code].priority,
  }));
}

function getAttentionSortTuple(item: TrackerAttentionItem): [number, number, number, string] {
  const highestPriority = item.reasons[0]?.priority ?? Number.MAX_SAFE_INTEGER;
  const lastCheckInTime = item.lastCheckInAt
    ? new Date(item.lastCheckInAt).getTime()
    : 0;

  return [
    highestPriority,
    -item.reasons.length,
    lastCheckInTime,
    item.developer.displayName.toLowerCase(),
  ];
}

function compareAttentionTuples(
  left: [number, number, number, string],
  right: [number, number, number, string]
): number {
  if (left[0] !== right[0]) {
    return left[0] - right[0];
  }
  if (left[1] !== right[1]) {
    return left[1] - right[1];
  }
  if (left[2] !== right[2]) {
    return left[2] - right[2];
  }

  return left[3].localeCompare(right[3]);
}

function getDeveloperAttentionSortTuple(
  day: TrackerDeveloperDay
): [number, number, number, string] {
  return getAttentionSortTuple({
    developer: day.developer,
    status: day.status,
    reasons: buildAttentionReasons(day),
    lastCheckInAt: day.lastCheckInAt,
    nextFollowUpAt: day.nextFollowUpAt,
    isStale: day.isStale,
    signals: day.signals,
    hasCurrentItem: Boolean(day.currentItem),
    plannedCount: day.plannedItems.length,
    availableQuickActions: getAttentionQuickActions(day),
    setCurrentCandidates: !day.currentItem
      ? day.plannedItems.map(mapAttentionActionItem)
      : [],
  });
}

function getLastActivityTimestamp(day: TrackerDeveloperDay): number {
  const source =
    day.lastCheckInAt ??
    day.statusUpdatedAt ??
    day.updatedAt ??
    day.createdAt;

  return new Date(source).getTime();
}

function matchesSummaryFilter(
  day: TrackerDeveloperDay,
  filter: TrackerBoardSummaryFilter
): boolean {
  switch (filter) {
    case "stale":
      return day.signals.freshness.staleByTime;
    case "blocked":
      return day.status === "blocked";
    case "at_risk":
      return day.status === "at_risk";
    case "waiting":
      return day.status === "waiting";
    case "overdue_linked":
      return day.signals.risk.overdueLinkedWork;
    case "over_capacity":
      return day.signals.risk.overCapacity;
    case "status_follow_up":
      return day.signals.freshness.statusChangeWithoutFollowUp;
    case "no_current":
      return !day.currentItem && day.status !== "done_for_today";
    case "done_for_today":
      return day.status === "done_for_today";
    case "all":
    default:
      return true;
  }
}

function matchesDaySearch(day: TrackerDeveloperDay, normalizedQuery: string): boolean {
  if (!normalizedQuery) {
    return true;
  }

  const haystacks = [
    day.developer.displayName,
    day.managerNotes,
    ...day.checkIns.map((checkIn) => checkIn.summary),
    ...(day.currentItem ? [day.currentItem] : []),
    ...day.plannedItems,
    ...day.completedItems,
    ...day.droppedItems,
  ]
    .flatMap((value) => {
      if (typeof value === "string" || value === undefined) {
        return [value];
      }

      return [
        value.title,
        value.jiraKey,
        value.jiraSummary,
        value.note,
      ];
    })
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());

  return haystacks.some((value) => value.includes(normalizedQuery));
}

function matchesInactiveDeveloperSearch(
  item: {
    developer: Developer;
    availability: { note?: string };
  },
  normalizedQuery: string
): boolean {
  if (!normalizedQuery) {
    return true;
  }

  const haystacks = [
    item.developer.displayName,
    item.availability.note,
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());

  return haystacks.some((value) => value.includes(normalizedQuery));
}

function sortDeveloperDays(
  days: TrackerDeveloperDay[],
  sortBy: TeamTrackerBoardSort
): TrackerDeveloperDay[] {
  return [...days].sort((left, right) => {
    if (sortBy === "name") {
      return left.developer.displayName.localeCompare(right.developer.displayName);
    }

    if (sortBy === "attention") {
      return compareAttentionTuples(
        getDeveloperAttentionSortTuple(left),
        getDeveloperAttentionSortTuple(right)
      );
    }

    if (sortBy === "stale_age") {
      const timestampDiff = getLastActivityTimestamp(left) - getLastActivityTimestamp(right);
      if (timestampDiff !== 0) {
        return timestampDiff;
      }

      return left.developer.displayName.localeCompare(right.developer.displayName);
    }

    if (sortBy === "load") {
      const leftOpenCount = (left.currentItem ? 1 : 0) + left.plannedItems.length;
      const rightOpenCount = (right.currentItem ? 1 : 0) + right.plannedItems.length;
      const capacityDeltaDiff =
        right.signals.risk.capacityDelta - left.signals.risk.capacityDelta;

      if (capacityDeltaDiff !== 0) {
        return capacityDeltaDiff;
      }
      if (rightOpenCount !== leftOpenCount) {
        return rightOpenCount - leftOpenCount;
      }

      return left.developer.displayName.localeCompare(right.developer.displayName);
    }

    const statusDiff =
      BLOCKED_FIRST_STATUS_ORDER[left.status] - BLOCKED_FIRST_STATUS_ORDER[right.status];
    if (statusDiff !== 0) {
      return statusDiff;
    }

    const attentionDiff = compareAttentionTuples(
      getDeveloperAttentionSortTuple(left),
      getDeveloperAttentionSortTuple(right)
    );
    if (attentionDiff !== 0) {
      return attentionDiff;
    }

    return left.developer.displayName.localeCompare(right.developer.displayName);
  });
}

function buildDeveloperGroups(
  days: TrackerDeveloperDay[],
  groupBy: TeamTrackerBoardGroupBy
): TrackerDeveloperGroup[] {
  if (days.length === 0) {
    return [];
  }

  if (groupBy === "none") {
    return [
      {
        key: "all",
        label: "All Developers",
        count: days.length,
        developers: days,
      },
    ];
  }

  if (groupBy === "status") {
    const orderedStatuses: TrackerDeveloperStatus[] = [
      "blocked",
      "at_risk",
      "waiting",
      "on_track",
      "done_for_today",
    ];

    const groups: TrackerDeveloperGroup[] = [];
    for (const status of orderedStatuses) {
      const developers = days.filter((day) => day.status === status);
      if (developers.length === 0) {
        continue;
      }

      groups.push({
        key: status,
        label: TRACKER_STATUS_LABELS[status],
        count: developers.length,
        developers,
      });
    }

    return groups;
  }

  const needsAttention = days.filter((day) => buildAttentionReasons(day).length > 0);
  const stable = days.filter((day) => buildAttentionReasons(day).length === 0);
  const groups: TrackerDeveloperGroup[] = [];

  if (needsAttention.length > 0) {
    groups.push({
      key: "needs_attention",
      label: "Needs Attention",
      count: needsAttention.length,
      developers: needsAttention,
    });
  }

  if (stable.length > 0) {
    groups.push({
      key: "stable",
      label: "Stable",
      count: stable.length,
      developers: stable,
    });
  }

  return groups;
}

export class TeamTrackerService {
  constructor(
    private readonly settings = new SettingsService(),
    private readonly availability = new DeveloperAvailabilityService()
  ) {}

  async getBoard(
    date: string,
    options?: {
      managerAccountId?: string;
      query?: TeamTrackerBoardQuery;
    }
  ): Promise<TeamTrackerBoardResponse> {
    const query = await this.resolveBoardQuery(
      options?.managerAccountId,
      options?.query
    );
    const signalConfig = await this.getSignalConfig();
    const devRows = await db
      .select()
      .from(developers)
      .where(eq(developers.isActive, 1));

    const devList: Developer[] = devRows.map(mapDeveloper);
    const availabilityByAccountId = await this.availability.getAvailabilityMapForDate(
      devList.map((dev) => dev.accountId),
      date
    );
    const activeDevelopers = devList
      .map((developer) => ({
        ...developer,
        availability: availabilityByAccountId.get(developer.accountId) ?? { state: "active" as const },
      }))
      .filter((developer) => developer.availability?.state !== "inactive");
    const inactiveDevelopers = devList
      .map((developer) => ({
        developer,
        availability: availabilityByAccountId.get(developer.accountId) ?? { state: "active" as const },
      }))
      .filter((item) => item.availability.state === "inactive")
      .sort((left, right) => left.developer.displayName.localeCompare(right.developer.displayName));

    const devDays: TrackerDeveloperDay[] = [];

    for (const dev of activeDevelopers) {
      devDays.push(await this.buildDeveloperDay(date, dev, signalConfig));
    }

    const summary = this.computeSummary(devDays);
    const normalizedQuery = query.q.toLowerCase();
    const visibleDevelopers = sortDeveloperDays(
      devDays.filter(
        (day) =>
          matchesSummaryFilter(day, query.summaryFilter) &&
          matchesDaySearch(day, normalizedQuery)
      ),
      query.sortBy
    );
    const visibleSummary = this.computeSummary(visibleDevelopers);
    const groups = buildDeveloperGroups(visibleDevelopers, query.groupBy);
    const filteredInactiveDevelopers = inactiveDevelopers.filter((item) =>
      matchesInactiveDeveloperSearch(item, normalizedQuery)
    );
    const attentionQueue = this.computeAttentionQueue(visibleDevelopers);

    return {
      date,
      developers: visibleDevelopers,
      inactiveDevelopers: filteredInactiveDevelopers,
      summary,
      visibleSummary,
      groups,
      query,
      attentionQueue,
    };
  }

  async listSavedViews(managerAccountId: string): Promise<TeamTrackerSavedView[]> {
    const rows = await db
      .select()
      .from(teamTrackerSavedViews)
      .where(eq(teamTrackerSavedViews.managerAccountId, managerAccountId));

    return rows
      .sort(
        (left, right) =>
          right.updatedAt.localeCompare(left.updatedAt) || right.id - left.id
      )
      .map(mapSavedView);
  }

  async createSavedView(
    managerAccountId: string,
    input: TeamTrackerSavedViewInput
  ): Promise<TeamTrackerSavedView> {
    const name = input.name.trim();
    if (!name) {
      throw new HttpError(400, "name is required");
    }

    await this.assertSavedViewNameAvailable(managerAccountId, name);

    const now = nowIso();
    const query = this.normalizeSavedViewQuery(input);
    const inserted = await db
      .insert(teamTrackerSavedViews)
      .values({
        managerAccountId,
        name,
        searchQuery: query.q || null,
        summaryFilter: query.summaryFilter,
        sortBy: query.sortBy,
        groupBy: query.groupBy,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return mapSavedView(inserted[0]!);
  }

  async updateSavedView(
    managerAccountId: string,
    viewId: number,
    input: TeamTrackerSavedViewUpdate
  ): Promise<TeamTrackerSavedView> {
    const existing = await this.getOwnedSavedViewRow(managerAccountId, viewId);
    const nextName =
      input.name !== undefined ? input.name.trim() : existing.name;

    if (!nextName) {
      throw new HttpError(400, "name is required");
    }

    await this.assertSavedViewNameAvailable(managerAccountId, nextName, viewId);

    const merged = this.normalizeSavedViewQuery({
      q: input.q !== undefined ? input.q : existing.searchQuery ?? "",
      summaryFilter:
        input.summaryFilter !== undefined
          ? input.summaryFilter
          : (existing.summaryFilter as TrackerBoardSummaryFilter),
      sortBy:
        input.sortBy !== undefined
          ? input.sortBy
          : (existing.sortBy as TeamTrackerBoardSort),
      groupBy:
        input.groupBy !== undefined
          ? input.groupBy
          : (existing.groupBy as TeamTrackerBoardGroupBy),
    });

    const now = nowIso();
    await db
      .update(teamTrackerSavedViews)
      .set({
        name: nextName,
        searchQuery: merged.q || null,
        summaryFilter: merged.summaryFilter,
        sortBy: merged.sortBy,
        groupBy: merged.groupBy,
        updatedAt: now,
      })
      .where(eq(teamTrackerSavedViews.id, viewId));

    const updated = await this.getOwnedSavedViewRow(managerAccountId, viewId);
    return mapSavedView(updated);
  }

  async deleteSavedView(managerAccountId: string, viewId: number): Promise<void> {
    await this.getOwnedSavedViewRow(managerAccountId, viewId);

    await db
      .delete(teamTrackerSavedViews)
      .where(eq(teamTrackerSavedViews.id, viewId));
  }

  async resolveBoardQuery(
    managerAccountId: string | undefined,
    rawQuery?: TeamTrackerBoardQuery
  ): Promise<TeamTrackerBoardResolvedQuery> {
    const normalizedRawQuery = rawQuery ?? {};

    if (!normalizedRawQuery.viewId) {
      return {
        ...DEFAULT_BOARD_QUERY,
        q: normalizeBoardSearchQuery(normalizedRawQuery.q),
        summaryFilter:
          normalizedRawQuery.summaryFilter ?? DEFAULT_BOARD_QUERY.summaryFilter,
        sortBy: normalizedRawQuery.sortBy ?? DEFAULT_BOARD_QUERY.sortBy,
        groupBy: normalizedRawQuery.groupBy ?? DEFAULT_BOARD_QUERY.groupBy,
      };
    }

    if (!managerAccountId) {
      throw new HttpError(400, "managerAccountId is required when resolving a saved view");
    }

    const savedView = await this.getOwnedSavedViewRow(
      managerAccountId,
      normalizedRawQuery.viewId
    );

    return {
      q:
        normalizedRawQuery.q !== undefined
          ? normalizeBoardSearchQuery(normalizedRawQuery.q)
          : savedView.searchQuery ?? "",
      summaryFilter:
        normalizedRawQuery.summaryFilter ??
        (savedView.summaryFilter as TrackerBoardSummaryFilter),
      sortBy:
        normalizedRawQuery.sortBy ??
        (savedView.sortBy as TeamTrackerBoardSort),
      groupBy:
        normalizedRawQuery.groupBy ??
        (savedView.groupBy as TeamTrackerBoardGroupBy),
      viewId: savedView.id,
    };
  }

  async getDeveloperDay(
    date: string,
    developerAccountId: string,
    options?: { includeManagerNotes?: boolean }
  ): Promise<TrackerDeveloperDay> {
    const signalConfig = await this.getSignalConfig();
    const developer = await this.getDeveloperByAccountId(developerAccountId);
    const availability = await this.availability.getAvailabilityForDate(developerAccountId, date);
    const day = await this.buildDeveloperDay(
      date,
      {
        ...developer,
        availability,
      },
      signalConfig
    );

    if (options?.includeManagerNotes === false) {
      return {
        ...day,
        managerNotes: undefined,
      };
    }

    return day;
  }

  async getAvailabilityForDate(accountId: string, date: string) {
    return this.availability.getAvailabilityForDate(accountId, date);
  }

  async updateAvailability(
    accountId: string,
    params: {
      effectiveDate: string;
      state: "active" | "inactive";
      note?: string;
    }
  ) {
    return this.availability.setAvailability({ accountId, ...params });
  }

  async ensureDay(
    date: string,
    developerAccountId: string
  ): Promise<typeof teamTrackerDays.$inferSelect> {
    const now = nowIso();
    await db
      .insert(teamTrackerDays)
      .values({
        date,
        developerAccountId,
        status: "on_track",
        statusUpdatedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({
        target: [teamTrackerDays.date, teamTrackerDays.developerAccountId],
      });

    const rows = await db
      .select()
      .from(teamTrackerDays)
      .where(
        and(
          eq(teamTrackerDays.date, date),
          eq(teamTrackerDays.developerAccountId, developerAccountId)
        )
      )
      .limit(1);

    if (!rows[0]) {
      throw new Error(
        `Failed to initialize tracker day for ${developerAccountId} on ${date}`
      );
    }

    return rows[0];
  }

  async updateDay(
    accountId: string,
    date: string,
    updates: {
      status?: TrackerDeveloperStatus;
      capacityUnits?: number | null;
      managerNotes?: string;
    }
  ): Promise<typeof teamTrackerDays.$inferSelect> {
    const day = await this.ensureDay(date, accountId);
    const now = nowIso();
    const nextStatus = updates.status;
    const statusChanged =
      nextStatus !== undefined && nextStatus !== day.status;

    await db
      .update(teamTrackerDays)
      .set({
        ...(nextStatus !== undefined && { status: nextStatus }),
        ...(statusChanged && { statusUpdatedAt: now }),
        ...(updates.capacityUnits !== undefined && {
          capacityUnits: updates.capacityUnits,
        }),
        ...(updates.managerNotes !== undefined && {
          managerNotes: updates.managerNotes,
        }),
        updatedAt: now,
      })
      .where(eq(teamTrackerDays.id, day.id));

    const updated = await db
      .select()
      .from(teamTrackerDays)
      .where(eq(teamTrackerDays.id, day.id))
      .limit(1);
    return updated[0]!;
  }

  async addItem(
    accountId: string,
    date: string,
    params: {
      jiraKey?: string;
      title: string;
      note?: string;
      managerDeskItemId?: number;
    }
  ): Promise<TrackerWorkItem> {
    const day = await this.ensureDay(date, accountId);
    const normalizedJiraKey = params.jiraKey?.trim();

    if (normalizedJiraKey) {
      const issueRows = await db
        .select({ jiraKey: issues.jiraKey })
        .from(issues)
        .where(eq(issues.jiraKey, normalizedJiraKey))
        .limit(1);

      if (!issueRows[0]) {
        throw new HttpError(
          400,
          `Jira issue ${normalizedJiraKey} is not available in synced issues`
        );
      }
    }

    // Get next position
    const existing = await db
      .select()
      .from(teamTrackerItems)
      .where(eq(teamTrackerItems.dayId, day.id));
    const maxPosition = existing.reduce(
      (max, i) => Math.max(max, i.position),
      -1
    );

    const now = nowIso();
    const inserted = await db
      .insert(teamTrackerItems)
      .values({
        dayId: day.id,
        managerDeskItemId: params.managerDeskItemId ?? null,
        itemType: normalizedJiraKey ? "jira" : "custom",
        jiraKey: normalizedJiraKey ?? null,
        title: params.title,
        state: "planned",
        position: maxPosition + 1,
        note: params.note ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.getItemById(inserted[0]!.id);
  }

  async syncManagerDeskItem(params: {
    managerDeskItemId: number;
    assigneeDeveloperAccountId?: string | null;
    date: string;
    title: string;
    issueKeys: string[];
    note?: string | null;
  }): Promise<void> {
    const existing = await this.getManagerDeskTrackerItem(params.managerDeskItemId);

    if (!params.assigneeDeveloperAccountId) {
      if (existing) {
        await this.deleteItem(existing.id);
      }
      return;
    }

    await this.getDeveloperByAccountId(params.assigneeDeveloperAccountId);

    const normalizedIssueKeys = [...new Set(params.issueKeys.map((key) => key.trim()).filter(Boolean))];
    const jiraKey = normalizedIssueKeys.length === 1 ? normalizedIssueKeys[0] : undefined;

    if (jiraKey) {
      const issueRows = await db
        .select({ jiraKey: issues.jiraKey })
        .from(issues)
        .where(eq(issues.jiraKey, jiraKey))
        .limit(1);
      if (!issueRows[0]) {
        throw new HttpError(400, `Jira issue ${jiraKey} is not available in synced issues`);
      }
    }

    if (existing) {
      const currentDay = await this.getDayById(existing.dayId);
      if (
        currentDay?.developerAccountId === params.assigneeDeveloperAccountId &&
        currentDay.date === params.date
      ) {
        await db
          .update(teamTrackerItems)
          .set({
            itemType: jiraKey ? "jira" : "custom",
            jiraKey: jiraKey ?? null,
            title: params.title,
            updatedAt: nowIso(),
          })
          .where(eq(teamTrackerItems.id, existing.id));
        return;
      }

      await this.deleteItem(existing.id);
    }

    await this.addItem(params.assigneeDeveloperAccountId, params.date, {
      jiraKey,
      title: params.title,
      note: params.note ?? undefined,
      managerDeskItemId: params.managerDeskItemId,
    });
  }

  async updateItem(
    itemId: number,
    updates: {
      title?: string;
      state?: TrackerItemState;
      note?: string;
      position?: number;
    }
  ): Promise<TrackerWorkItem> {
    const existing = await this.getItemRow(itemId);
    const now = nowIso();
    const setFields: Record<string, unknown> = { updatedAt: now };

    if (updates.title !== undefined) setFields.title = updates.title;
    if (updates.note !== undefined) setFields.note = updates.note;
    if (updates.state !== undefined) {
      if (updates.state === "in_progress") {
        await this.setSingleInProgress(existing.dayId, itemId, now);
      }
      setFields.state = updates.state;
      if (updates.state === "done") {
        setFields.completedAt = now;
      } else {
        setFields.completedAt = null;
      }
    }

    if (updates.position !== undefined) {
      await this.reorderItem(existing, updates.position, now);
    }

    if (Object.keys(setFields).length > 1) {
      await db
        .update(teamTrackerItems)
        .set(setFields)
        .where(eq(teamTrackerItems.id, itemId));
    }

    return this.getItemById(itemId);
  }

  async deleteItem(itemId: number): Promise<void> {
    await db
      .delete(teamTrackerItems)
      .where(eq(teamTrackerItems.id, itemId));
  }

  async setCurrentItem(itemId: number): Promise<TrackerWorkItem> {
    // Get the item to find its day
    const item = await this.getItemRow(itemId);
    const now = nowIso();

    await this.setSingleInProgress(item.dayId, itemId, now);

    const updated = await db
      .select()
      .from(teamTrackerItems)
      .where(eq(teamTrackerItems.id, itemId))
      .limit(1);

    if (!updated[0]) throw new Error("Item not found after update");
    return this.getItemById(updated[0].id);
  }

  async addCheckIn(
    accountId: string,
    date: string,
    params: {
      summary: string;
      status?: TrackerDeveloperStatus;
      rationale?: string;
      nextFollowUpAt?: string | null;
    },
    actor?: {
      type: UserRole;
      accountId?: string;
    }
  ): Promise<TrackerCheckIn> {
    const day = await this.ensureDay(date, accountId);
    const now = nowIso();
    const summary = params.summary.trim();
    const rationale = normalizeOptionalText(params.rationale);
    const nextFollowUpAt = params.nextFollowUpAt ?? null;

    if (!summary) {
      throw new HttpError(400, "summary is required");
    }

    const inserted = await db
      .insert(teamTrackerCheckIns)
      .values({
        dayId: day.id,
        summary,
        status: params.status ?? null,
        rationale: rationale ?? null,
        nextFollowUpAt,
        authorType: actor?.type ?? "manager",
        authorAccountId: actor?.accountId ?? null,
        createdAt: now,
      })
      .returning();

    const checkInRow = inserted[0]!;

    // Update last check-in time on the day row
    const dayUpdates: Record<string, unknown> = {
      lastCheckInAt: now,
      nextFollowUpAt,
      updatedAt: now,
    };
    if (params.status) {
      dayUpdates.status = params.status;
      if (params.status !== day.status) {
        dayUpdates.statusUpdatedAt = now;
      }
    }
    await db
      .update(teamTrackerDays)
      .set(dayUpdates)
      .where(eq(teamTrackerDays.id, day.id));

    return mapCheckIn(checkInRow);
  }

  async recordStatusUpdate(
    accountId: string,
    date: string,
    params: {
      status: TrackerDeveloperStatus;
      rationale?: string;
      summary?: string;
      nextFollowUpAt?: string | null;
    },
    actor?: {
      type: UserRole;
      accountId?: string;
    }
  ): Promise<TrackerDeveloperDay> {
    const rationale = normalizeOptionalText(params.rationale);
    const summary = normalizeOptionalText(params.summary);

    if (requiresStatusRationale(params.status) && !rationale) {
      throw new HttpError(
        400,
        "rationale is required when status is blocked or at_risk"
      );
    }

    await this.addCheckIn(
      accountId,
      date,
      {
        summary: buildStatusUpdateSummary({
          status: params.status,
          rationale,
          summary,
        }),
        status: params.status,
        rationale,
        nextFollowUpAt: params.nextFollowUpAt ?? null,
      },
      actor
    );

    return this.getDeveloperDay(date, accountId);
  }

  async assertItemBelongsToDeveloper(
    itemId: number,
    developerAccountId: string
  ): Promise<{ ownerAccountId: string; date: string }> {
    const rows = await db
      .select({
        ownerAccountId: teamTrackerDays.developerAccountId,
        date: teamTrackerDays.date,
      })
      .from(teamTrackerItems)
      .innerJoin(teamTrackerDays, eq(teamTrackerDays.id, teamTrackerItems.dayId))
      .where(eq(teamTrackerItems.id, itemId))
      .limit(1);

    const row = rows[0];
    if (!row) {
      throw new HttpError(404, "Item not found");
    }

    if (row.ownerAccountId !== developerAccountId) {
      throw new HttpError(403, "Item does not belong to authenticated developer");
    }

    return row;
  }

  async getIssueAssignments(
    jiraKey: string,
    date: string
  ): Promise<TrackerIssueAssignment[]> {
    const normalizedJiraKey = jiraKey.trim();
    if (!normalizedJiraKey) {
      return [];
    }

    return (await this.getActiveIssueAssignmentsForDate(date)).filter(
      (assignment) => assignment.jiraKey === normalizedJiraKey
    );
  }

  async getIssueAssignmentSummaryMap(
    date: string
  ): Promise<Map<string, IssueTrackerAssignmentSummary>> {
    const assignments = await this.getActiveIssueAssignmentsForDate(date);
    const summaryMap = new Map<string, IssueTrackerAssignmentSummary>();

    for (const assignment of assignments) {
      const summary = summaryMap.get(assignment.jiraKey);
      if (summary) {
        summary.activeCount += 1;
        if (!summary.developerNames.includes(assignment.developer.displayName)) {
          summary.developerNames.push(assignment.developer.displayName);
        }
        continue;
      }

      summaryMap.set(assignment.jiraKey, {
        activeCount: 1,
        developerNames: [assignment.developer.displayName],
      });
    }

    return summaryMap;
  }

  async getItemDetailContext(itemId: number): Promise<{
    date: string;
    developer: Developer;
    trackerItem: TrackerWorkItem;
  }> {
    const rows = await db
      .select({
        item: teamTrackerItems,
        date: teamTrackerDays.date,
        developer: developers,
      })
      .from(teamTrackerItems)
      .innerJoin(teamTrackerDays, eq(teamTrackerDays.id, teamTrackerItems.dayId))
      .innerJoin(developers, eq(developers.accountId, teamTrackerDays.developerAccountId))
      .where(eq(teamTrackerItems.id, itemId))
      .limit(1);

    const row = rows[0];
    if (!row) {
      throw new HttpError(404, "Item not found");
    }

    const issueContextMap = await this.getIssueContextMap(
      row.item.jiraKey ? [row.item.jiraKey] : []
    );

    return {
      date: row.date,
      developer: mapDeveloper(row.developer),
      trackerItem: mapItem(
        row.item,
        row.item.jiraKey ? issueContextMap.get(row.item.jiraKey) : undefined
      ),
    };
  }

  async getItemDetailContextForManagerDeskItem(
    managerDeskItemId: number
  ): Promise<
    | {
        date: string;
        developer: Developer;
        trackerItem: TrackerWorkItem;
      }
    | null
  > {
    const rows = await db
      .select({
        item: teamTrackerItems,
        date: teamTrackerDays.date,
        developer: developers,
      })
      .from(teamTrackerItems)
      .innerJoin(teamTrackerDays, eq(teamTrackerDays.id, teamTrackerItems.dayId))
      .innerJoin(developers, eq(developers.accountId, teamTrackerDays.developerAccountId))
      .where(eq(teamTrackerItems.managerDeskItemId, managerDeskItemId))
      .limit(1);

    const row = rows[0];
    if (!row) {
      return null;
    }

    const issueContextMap = await this.getIssueContextMap(
      row.item.jiraKey ? [row.item.jiraKey] : []
    );

    return {
      date: row.date,
      developer: mapDeveloper(row.developer),
      trackerItem: mapItem(
        row.item,
        row.item.jiraKey ? issueContextMap.get(row.item.jiraKey) : undefined
      ),
    };
  }

  async linkManagerDeskItem(
    itemId: number,
    managerDeskItemId: number
  ): Promise<TrackerWorkItem> {
    await this.getItemRow(itemId);

    await db
      .update(teamTrackerItems)
      .set({ managerDeskItemId })
      .where(eq(teamTrackerItems.id, itemId));

    return this.getItemById(itemId);
  }

  async previewCarryForward(fromDate: string, toDate: string): Promise<number> {
    const plan = await this.buildCarryForwardPlan(fromDate, toDate);
    return plan.trackerOnlyItems.length + plan.managerDeskItemIds.length;
  }

  async carryForward(
    fromDate: string,
    toDate: string,
    options?: CarryForwardExecutionOptions
  ): Promise<number> {
    const plan = await this.buildCarryForwardPlan(fromDate, toDate);
    let carried = await this.carryForwardTrackerOnlyItems(
      plan.trackerOnlyItems,
      toDate
    );

    if (plan.managerDeskItemIds.length > 0) {
      if (!options?.carryManagerDeskItems) {
        throw new Error("Manager Desk carry-forward handler is required for linked tracker items");
      }

      carried += await options.carryManagerDeskItems({
        fromDate,
        toDate,
        itemIds: plan.managerDeskItemIds,
      });
    }

    return carried;
  }

  private computeSummary(days: TrackerDeveloperDay[]): TrackerBoardSummary {
    return {
      total: days.length,
      stale: days.filter((d) => d.signals.freshness.staleByTime).length,
      blocked: days.filter((d) => d.status === "blocked").length,
      atRisk: days.filter((d) => d.status === "at_risk").length,
      waiting: days.filter((d) => d.status === "waiting").length,
      noCurrent: days.filter((d) => !d.currentItem && d.status !== "done_for_today").length,
      overdueLinkedWork: days.filter((d) => d.signals.risk.overdueLinkedWork).length,
      overCapacity: days.filter((d) => d.signals.risk.overCapacity).length,
      statusFollowUp: days.filter((d) => d.signals.freshness.statusChangeWithoutFollowUp).length,
      doneForToday: days.filter((d) => d.status === "done_for_today").length,
    };
  }

  private computeAttentionQueue(days: TrackerDeveloperDay[]): TrackerAttentionItem[] {
    const queue: TrackerAttentionItem[] = [];

    for (const day of days) {
      const reasons = buildAttentionReasons(day);
      if (reasons.length === 0) {
        continue;
      }

      queue.push({
        developer: day.developer,
        status: day.status,
        reasons,
        lastCheckInAt: day.lastCheckInAt,
        nextFollowUpAt: day.nextFollowUpAt,
        isStale: day.isStale,
        signals: day.signals,
        hasCurrentItem: Boolean(day.currentItem),
        plannedCount: day.plannedItems.length,
        availableQuickActions: getAttentionQuickActions(day),
        setCurrentCandidates: !day.currentItem
          ? day.plannedItems.map(mapAttentionActionItem)
          : [],
      });
    }

    return queue.sort((left, right) => {
      const [leftPriority, leftReasonCount, leftCheckInTime, leftName] =
        getAttentionSortTuple(left);
      const [rightPriority, rightReasonCount, rightCheckInTime, rightName] =
        getAttentionSortTuple(right);

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }
      if (leftReasonCount !== rightReasonCount) {
        return leftReasonCount - rightReasonCount;
      }
      if (leftCheckInTime !== rightCheckInTime) {
        return leftCheckInTime - rightCheckInTime;
      }

      return leftName.localeCompare(rightName);
    });
  }

  private async getDeveloperByAccountId(accountId: string): Promise<Developer> {
    const rows = await db
      .select()
      .from(developers)
      .where(eq(developers.accountId, accountId))
      .limit(1);

    const row = rows[0];
    if (!row) {
      throw new HttpError(404, `Developer ${accountId} not found`);
    }

    return mapDeveloper(row);
  }

  private async buildDeveloperDay(
    date: string,
    developer: Developer,
    signalConfig: TrackerSignalConfig
  ): Promise<TrackerDeveloperDay> {
    const day = await this.ensureDay(date, developer.accountId);
    const items = await db
      .select()
      .from(teamTrackerItems)
      .where(eq(teamTrackerItems.dayId, day.id));
    const checkIns = await db
      .select()
      .from(teamTrackerCheckIns)
      .where(eq(teamTrackerCheckIns.dayId, day.id));

    const mapped = (await this.mapItemsWithIssueContext(items)).sort(
      (a, b) => a.position - b.position
    );
    const currentItem = mapped.find((i) => i.state === "in_progress");
    const plannedItems = mapped.filter((i) => i.state === "planned");
    const completedItems = mapped.filter((i) => i.state === "done");
    const droppedItems = mapped.filter((i) => i.state === "dropped");
    const signals = buildSignals({
      date,
      status: day.status as TrackerDeveloperStatus,
      lastCheckInAt: day.lastCheckInAt,
      statusUpdatedAt: day.statusUpdatedAt,
      updatedAt: day.updatedAt,
      currentItem,
      plannedItems,
      capacityUnits: day.capacityUnits ?? undefined,
      config: signalConfig,
    });

    return {
      id: day.id,
      date,
      developer,
      availability: developer.availability ?? { state: "active" },
      status: day.status as TrackerDeveloperStatus,
      capacityUnits: day.capacityUnits ?? undefined,
      managerNotes: day.managerNotes ?? undefined,
      lastCheckInAt: day.lastCheckInAt ?? undefined,
      nextFollowUpAt: day.nextFollowUpAt ?? undefined,
      currentItem,
      plannedItems,
      completedItems,
      droppedItems,
      checkIns: checkIns.map(mapCheckIn),
      isStale: signals.freshness.staleByTime,
      signals,
      statusUpdatedAt: day.statusUpdatedAt ?? undefined,
      createdAt: day.createdAt,
      updatedAt: day.updatedAt,
    };
  }

  private async getSignalConfig(): Promise<TrackerSignalConfig> {
    const [
      staleThresholdHours,
      noCurrentThresholdHours,
      statusFollowUpThresholdHours,
    ] = await Promise.all([
      this.settings.getTeamTrackerStaleThresholdHours(),
      this.settings.getTeamTrackerNoCurrentThresholdHours(),
      this.settings.getTeamTrackerStatusFollowUpThresholdHours(),
    ]);

    return {
      staleThresholdHours,
      noCurrentThresholdHours,
      statusFollowUpThresholdHours,
    };
  }

  private normalizeSavedViewQuery(input: {
    q?: string;
    summaryFilter?: TrackerBoardSummaryFilter;
    sortBy?: TeamTrackerBoardSort;
    groupBy?: TeamTrackerBoardGroupBy;
  }): Omit<TeamTrackerBoardResolvedQuery, "viewId"> {
    return {
      q: normalizeBoardSearchQuery(input.q),
      summaryFilter: input.summaryFilter ?? DEFAULT_BOARD_QUERY.summaryFilter,
      sortBy: input.sortBy ?? DEFAULT_BOARD_QUERY.sortBy,
      groupBy: input.groupBy ?? DEFAULT_BOARD_QUERY.groupBy,
    };
  }

  private async getOwnedSavedViewRow(
    managerAccountId: string,
    viewId: number
  ): Promise<typeof teamTrackerSavedViews.$inferSelect> {
    const rows = await db
      .select()
      .from(teamTrackerSavedViews)
      .where(
        and(
          eq(teamTrackerSavedViews.id, viewId),
          eq(teamTrackerSavedViews.managerAccountId, managerAccountId)
        )
      )
      .limit(1);

    const row = rows[0];
    if (!row) {
      throw new HttpError(404, "Saved view not found");
    }

    return row;
  }

  private async assertSavedViewNameAvailable(
    managerAccountId: string,
    name: string,
    excludeViewId?: number
  ): Promise<void> {
    const rows = await db
      .select()
      .from(teamTrackerSavedViews)
      .where(
        and(
          eq(teamTrackerSavedViews.managerAccountId, managerAccountId),
          eq(teamTrackerSavedViews.name, name)
        )
      )
      .limit(1);

    const existing = rows[0];
    if (existing && existing.id !== excludeViewId) {
      throw new HttpError(409, `Saved view "${name}" already exists`);
    }
  }

  private async getItemRow(
    itemId: number
  ): Promise<typeof teamTrackerItems.$inferSelect> {
    const rows = await db
      .select()
      .from(teamTrackerItems)
      .where(eq(teamTrackerItems.id, itemId))
      .limit(1);

    if (!rows[0]) throw new Error("Item not found");
    return rows[0];
  }

  private async getItemById(itemId: number): Promise<TrackerWorkItem> {
    const row = await this.getItemRow(itemId);
    const issueContextMap = await this.getIssueContextMap(
      row.jiraKey ? [row.jiraKey] : []
    );
    return mapItem(row, row.jiraKey ? issueContextMap.get(row.jiraKey) : undefined);
  }

  private async mapItemsWithIssueContext(
    rows: Array<typeof teamTrackerItems.$inferSelect>
  ): Promise<TrackerWorkItem[]> {
    const jiraKeys = rows
      .map((row) => row.jiraKey)
      .filter((jiraKey): jiraKey is string => Boolean(jiraKey));
    const issueContextMap = await this.getIssueContextMap(jiraKeys);

    return rows.map((row) =>
      mapItem(row, row.jiraKey ? issueContextMap.get(row.jiraKey) : undefined)
    );
  }

  private async getManagerDeskTrackerItem(
    managerDeskItemId: number
  ): Promise<typeof teamTrackerItems.$inferSelect | undefined> {
    const rows = await db
      .select()
      .from(teamTrackerItems)
      .where(eq(teamTrackerItems.managerDeskItemId, managerDeskItemId))
      .limit(1);

    return rows[0];
  }

  private async getDayById(
    dayId: number
  ): Promise<typeof teamTrackerDays.$inferSelect | undefined> {
    const rows = await db
      .select()
      .from(teamTrackerDays)
      .where(eq(teamTrackerDays.id, dayId))
      .limit(1);

    return rows[0];
  }

  private async getIssueContextMap(
    jiraKeys: string[]
  ): Promise<Map<string, TrackerIssueContext>> {
    const uniqueKeys = [...new Set(jiraKeys)];
    if (uniqueKeys.length === 0) {
      return new Map();
    }

    const rows = await db
      .select({
        jiraKey: issues.jiraKey,
        summary: issues.summary,
        priorityName: issues.priorityName,
        dueDate: issues.dueDate,
        developmentDueDate: issues.developmentDueDate,
      })
      .from(issues)
      .where(inArray(issues.jiraKey, uniqueKeys));

    return new Map(rows.map((row) => [row.jiraKey, row]));
  }

  private async getActiveIssueAssignmentsForDate(
    date: string
  ): Promise<TrackerIssueAssignment[]> {
    const dayRows = await db
      .select()
      .from(teamTrackerDays)
      .where(eq(teamTrackerDays.date, date));

    if (dayRows.length === 0) {
      return [];
    }

    const dayIdToAccountId = new Map(
      dayRows.map((row) => [row.id, row.developerAccountId])
    );
    const activeDayIds = dayRows.map((row) => row.id);
    const itemRows = await db
      .select()
      .from(teamTrackerItems)
      .where(inArray(teamTrackerItems.dayId, activeDayIds));
    const matches = itemRows
      .filter(
        (item) =>
          Boolean(item.jiraKey) &&
          (item.state === "planned" || item.state === "in_progress")
      )
      .sort(
        (left, right) =>
          (left.state === "in_progress" ? 0 : left.state === "planned" ? 1 : 2) -
            (right.state === "in_progress" ? 0 : right.state === "planned" ? 1 : 2) ||
          left.position - right.position ||
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime() ||
          left.id - right.id
      );

    if (matches.length === 0) {
      return [];
    }

    const accountIds = [...new Set(dayRows.map((row) => row.developerAccountId))];
    const availabilityByAccountId = await this.availability.getAvailabilityMapForDate(
      accountIds,
      date
    );
    const developerRows = await db
      .select()
      .from(developers)
      .where(inArray(developers.accountId, accountIds));
    const developerMap = new Map(
      developerRows.map((row) => [row.accountId, mapDeveloper(row)])
    );

    return matches.flatMap((match) => {
      const jiraKey = match.jiraKey?.trim();
      if (!jiraKey) {
        return [];
      }

      const accountId = dayIdToAccountId.get(match.dayId);
      if (!accountId) {
        return [];
      }

      const developer = developerMap.get(accountId);
      if (!developer || availabilityByAccountId.get(accountId)?.state === "inactive") {
        return [];
      }

      return [
        {
          date,
          jiraKey,
          itemId: match.id,
          title: match.title,
          state: match.state as TrackerItemState,
          developer,
        },
      ];
    });
  }

  private buildRemainingCarryForwardMap(
    sourceItems: Array<
      Pick<
        typeof teamTrackerItems.$inferSelect,
        "jiraKey" | "title" | "note"
      >
    >,
    targetItems: Array<
      Pick<
        typeof teamTrackerItems.$inferSelect,
        "jiraKey" | "title" | "note"
      >
    >
  ): Map<string, number> {
    const targetCounts = new Map<string, number>();
    for (const item of targetItems) {
      const key = buildCarryForwardKey(item);
      targetCounts.set(key, (targetCounts.get(key) ?? 0) + 1);
    }

    const sourceCounts = new Map<string, number>();
    for (const item of sourceItems) {
      const key = buildCarryForwardKey(item);
      sourceCounts.set(key, (sourceCounts.get(key) ?? 0) + 1);
    }

    const remainingToCarry = new Map<string, number>();
    for (const [key, count] of sourceCounts.entries()) {
      remainingToCarry.set(
        key,
        Math.max(0, count - (targetCounts.get(key) ?? 0))
      );
    }

    return remainingToCarry;
  }

  private async getTargetCarryForwardItems(
    toDate: string,
    developerAccountId: string
  ): Promise<Array<typeof teamTrackerItems.$inferSelect>> {
    const targetDayRows = await db
      .select()
      .from(teamTrackerDays)
      .where(
        and(
          eq(teamTrackerDays.date, toDate),
          eq(teamTrackerDays.developerAccountId, developerAccountId)
        )
      )
      .limit(1);

    const targetDay = targetDayRows[0];
    if (!targetDay) {
      return [];
    }

    const items = await db
      .select()
      .from(teamTrackerItems)
      .where(eq(teamTrackerItems.dayId, targetDay.id));

    return items;
  }

  private async buildCarryForwardPlan(
    fromDate: string,
    toDate: string
  ): Promise<CarryForwardPlan> {
    const dayRows = await db
      .select()
      .from(teamTrackerDays)
      .where(eq(teamTrackerDays.date, fromDate));

    const trackerOnlyItems: CarryForwardSourceItem[] = [];
    const managerDeskItemIds: number[] = [];

    for (const dayRow of dayRows) {
      const items = await db
        .select()
        .from(teamTrackerItems)
        .where(eq(teamTrackerItems.dayId, dayRow.id));

      const unfinished = items
        .filter(isCarryForwardEligibleItem)
        .sort((a, b) => a.position - b.position);

      if (unfinished.length === 0) {
        continue;
      }

      const targetItems = await this.getTargetCarryForwardItems(
        toDate,
        dayRow.developerAccountId
      );
      const remainingToCarry = this.buildRemainingCarryForwardMap(
        unfinished,
        targetItems
      );

      for (const item of unfinished) {
        const key = buildCarryForwardKey(item);
        const remaining = remainingToCarry.get(key) ?? 0;
        if (remaining === 0) {
          continue;
        }

        if (item.managerDeskItemId === null) {
          trackerOnlyItems.push({
            developerAccountId: dayRow.developerAccountId,
            item,
          });
        } else {
          managerDeskItemIds.push(item.managerDeskItemId);
        }

        remainingToCarry.set(key, remaining - 1);
      }
    }

    return {
      trackerOnlyItems,
      managerDeskItemIds,
    };
  }

  private async carryForwardTrackerOnlyItems(
    items: CarryForwardSourceItem[],
    toDate: string
  ): Promise<number> {
    if (items.length === 0) {
      return 0;
    }

    let carried = 0;
    const itemsByDeveloper = new Map<string, Array<typeof teamTrackerItems.$inferSelect>>();

    for (const entry of items) {
      const existing = itemsByDeveloper.get(entry.developerAccountId) ?? [];
      existing.push(entry.item);
      itemsByDeveloper.set(entry.developerAccountId, existing);
    }

    for (const [developerAccountId, sourceItems] of itemsByDeveloper.entries()) {
      const newDay = await this.ensureDay(toDate, developerAccountId);
      const targetItems = await db
        .select()
        .from(teamTrackerItems)
        .where(eq(teamTrackerItems.dayId, newDay.id));

      let nextPosition =
        targetItems.reduce((max, item) => Math.max(max, item.position), -1) + 1;
      const now = nowIso();

      for (const item of sourceItems.sort((a, b) => a.position - b.position)) {
        await db.insert(teamTrackerItems).values({
          dayId: newDay.id,
          itemType: item.itemType,
          jiraKey: item.jiraKey,
          title: item.title,
          state: "planned",
          position: nextPosition,
          note: item.note,
          createdAt: now,
          updatedAt: now,
        });
        nextPosition += 1;
        carried += 1;
      }
    }

    return carried;
  }

  private async reorderItem(
    item: typeof teamTrackerItems.$inferSelect,
    targetPosition: number,
    now: string
  ): Promise<void> {
    const siblings = await db
      .select()
      .from(teamTrackerItems)
      .where(eq(teamTrackerItems.dayId, item.dayId));

    const ordered = [...siblings].sort(
      (left, right) => left.position - right.position || left.id - right.id
    );
    const currentIndex = ordered.findIndex((candidate) => candidate.id === item.id);
    if (currentIndex === -1) {
      throw new Error("Item not found");
    }

    const boundedIndex = Math.max(0, Math.min(targetPosition, ordered.length - 1));
    if (currentIndex === boundedIndex) {
      return;
    }

    const [moved] = ordered.splice(currentIndex, 1);
    if (!moved) {
      throw new Error("Item not found");
    }
    ordered.splice(boundedIndex, 0, moved);

    for (const [index, sibling] of ordered.entries()) {
      if (sibling.position === index) {
        continue;
      }

      await db
        .update(teamTrackerItems)
        .set({ position: index, updatedAt: now })
        .where(eq(teamTrackerItems.id, sibling.id));
    }
  }

  private async setSingleInProgress(
    dayId: number,
    itemId: number,
    now: string
  ): Promise<void> {
    await db
      .update(teamTrackerItems)
      .set({ state: "planned", updatedAt: now })
      .where(
        and(
          eq(teamTrackerItems.dayId, dayId),
          eq(teamTrackerItems.state, "in_progress")
        )
      );

    await db
      .update(teamTrackerItems)
      .set({ state: "in_progress", updatedAt: now, completedAt: null })
      .where(eq(teamTrackerItems.id, itemId));
  }
}
