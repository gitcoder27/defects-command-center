import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getLocalIsoDate } from '@/lib/utils';
import type { TodayResponse } from '@/types';

export function useToday(date = getLocalIsoDate()) {
  return useQuery<TodayResponse>({
    queryKey: ['today', date],
    queryFn: ({ signal }) => api.get<TodayResponse>(`/today?date=${encodeURIComponent(date)}`, { signal }),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}
