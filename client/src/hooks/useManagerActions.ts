import { useQuery } from '@tanstack/react-query';
import { useAuthScopeKey } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { getLocalIsoDate } from '@/lib/utils';
import type { ManagerActionResponse, ManagerActionSurface } from '@/types';

interface UseManagerActionsOptions {
  date?: string;
  surface?: ManagerActionSurface;
  limit?: number;
  enabled?: boolean;
}

export function useManagerActions({
  date = getLocalIsoDate(),
  surface = 'header',
  limit = 8,
  enabled = true,
}: UseManagerActionsOptions = {}) {
  const authScopeKey = useAuthScopeKey();
  const query = new URLSearchParams({
    date,
    surface,
    limit: String(limit),
  });

  return useQuery<ManagerActionResponse>({
    queryKey: ['manager-actions', date, surface, limit, authScopeKey],
    queryFn: ({ signal }) => api.get<ManagerActionResponse>(`/manager-actions?${query.toString()}`, { signal }),
    enabled,
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}
