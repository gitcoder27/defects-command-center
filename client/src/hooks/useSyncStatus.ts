import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SyncStatus } from '@/types';

export function useSyncStatus() {
  return useQuery<SyncStatus>({
    queryKey: ['syncStatus'],
    queryFn: () => api.get('/sync/status'),
    refetchInterval: 10_000,
  });
}
