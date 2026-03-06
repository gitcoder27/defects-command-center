import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { FilterType, TagCountsResponse } from '@/types';

export function useTagCounts(filter?: FilterType, assignee?: string) {
  const params = new URLSearchParams();
  if (filter && filter !== 'all') params.set('filter', filter);
  if (assignee) params.set('assignee', assignee);
  const qs = params.toString();

  return useQuery<TagCountsResponse>({
    queryKey: ['tagCounts', filter, assignee],
    queryFn: async () => {
      return api.get<TagCountsResponse>(`/tags/counts${qs ? `?${qs}` : ''}`);
    },
    refetchInterval: 30_000,
  });
}
