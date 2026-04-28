import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { OverviewCounts } from '@/types';

export function useOverview(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;

  return useQuery<OverviewCounts>({
    queryKey: ['overview'],
    queryFn: () => api.get('/overview'),
    refetchInterval: enabled ? 30_000 : false,
    enabled,
  });
}
