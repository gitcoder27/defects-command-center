import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SyncStatus } from '@/types';

interface UseSyncStatusOptions {
  enabled?: boolean;
}

export function useSyncStatus(options?: UseSyncStatusOptions) {
  const enabled = options?.enabled ?? true;

  return useQuery<SyncStatus>({
    queryKey: ['syncStatus'],
    queryFn: () => api.get('/sync/status'),
    refetchInterval: enabled ? 10_000 : false,
    enabled,
  });
}
