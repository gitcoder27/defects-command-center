import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Alert } from '@/types';

interface AlertsResponse {
  alerts: Alert[];
}

export function useAlerts() {
  return useQuery<Alert[]>({
    queryKey: ['alerts'],
    queryFn: async () => {
      const res = await api.get<AlertsResponse>('/alerts');
      return res.alerts;
    },
    refetchInterval: 30_000,
  });
}
