import { useQuery } from '@tanstack/react-query';
import { useAuthScopeKey } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { OverviewCounts } from '@/types';

export function useOverview(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;
  const authScopeKey = useAuthScopeKey();

  return useQuery<OverviewCounts>({
    queryKey: ['overview', authScopeKey],
    queryFn: () => api.get('/overview'),
    refetchInterval: enabled ? 30_000 : false,
    enabled,
  });
}
