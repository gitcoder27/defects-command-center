import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { TeamTrackerBoardResponse } from '@/types';

interface CarryForwardPreviewResponse {
  carryable: number;
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
