import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DeveloperWorkload } from '@/types';

interface WorkloadResponse {
  developers: DeveloperWorkload[];
}

export function useWorkload(date?: string) {
  return useQuery<DeveloperWorkload[]>({
    queryKey: ['workload', date],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (date) {
        params.set('date', date);
      }
      const res = await api.get<WorkloadResponse>(`/team/workload${params.toString() ? `?${params.toString()}` : ''}`);
      return res.developers;
    },
    refetchInterval: 30_000,
  });
}
