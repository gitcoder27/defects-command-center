import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { OverviewCounts } from '@/types';

export function useOverview() {
  return useQuery<OverviewCounts>({
    queryKey: ['overview'],
    queryFn: () => api.get('/overview'),
    refetchInterval: 30_000,
  });
}
