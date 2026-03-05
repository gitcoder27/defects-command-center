import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Issue } from '@/types';

export function useIssueDetail(key?: string) {
  return useQuery<Issue>({
    queryKey: ['issue', key],
    queryFn: () => api.get(`/issues/${key}`),
    enabled: !!key,
    refetchOnWindowFocus: true,
  });
}
