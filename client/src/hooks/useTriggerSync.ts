import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { invalidateSyncDependentQueries, SYNC_STATUS_QUERY_KEY } from '@/lib/sync-refresh';
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
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: SYNC_STATUS_QUERY_KEY });
      await invalidateSyncDependentQueries(queryClient);
    },
  });
}
