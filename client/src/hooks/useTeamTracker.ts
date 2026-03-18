import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  TeamTrackerBoardResponse,
  TeamTrackerBoardQuery,
  TrackerIssueAssignment,
} from '@/types';

interface CarryForwardPreviewResponse {
  carryable: number;
}

interface TrackerIssueAssignmentsResponse {
  assignments?: TrackerIssueAssignment[];
}

function buildBoardUrl(date: string, query?: TeamTrackerBoardQuery): string {
  const params = new URLSearchParams({ date });
  if (query?.q) params.set('q', query.q);
  if (query?.summaryFilter && query.summaryFilter !== 'all') params.set('summaryFilter', query.summaryFilter);
  if (query?.sortBy) params.set('sortBy', query.sortBy);
  if (query?.groupBy && query.groupBy !== 'none') params.set('groupBy', query.groupBy);
  if (query?.viewId != null) params.set('viewId', String(query.viewId));
  return `/team-tracker?${params.toString()}`;
}

export function useTeamTracker(date: string, query?: TeamTrackerBoardQuery) {
  return useQuery<TeamTrackerBoardResponse>({
    queryKey: ['team-tracker', date, query ?? {}],
    queryFn: () => api.get<TeamTrackerBoardResponse>(buildBoardUrl(date, query)),
    refetchInterval: 30_000,
  });
}

export function useCarryForwardPreview(fromDate: string, toDate: string, enabled = true) {
  return useQuery<number>({
    queryKey: ['team-tracker', 'carry-forward-preview', fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams({ fromDate, toDate });
      const res = await api.get<CarryForwardPreviewResponse>(
        `/team-tracker/carry-forward-preview?${params.toString()}`
      );
      return res.carryable;
    },
    enabled,
    staleTime: 30_000,
  });
}

export function useTrackerIssueAssignments(jiraKey?: string, date?: string) {
  return useQuery<TrackerIssueAssignment[]>({
    queryKey: ['team-tracker', 'issue-assignment', date, jiraKey],
    queryFn: async () => {
      const params = new URLSearchParams({ date: date! });
      const res = await api.get<TrackerIssueAssignmentsResponse>(
        `/team-tracker/issues/${encodeURIComponent(jiraKey!)}/assignment?${params.toString()}`
      );
      return res.assignments ?? [];
    },
    enabled: Boolean(jiraKey && date),
    staleTime: 0,
    refetchOnMount: true,
  });
}
