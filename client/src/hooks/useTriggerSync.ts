import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SyncStatus } from '@/types';

export function useTriggerSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const result = await api.post<SyncStatus>('/sync');
      if (result.status === 'error') {
        throw new Error(result.errorMessage || 'Sync failed');
      }
      return result;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['syncStatus'] });
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
      queryClient.invalidateQueries({ queryKey: ['workload'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}
