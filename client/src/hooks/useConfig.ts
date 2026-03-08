import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DashboardConfig } from '@/types';

interface UseConfigOptions {
  enabled?: boolean;
}

export function useConfig(options?: UseConfigOptions) {
  return useQuery<DashboardConfig>({
    queryKey: ['config'],
    queryFn: () => api.get('/config'),
    enabled: options?.enabled ?? true,
  });
}
