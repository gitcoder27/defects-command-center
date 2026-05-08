import { useQuery } from '@tanstack/react-query';
import { useAuthScopeKey } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { DashboardConfig } from '@/types';

interface UseConfigOptions {
  enabled?: boolean;
}

export function useConfig(options?: UseConfigOptions) {
  const authScopeKey = useAuthScopeKey();

  return useQuery<DashboardConfig>({
    queryKey: ['config', authScopeKey],
    queryFn: () => api.get('/config'),
    enabled: options?.enabled ?? true,
  });
}
