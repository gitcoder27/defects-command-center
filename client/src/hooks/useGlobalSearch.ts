import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthScopeKey } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { GlobalSearchResponse } from '@/types';

export const GLOBAL_SEARCH_MIN_LENGTH = 2;

export function useGlobalSearch(query: string, options?: { enabled?: boolean }) {
  const authScopeKey = useAuthScopeKey();
  const trimmed = query.trim();
  const enabled = (options?.enabled ?? true) && trimmed.length >= GLOBAL_SEARCH_MIN_LENGTH;

  const [debouncedQuery, setDebouncedQuery] = useState(trimmed);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(trimmed), 150);
    return () => window.clearTimeout(timer);
  }, [trimmed]);

  return useQuery({
    queryKey: ['global-search', authScopeKey, debouncedQuery],
    queryFn: async () => {
      const res = await api.get<GlobalSearchResponse>(`/search?q=${encodeURIComponent(debouncedQuery)}`);
      return res;
    },
    enabled,
    staleTime: 30_000,
  });
}
