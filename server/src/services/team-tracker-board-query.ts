import type {
  TeamTrackerBoardGroupBy,
  TeamTrackerBoardQuery,
  TeamTrackerBoardResolvedQuery,
  TeamTrackerBoardSort,
  TrackerBoardSummaryFilter,
} from "shared/types";

export const DEFAULT_BOARD_QUERY: TeamTrackerBoardResolvedQuery = {
  q: "",
  summaryFilter: "all",
  sortBy: "name",
  groupBy: "none",
};

export function normalizeBoardSearchQuery(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

export function resolveUnsavedBoardQuery(
  rawQuery?: TeamTrackerBoardQuery
): TeamTrackerBoardResolvedQuery {
  const normalizedRawQuery = rawQuery ?? {};

  return {
    ...DEFAULT_BOARD_QUERY,
    q: normalizeBoardSearchQuery(normalizedRawQuery.q),
    summaryFilter: normalizedRawQuery.summaryFilter ?? DEFAULT_BOARD_QUERY.summaryFilter,
    sortBy: normalizedRawQuery.sortBy ?? DEFAULT_BOARD_QUERY.sortBy,
    groupBy: normalizedRawQuery.groupBy ?? DEFAULT_BOARD_QUERY.groupBy,
  };
}

export function normalizeSavedViewQuery(input: {
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
