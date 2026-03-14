import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateSyncDependentQueries } from '@/lib/sync-refresh';
import { useSyncStatus } from '@/hooks/useSyncStatus';

interface UseSyncRefreshCoordinatorOptions {
  enabled?: boolean;
}

export function useSyncRefreshCoordinator(options?: UseSyncRefreshCoordinatorOptions) {
  const enabled = options?.enabled ?? true;
  const queryClient = useQueryClient();
  const { data: sync, refetch } = useSyncStatus({ enabled });
  const hasInitializedRef = useRef(false);
  const lastProcessedSyncRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!enabled) {
      hasInitializedRef.current = false;
      lastProcessedSyncRef.current = undefined;
      return;
    }

    if (!sync) {
      return;
    }

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      lastProcessedSyncRef.current = sync.lastSyncedAt;
      return;
    }

    if (!sync.lastSyncedAt || sync.lastSyncedAt === lastProcessedSyncRef.current) {
      return;
    }

    lastProcessedSyncRef.current = sync.lastSyncedAt;
    void invalidateSyncDependentQueries(queryClient);
  }, [enabled, queryClient, sync]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const refreshSyncStatus = () => {
      void refetch();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshSyncStatus();
      }
    };

    window.addEventListener('focus', refreshSyncStatus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', refreshSyncStatus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, refetch]);
}
