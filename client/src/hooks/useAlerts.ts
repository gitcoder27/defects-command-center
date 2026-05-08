import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthScopeKey } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { Alert, AlertDismissRequest, AlertDismissResponse } from '@/types';

interface AlertsResponse {
  alerts: Alert[];
}

interface UseAlertsOptions {
  enabled?: boolean;
}

export function useAlerts(options?: UseAlertsOptions) {
  const authScopeKey = useAuthScopeKey();

  return useQuery<Alert[]>({
    queryKey: ['alerts', authScopeKey],
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
  const authScopeKey = useAuthScopeKey();
  const queryKey = ['alerts', authScopeKey] as const;

  return useMutation({
    mutationFn: (payload: AlertDismissRequest) =>
      api.post<AlertDismissResponse>('/alerts/dismiss', payload),
    onMutate: async ({ alertIds }) => {
      await queryClient.cancelQueries({ queryKey: ['alerts'] });
      const previousAlerts = queryClient.getQueryData<Alert[]>(queryKey);
      const dismissedIds = new Set(alertIds);

      queryClient.setQueryData<Alert[]>(queryKey, (currentAlerts = []) =>
        currentAlerts.filter((alert) => !dismissedIds.has(alert.id))
      );

      return { previousAlerts };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousAlerts !== undefined) {
        queryClient.setQueryData(queryKey, context.previousAlerts);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}
