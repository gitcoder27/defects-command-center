import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { TeamTrackerBoardResponse } from '@/types';

export function useTeamTracker(date: string) {
  return useQuery<TeamTrackerBoardResponse>({
    queryKey: ['team-tracker', date],
    queryFn: () => api.get<TeamTrackerBoardResponse>(`/team-tracker?date=${date}`),
    refetchInterval: 30_000,
  });
}
