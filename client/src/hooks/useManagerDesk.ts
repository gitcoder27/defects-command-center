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
  ManagerDeskIssueLookupItem,
  ManagerDeskDeveloperLookupItem,
} from '@/types/manager-desk';

// ── Day query ───────────────────────────────────────────

export function useManagerDesk(date: string) {
  return useQuery<ManagerDeskDayResponse>({
    queryKey: ['manager-desk', date],
    queryFn: () => api.get<ManagerDeskDayResponse>(`/manager-desk?date=${date}`),
    refetchInterval: 30_000,
  });
}

// ── Create item ─────────────────────────────────────────

export function useCreateManagerDeskItem(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ManagerDeskCreateItemPayload) =>
      api.post<ManagerDeskItem>('/manager-desk/items', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['manager-desk', date] });
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['manager-desk', date] });
      qc.invalidateQueries({ queryKey: ['team-tracker'] });
      qc.invalidateQueries({ queryKey: ['workload'] });
    },
  });
}

// ── Delete item ─────────────────────────────────────────

export function useDeleteManagerDeskItem(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) =>
      api.delete<{ deleted: boolean }>(`/manager-desk/items/${itemId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['manager-desk', date] });
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
      qc.invalidateQueries({ queryKey: ['manager-desk', date] });
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
      qc.invalidateQueries({ queryKey: ['manager-desk', date] });
      qc.invalidateQueries({ queryKey: ['team-tracker'] });
      qc.invalidateQueries({ queryKey: ['workload'] });
    },
  });
}

// ── Carry forward ───────────────────────────────────────

export function useCarryForwardManagerDesk(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ManagerDeskCarryForwardPayload) =>
      api.post<{ created: number }>('/manager-desk/carry-forward', payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['manager-desk', date] });
      qc.invalidateQueries({ queryKey: ['manager-desk', variables.toDate] });
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

export function useManagerDeskDeveloperLookup(query: string, enabled = true) {
  return useQuery<ManagerDeskDeveloperLookupItem[]>({
    queryKey: ['manager-desk', 'lookup-developers', query],
    queryFn: async () => {
      const res = await api.get<{ items: ManagerDeskDeveloperLookupItem[] }>(
        `/manager-desk/lookups/developers?q=${encodeURIComponent(query)}`
      );
      return res.items;
    },
    enabled: enabled && query.length >= 2,
    staleTime: 15_000,
  });
}
