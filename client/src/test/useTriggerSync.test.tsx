import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTriggerSync } from '@/hooks/useTriggerSync';
import {
  SYNC_DEPENDENT_QUERY_KEYS,
  SYNC_STATUS_QUERY_KEY,
} from '@/lib/sync-refresh';

const mockPost = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useTriggerSync', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockPost.mockResolvedValue({
      status: 'success',
      issuesSynced: 7,
      startedAt: '2026-03-14T10:00:00.000Z',
      completedAt: '2026-03-14T10:00:02.000Z',
    });
  });

  it('invalidates sync status and all sync-dependent query families after a manual sync completes', async () => {
    const queryClient = createQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useTriggerSync(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/sync');
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) =>
      JSON.stringify(call[0]?.queryKey)
    );
    const expectedKeys = [
      JSON.stringify(SYNC_STATUS_QUERY_KEY),
      ...SYNC_DEPENDENT_QUERY_KEYS.map((queryKey) => JSON.stringify(queryKey)),
    ];

    expect(invalidatedKeys).toHaveLength(expectedKeys.length);
    expect(invalidatedKeys).toEqual(expect.arrayContaining(expectedKeys));
  });
});
