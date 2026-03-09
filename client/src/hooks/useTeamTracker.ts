import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { TeamTrackerBoardResponse, TrackerIssueAssignment } from '@/types';

interface CarryForwardPreviewResponse {
  carryable: number;
}

interface TrackerIssueAssignmentResponse {
  assignment: TrackerIssueAssignment | null;
}

export function useTeamTracker(date: string) {
  return useQuery<TeamTrackerBoardResponse>({
    queryKey: ['team-tracker', date],
    queryFn: () => api.get<TeamTrackerBoardResponse>(`/team-tracker?date=${date}`),
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

export function useTrackerIssueAssignment(jiraKey?: string, date?: string) {
  return useQuery<TrackerIssueAssignment | null>({
    queryKey: ['team-tracker', 'issue-assignment', date, jiraKey],
    queryFn: async () => {
      const params = new URLSearchParams({ date: date! });
      const res = await api.get<TrackerIssueAssignmentResponse>(
        `/team-tracker/issues/${encodeURIComponent(jiraKey!)}/assignment?${params.toString()}`
      );
      return res.assignment ?? null;
    },
    enabled: Boolean(jiraKey && date),
    staleTime: 0,
    refetchOnMount: true,
  });
}
