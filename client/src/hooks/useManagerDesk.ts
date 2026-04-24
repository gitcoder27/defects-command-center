import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  ManagerDeskDayResponse,
  ManagerDeskItem,
  ManagerDeskLink,
  ManagerDeskCreateItemPayload,
  ManagerDeskUpdateItemPayload,
  ManagerDeskAddLinkPayload,
  ManagerDeskCarryForwardPayload,
  ManagerDeskCarryForwardContextResponse,
  ManagerDeskCarryForwardPreviewResponse,
  ManagerDeskIssueLookupItem,
  ManagerDeskDeveloperLookupItem,
  TrackerSharedTaskDetailResponse,
} from '@/types/manager-desk';

// ── Day query ───────────────────────────────────────────

export function useManagerDesk(date: string, enabled = true) {
  return useQuery<ManagerDeskDayResponse>({
    queryKey: ['manager-desk', date],
    queryFn: () => api.get<ManagerDeskDayResponse>(`/manager-desk?date=${date}`),
    enabled,
    refetchInterval: 30_000,
  });
}

export function useTrackerSharedTaskDetail(params: {
  trackerItemId: number | null;
  managerDeskItemId: number | null;
}) {
  const { trackerItemId, managerDeskItemId } = params;
  return useQuery<TrackerSharedTaskDetailResponse>({
    queryKey: ['manager-desk', 'task-detail', managerDeskItemId, trackerItemId],
    queryFn: () => {
      if (managerDeskItemId !== null) {
        return api.get<TrackerSharedTaskDetailResponse>(`/manager-desk/items/${managerDeskItemId}/detail`);
      }

      return api.get<TrackerSharedTaskDetailResponse>(`/manager-desk/tracker-items/${trackerItemId}/detail`);
    },
    enabled: trackerItemId !== null || managerDeskItemId !== null,
    staleTime: 0,
  });
}

// ── Promote tracker item to Manager Desk ────────────────

export function usePromoteTrackerItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (trackerItemId: number) =>
      api.post<TrackerSharedTaskDetailResponse>(
        `/manager-desk/tracker-items/${trackerItemId}/promote`
      ),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['team-tracker'] });
      qc.invalidateQueries({ queryKey: ['manager-desk'] });
      qc.invalidateQueries({ queryKey: ['manager-desk', 'task-detail'] });
      qc.invalidateQueries({ queryKey: ['workload'] });
      if (data) {
        qc.setQueriesData<TrackerSharedTaskDetailResponse>(
          { queryKey: ['manager-desk', 'task-detail'] },
          (existing) => {
            if (existing?.trackerItem?.id === data.trackerItem?.id) {
              return data;
            }
            return existing;
          }
        );
      }
    },
  });
}

// ── Create item ─────────────────────────────────────────

export function useCreateManagerDeskItem(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ManagerDeskCreateItemPayload) =>
      api.post<ManagerDeskItem>('/manager-desk/items', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['manager-desk'] });
      qc.invalidateQueries({ queryKey: ['team-tracker'] });
      qc.invalidateQueries({ queryKey: ['workload'] });
    },
  });
}

// ── Update item ─────────────────────────────────────────

export function useUpdateManagerDeskItem(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, ...body }: ManagerDeskUpdateItemPayload & { itemId: number }) =>
      api.patch<ManagerDeskItem>(`/manager-desk/items/${itemId}`, body),
    onSuccess: (item) => {
      qc.setQueriesData<TrackerSharedTaskDetailResponse>(
        { queryKey: ['manager-desk', 'task-detail'] },
        (existing) => {
          if (!existing?.managerDeskItem || existing.managerDeskItem.id !== item.id) {
            return existing;
          }

          return {
            ...existing,
            managerDeskItem: item,
            developer: item.assignee
              ? {
                  ...existing.developer,
                  accountId: item.assignee.accountId,
                  displayName: item.assignee.displayName,
                  avatarUrl: item.assignee.avatarUrl,
                  availability: item.assignee.availability,
                }
              : existing.developer,
          };
        }
      );
      qc.invalidateQueries({ queryKey: ['manager-desk'] });
      qc.invalidateQueries({ queryKey: ['manager-desk', 'task-detail'] });
      qc.invalidateQueries({ queryKey: ['team-tracker'] });
      qc.invalidateQueries({ queryKey: ['workload'] });
    },
  });
}

// ── Remove from desk (preserves linked tracker work) ────

