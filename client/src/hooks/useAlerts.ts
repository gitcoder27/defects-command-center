import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Alert, AlertDismissRequest, AlertDismissResponse } from '@/types';

interface AlertsResponse {
  alerts: Alert[];
}

interface UseAlertsOptions {
  enabled?: boolean;
}

export function useAlerts(options?: UseAlertsOptions) {
  return useQuery<Alert[]>({
    queryKey: ['alerts'],
    queryFn: async () => {
      const res = await api.get<AlertsResponse>('/alerts');
      return res.alerts;
    },
    enabled: options?.enabled ?? true,
    refetchInterval: 30_000,
  });
}

export function useDismissAlerts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AlertDismissRequest) =>
      api.post<AlertDismissResponse>('/alerts/dismiss', payload),
    onMutate: async ({ alertIds }) => {
      await queryClient.cancelQueries({ queryKey: ['alerts'] });
      const previousAlerts = queryClient.getQueryData<Alert[]>(['alerts']);
      const dismissedIds = new Set(alertIds);

      queryClient.setQueryData<Alert[]>(['alerts'], (currentAlerts = []) =>
        currentAlerts.filter((alert) => !dismissedIds.has(alert.id))
      );

      return { previousAlerts };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousAlerts !== undefined) {
        queryClient.setQueryData(['alerts'], context.previousAlerts);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}
