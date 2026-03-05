import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Issue, FilterType } from '@/types';

interface IssuesResponse {
  issues: Issue[];
}

export function useIssues(filter?: FilterType, assignee?: string) {
  const params = new URLSearchParams();
  if (filter && filter !== 'all') params.set('filter', filter);
  if (assignee) params.set('assignee', assignee);
  const qs = params.toString();

  return useQuery<Issue[]>({
    queryKey: ['issues', filter, assignee],
    queryFn: async () => {
      const res = await api.get<IssuesResponse>(`/issues${qs ? `?${qs}` : ''}`);
      return res.issues;
    },
    refetchInterval: 30_000,
  });
}
