import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthScopeKey } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { WorkSavedView, WorkSavedViewInput, WorkSavedViewUpdate, WorkSavedViewsResponse } from '@/types';

export function useWorkSavedViews() {
  const authScopeKey = useAuthScopeKey();

  return useQuery<WorkSavedView[]>({
    queryKey: ['work', 'views', authScopeKey],
    queryFn: async () => {
      const res = await api.get<WorkSavedViewsResponse>('/work/views');
      return res.views;
    },
    staleTime: 60_000,
  });
}

export function useCreateWorkView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: WorkSavedViewInput) => api.post<WorkSavedView>('/work/views', params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work', 'views'] });
    },
  });
}

export function useUpdateWorkView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { viewId: number } & WorkSavedViewUpdate) => {
      const { viewId, ...body } = params;
      return api.patch<WorkSavedView>(`/work/views/${viewId}`, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work', 'views'] });
    },
  });
}

export function useDeleteWorkView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (viewId: number) => api.delete<{ deleted: true }>(`/work/views/${viewId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work', 'views'] });
    },
  });
}
