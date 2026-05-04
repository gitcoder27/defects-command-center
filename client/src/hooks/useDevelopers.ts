import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Developer } from '@/types';

interface DevelopersResponse {
  developers: Developer[];
}

interface UseDevelopersOptions {
  includeUnavailable?: boolean;
}

function isLegacyPlaceholder(dev: Developer): boolean {
  const accountId = dev.accountId.trim().toLowerCase();
  const name = dev.displayName.trim().toLowerCase();
  return accountId === 'dev-1' || accountId === 'lead-1' || name === 'dev' || name === 'lead';
}

export function useDevelopers(date?: string, options: UseDevelopersOptions = {}) {
  return useQuery<Developer[]>({
    queryKey: ['developers', date],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (date) {
        params.set('date', date);
      }
      const res = await api.get<DevelopersResponse>(`/team/developers${params.toString() ? `?${params.toString()}` : ''}`);
      return res.developers;
    },
    select: (developers) => developers
      .filter((dev) => !isLegacyPlaceholder(dev))
      .filter((dev) => options.includeUnavailable || dev.availability?.state !== 'inactive'),
    staleTime: 0,
    refetchOnMount: true,
  });
}
