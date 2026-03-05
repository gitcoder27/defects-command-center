import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DashboardConfig } from '@/types';

export function useConfig() {
  return useQuery<DashboardConfig>({
    queryKey: ['config'],
    queryFn: () => api.get('/config'),
  });
}
