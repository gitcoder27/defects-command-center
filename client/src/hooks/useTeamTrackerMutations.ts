import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  TrackerWorkItem,
  TrackerCheckIn,
  TrackerDeveloperStatus,
  TrackerItemType,
  TrackerItemState,
} from '@/types';

export function useUpdateDay(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      accountId: string;
      status?: TrackerDeveloperStatus;
      managerNotes?: string;
    }) =>
      api.patch(`/team-tracker/${params.accountId}/day`, {
        date,
        status: params.status,
        managerNotes: params.managerNotes,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-tracker', date] }),
  });
}

export function useAddTrackerItem(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      accountId: string;
      itemType: TrackerItemType;
      jiraKey?: string;
      title: string;
      note?: string;
    }) =>
      api.post<TrackerWorkItem>(`/team-tracker/${params.accountId}/items`, {
        date,
        itemType: params.itemType,
        jiraKey: params.jiraKey,
        title: params.title,
        note: params.note,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-tracker', date] }),
  });
}

export function useUpdateTrackerItem(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      itemId: number;
      title?: string;
      state?: TrackerItemState;
      note?: string;
      position?: number;
    }) => {
      const { itemId, ...body } = params;
      return api.patch<TrackerWorkItem>(`/team-tracker/items/${itemId}`, body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-tracker', date] }),
  });
}

export function useDeleteTrackerItem(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) =>
      api.delete(`/team-tracker/items/${itemId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-tracker', date] }),
  });
}

export function useSetCurrentItem(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) =>
      api.post<TrackerWorkItem>(`/team-tracker/items/${itemId}/set-current`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-tracker', date] }),
  });
}

export function useAddCheckIn(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      accountId: string;
      summary: string;
      status?: TrackerDeveloperStatus;
    }) =>
      api.post<TrackerCheckIn>(`/team-tracker/${params.accountId}/checkins`, {
        date,
        summary: params.summary,
        status: params.status,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-tracker', date] }),
  });
}

export function useCarryForward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { fromDate: string; toDate: string }) =>
      api.post<{ carried: number }>('/team-tracker/carry-forward', params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-tracker'] }),
  });
}
