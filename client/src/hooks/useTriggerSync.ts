import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SyncStatus } from '@/types';

export function useTriggerSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post<SyncStatus>('/sync'),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['syncStatus'] });
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
      queryClient.invalidateQueries({ queryKey: ['workload'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}
