import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Developer } from '@/types';

interface DevelopersResponse {
  developers: Developer[];
}

function isLegacyPlaceholder(dev: Developer): boolean {
  const accountId = dev.accountId.trim().toLowerCase();
  const name = dev.displayName.trim().toLowerCase();
  return accountId === 'dev-1' || accountId === 'lead-1' || name === 'dev' || name === 'lead';
}

export function useDevelopers() {
  return useQuery<Developer[]>({
    queryKey: ['developers'],
    queryFn: async () => {
      const res = await api.get<DevelopersResponse>('/team/developers');
      return res.developers;
    },
    select: (developers) => developers.filter((dev) => !isLegacyPlaceholder(dev)),
    staleTime: 0,
    refetchOnMount: true,
  });
}
