import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Issue } from '@/types';

export function useIssueDetail(key?: string) {
  return useQuery<Issue>({
    queryKey: ['issue', key],
    queryFn: () => api.get(`/issues/${key}`),
    enabled: !!key,
    // The dashboard already refreshes issue lists on an interval; avoid an extra
    // focus refetch when the user returns from Jira, which can make the panel feel janky.
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });
}
