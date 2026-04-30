import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAddComment } from '@/hooks/useAddComment';

const mockPost = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useAddComment', () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it('sends the request shape expected by the issue comments route', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity },
        mutations: { retry: false },
      },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    mockPost.mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useAddComment(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.mutate({ key: 'PROJ-101', body: 'Please check the latest repro.' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockPost).toHaveBeenCalledWith('/issues/PROJ-101/comments', {
      text: 'Please check the latest repro.',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['issue', 'PROJ-101'] });
  });
});
