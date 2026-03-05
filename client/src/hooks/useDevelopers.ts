import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Developer } from '@/types';

interface DevelopersResponse {
  developers: Developer[];
}

export function useDevelopers() {
  return useQuery<Developer[]>({
    queryKey: ['developers'],
    queryFn: async () => {
      const res = await api.get<DevelopersResponse>('/team/developers');
      return res.developers;
    },
    staleTime: Infinity,
  });
}
