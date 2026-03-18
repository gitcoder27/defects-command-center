import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  TeamTrackerSavedView,
  TrackerBoardSummaryFilter,
  TeamTrackerBoardSort,
  TeamTrackerBoardGroupBy,
} from '@/types';

interface SavedViewsResponse {
  views: TeamTrackerSavedView[];
}

export function useTeamTrackerViews() {
  return useQuery<TeamTrackerSavedView[]>({
    queryKey: ['team-tracker', 'views'],
    queryFn: async () => {
      const res = await api.get<SavedViewsResponse>('/team-tracker/views');
      return res.views;
    },
    staleTime: 60_000,
  });
}

export function useCreateTeamTrackerView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      name: string;
      q?: string;
      summaryFilter?: TrackerBoardSummaryFilter;
      sortBy?: TeamTrackerBoardSort;
      groupBy?: TeamTrackerBoardGroupBy;
    }) => api.post<TeamTrackerSavedView>('/team-tracker/views', params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-tracker', 'views'] });
    },
  });
}

export function useUpdateTeamTrackerView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      viewId: number;
      name?: string;
      q?: string;
      summaryFilter?: TrackerBoardSummaryFilter;
      sortBy?: TeamTrackerBoardSort;
      groupBy?: TeamTrackerBoardGroupBy;
    }) => {
      const { viewId, ...body } = params;
      return api.patch<TeamTrackerSavedView>(`/team-tracker/views/${viewId}`, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-tracker', 'views'] });
    },
  });
}

export function useDeleteTeamTrackerView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (viewId: number) =>
      api.delete<{ deleted: true }>(`/team-tracker/views/${viewId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-tracker', 'views'] });
    },
  });
}
