import { useQuery } from '@tanstack/react-query';
import { useAuthScopeKey } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { Issue } from '@/types';
import { getLocalIsoDate } from '@/lib/utils';

export function useIssueDetail(key?: string) {
  const trackerDate = getLocalIsoDate();
  const authScopeKey = useAuthScopeKey();

  return useQuery<Issue>({
    queryKey: ['issue', key, trackerDate, authScopeKey],
    queryFn: () => api.get(`/issues/${key}?trackerDate=${encodeURIComponent(trackerDate)}`),
    enabled: !!key,
    // The dashboard already refreshes issue lists on an interval; avoid an extra
    // focus refetch when the user returns from Jira, which can make the panel feel janky.
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });
}
