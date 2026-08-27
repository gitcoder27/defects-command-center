import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthScopeKey } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { readTodaySnapshot, writeTodaySnapshot } from '@/lib/today-snapshot-cache';
import { getLocalIsoDate } from '@/lib/utils';
import type { TodayResponse } from '@/types';

export function useToday(date = getLocalIsoDate()) {
  const authScopeKey = useAuthScopeKey();
  const storedSnapshot = useMemo(() => readTodaySnapshot(authScopeKey, date), [authScopeKey, date]);

  const query = useQuery<TodayResponse>({
    queryKey: ['today', date, authScopeKey],
    queryFn: ({ signal }) => api.get<TodayResponse>(`/today?date=${encodeURIComponent(date)}`, { signal }),
    initialData: storedSnapshot?.data,
    initialDataUpdatedAt: storedSnapshot?.savedAt,
    refetchOnMount: 'always',
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  useEffect(() => {
    if (query.data && query.dataUpdatedAt > 0) {
      writeTodaySnapshot(authScopeKey, date, query.data, query.dataUpdatedAt);
    }
  }, [authScopeKey, date, query.data, query.dataUpdatedAt]);

  return query;
}
