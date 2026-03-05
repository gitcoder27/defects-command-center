import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DeveloperWorkload } from '@/types';

interface WorkloadResponse {
  developers: DeveloperWorkload[];
}

export function useWorkload() {
  return useQuery<DeveloperWorkload[]>({
    queryKey: ['workload'],
    queryFn: async () => {
      const res = await api.get<WorkloadResponse>('/team/workload');
      return res.developers;
    },
    refetchInterval: 30_000,
  });
}
