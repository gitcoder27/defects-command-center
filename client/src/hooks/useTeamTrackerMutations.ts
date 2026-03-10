import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  TrackerWorkItem,
  TrackerCheckIn,
  TrackerDeveloperStatus,
  TrackerItemState,
} from '@/types';

function invalidateIssueAssignments(queryClient: ReturnType<typeof useQueryClient>, date: string) {
  return queryClient.invalidateQueries({
    queryKey: ['team-tracker', 'issue-assignment', date],
  });
}

export function useUpdateDay(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      accountId: string;
      status?: TrackerDeveloperStatus;
      capacityUnits?: number | null;
      managerNotes?: string;
    }) =>
      api.patch(`/team-tracker/${params.accountId}/day`, {
        date,
        status: params.status,
        capacityUnits: params.capacityUnits,
        managerNotes: params.managerNotes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-tracker', date] });
      qc.invalidateQueries({ queryKey: ['workload'] });
    },
  });
}

export function useAddTrackerItem(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      accountId: string;
      jiraKey?: string;
      title: string;
      note?: string;
    }) =>
      api.post<TrackerWorkItem>(`/team-tracker/${params.accountId}/items`, {
        date,
        jiraKey: params.jiraKey,
        title: params.title,
        note: params.note,
      }),
    onSuccess: (_data, params) => {
      qc.invalidateQueries({ queryKey: ['team-tracker', date] });
      qc.invalidateQueries({ queryKey: ['workload'] });
      invalidateIssueAssignments(qc, date);
      if (params.jiraKey) {
        qc.invalidateQueries({
          queryKey: ['team-tracker', 'issue-assignment', date, params.jiraKey],
        });
      }
    },
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-tracker', date] });
      qc.invalidateQueries({ queryKey: ['workload'] });
      invalidateIssueAssignments(qc, date);
    },
  });
}

export function useDeleteTrackerItem(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) =>
      api.delete(`/team-tracker/items/${itemId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-tracker', date] });
      qc.invalidateQueries({ queryKey: ['workload'] });
      invalidateIssueAssignments(qc, date);
    },
  });
}

export function useSetCurrentItem(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) =>
      api.post<TrackerWorkItem>(`/team-tracker/items/${itemId}/set-current`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-tracker', date] });
      qc.invalidateQueries({ queryKey: ['workload'] });
      invalidateIssueAssignments(qc, date);
    },
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-tracker', date] });
      qc.invalidateQueries({ queryKey: ['workload'] });
    },
  });
}

export function useCarryForward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { fromDate: string; toDate: string }) =>
      api.post<{ carried: number }>('/team-tracker/carry-forward', params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-tracker'] });
      qc.invalidateQueries({ queryKey: ['workload'] });
    },
  });
}
