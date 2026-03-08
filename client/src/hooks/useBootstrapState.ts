import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AuthBootstrapResponse } from '@/types';

export function useBootstrapState() {
  return useQuery<AuthBootstrapResponse>({
    queryKey: ['auth', 'bootstrap'],
    queryFn: () => api.get('/auth/bootstrap'),
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}
