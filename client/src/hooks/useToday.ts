import { useQuery } from '@tanstack/react-query';
import { useAuthScopeKey } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { getLocalIsoDate } from '@/lib/utils';
import type { TodayResponse } from '@/types';

export function useToday(date = getLocalIsoDate()) {
  const authScopeKey = useAuthScopeKey();

  return useQuery<TodayResponse>({
    queryKey: ['today', date, authScopeKey],
    queryFn: ({ signal }) => api.get<TodayResponse>(`/today?date=${encodeURIComponent(date)}`, { signal }),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}
