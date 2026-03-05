import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Alert } from '@/types';

export function useAlerts() {
  return useQuery<Alert[]>({
    queryKey: ['alerts'],
    queryFn: () => api.get('/alerts'),
    refetchInterval: 30_000,
  });
}