export function useDeleteManagerDeskItem(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) =>
      api.delete<{ deleted: boolean }>(`/manager-desk/items/${itemId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['manager-desk'] });
      qc.invalidateQueries({ queryKey: ['manager-desk', 'task-detail'] });
      qc.invalidateQueries({ queryKey: ['team-tracker'] });
      qc.invalidateQueries({ queryKey: ['workload'] });
    },
  });
}

// ── Cancel delegated task (deletes tracker execution) ───

export function useCancelDelegatedManagerDeskTask(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) =>
      api.post<ManagerDeskItem>(`/manager-desk/items/${itemId}/cancel-delegated-task`),
    onSuccess: (item) => {
      qc.setQueriesData<TrackerSharedTaskDetailResponse>(
        { queryKey: ['manager-desk', 'task-detail'] },
        (existing) => {
          if (!existing?.managerDeskItem || existing.managerDeskItem.id !== item.id) {
            return existing;
          }
          return { ...existing, managerDeskItem: item, trackerItem: undefined as never };
        },
      );
      qc.invalidateQueries({ queryKey: ['manager-desk'] });
      qc.invalidateQueries({ queryKey: ['manager-desk', 'task-detail'] });
      qc.invalidateQueries({ queryKey: ['team-tracker'] });
      qc.invalidateQueries({ queryKey: ['workload'] });
    },
  });
}

// ── Add link ────────────────────────────────────────────

export function useAddManagerDeskLink(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, ...body }: ManagerDeskAddLinkPayload & { itemId: number }) =>
      api.post<ManagerDeskLink>(`/manager-desk/items/${itemId}/links`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['manager-desk'] });
      qc.invalidateQueries({ queryKey: ['manager-desk', 'task-detail'] });
      qc.invalidateQueries({ queryKey: ['team-tracker'] });
      qc.invalidateQueries({ queryKey: ['workload'] });
    },
  });
}

// ── Remove link ─────────────────────────────────────────

export function useRemoveManagerDeskLink(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, linkId }: { itemId: number; linkId: number }) =>
      api.delete<{ deleted: boolean }>(`/manager-desk/items/${itemId}/links/${linkId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['manager-desk'] });
      qc.invalidateQueries({ queryKey: ['manager-desk', 'task-detail'] });
      qc.invalidateQueries({ queryKey: ['team-tracker'] });
      qc.invalidateQueries({ queryKey: ['workload'] });
    },
  });
}

// ── Carry forward ───────────────────────────────────────

export function useManagerDeskCarryForwardPreview(
  fromDate: string,
  toDate: string,
  enabled = true,
) {
  return useQuery<ManagerDeskCarryForwardPreviewResponse>({
    queryKey: ['manager-desk', 'carry-forward-preview', fromDate, toDate],
    queryFn: () => {
      const params = new URLSearchParams({ fromDate, toDate });
      return api.get<ManagerDeskCarryForwardPreviewResponse>(
        `/manager-desk/carry-forward-preview?${params.toString()}`,
      );
    },
    enabled,
    staleTime: 30_000,
  });
}

export function useManagerDeskCarryForwardContext(toDate: string, enabled = true) {
  return useQuery<ManagerDeskCarryForwardContextResponse>({
    queryKey: ['manager-desk', 'carry-forward-context', toDate],
    queryFn: () =>
      api.get<ManagerDeskCarryForwardContextResponse>(
        `/manager-desk/carry-forward-context?toDate=${encodeURIComponent(toDate)}`
      ),
    enabled,
    staleTime: 30_000,
  });
}

export function useCarryForwardManagerDesk(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ManagerDeskCarryForwardPayload) =>
      api.post<{ created: number }>('/manager-desk/carry-forward', payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['manager-desk', date] });
      qc.invalidateQueries({ queryKey: ['manager-desk', variables.toDate] });
      qc.invalidateQueries({ queryKey: ['manager-desk', 'carry-forward-context', date] });
      qc.invalidateQueries({ queryKey: ['manager-desk', 'carry-forward-context', variables.toDate] });
      qc.invalidateQueries({ queryKey: ['team-tracker'] });
      qc.invalidateQueries({ queryKey: ['workload'] });
    },
  });
}

// ── Lookups ─────────────────────────────────────────────

export function useManagerDeskIssueLookup(query: string, enabled = true) {
  return useQuery<ManagerDeskIssueLookupItem[]>({
    queryKey: ['manager-desk', 'lookup-issues', query],
    queryFn: async () => {
      const res = await api.get<{ items: ManagerDeskIssueLookupItem[] }>(
        `/manager-desk/lookups/issues?q=${encodeURIComponent(query)}`
      );
      return res.items;
    },
    enabled: enabled && query.length >= 2,
    staleTime: 15_000,
  });
}

export function useManagerDeskDeveloperLookup(query: string, date?: string, enabled = true) {
  return useQuery<ManagerDeskDeveloperLookupItem[]>({
    queryKey: ['manager-desk', 'lookup-developers', query, date],
    queryFn: async () => {
      const params = new URLSearchParams({ q: query });
      if (date) {
        params.set('date', date);
      }
      const res = await api.get<{ items: ManagerDeskDeveloperLookupItem[] }>(
        `/manager-desk/lookups/developers?${params.toString()}`
      );
      return res.items;
    },
    enabled: enabled && (query.length === 0 || query.length >= 2),
    staleTime: 15_000,
  });
}
