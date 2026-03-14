import type { QueryClient, QueryKey } from '@tanstack/react-query';

export const SYNC_STATUS_QUERY_KEY = ['syncStatus'] as const;

export const SYNC_DEPENDENT_QUERY_KEYS: QueryKey[] = [
  ['issues'],
  ['issue'],
  ['overview'],
  ['workload'],
  ['alerts'],
  ['tagCounts'],
  ['team-tracker'],
  ['manager-desk'],
  ['my-day'],
  ['my-day-issues'],
];

export async function invalidateSyncDependentQueries(queryClient: QueryClient) {
  await Promise.all(
    SYNC_DEPENDENT_QUERY_KEYS.map((queryKey) =>
      queryClient.invalidateQueries({ queryKey })
    )
  );
}
