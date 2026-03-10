import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCreateTag, useSetIssueTags } from '@/hooks/useTags';
import type { ReactNode } from 'react';
import type { Issue, LocalTag } from '@/types';

const mockPost = vi.fn();
const mockPut = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
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

function buildIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    jiraKey: 'PROJ-101',
    summary: 'Login page crashes on submit',
    aspenSeverity: '1 - Critical',
    priorityName: 'Highest',
    priorityId: '1',
    statusName: 'To Do',
    statusCategory: 'new',
    assigneeName: 'Alice',
    assigneeId: 'alice-1',
    labels: [],
    flagged: false,
    createdAt: '2026-03-04T09:00:00Z',
    updatedAt: '2026-03-05T09:00:00Z',
    localTags: [],
    ...overrides,
  };
}

describe('tag mutations', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockPut.mockReset();
  });

  it('adds a created tag to the tags cache immediately on success', async () => {
    const createdTag: LocalTag = { id: 2, name: 'Ops', color: '#10b981' };
    const queryClient = createQueryClient();
    queryClient.setQueryData<LocalTag[]>(['tags'], [{ id: 1, name: 'Backend', color: '#6366f1' }]);
    mockPost.mockResolvedValue(createdTag);

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCreateTag(), { wrapper });

    act(() => {
      result.current.mutate({ name: 'Ops', color: '#10b981' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(queryClient.getQueryData<LocalTag[]>(['tags'])).toEqual([
      { id: 1, name: 'Backend', color: '#6366f1' },
      createdTag,
    ]);
  });

  it('optimistically updates cached issue tags and removes the issue from no-tag filtered lists', async () => {
    const backendTag: LocalTag = { id: 1, name: 'Backend', color: '#6366f1' };
    const issue = buildIssue();
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    queryClient.setQueryData<LocalTag[]>(['tags'], [backendTag]);
    queryClient.setQueryData<Issue[]>(['issues', 'all', undefined, undefined, undefined], [issue]);
    queryClient.setQueryData<Issue[]>(['issues', 'all', undefined, undefined, true], [issue]);
    queryClient.setQueryData<Issue>(['issue', issue.jiraKey], issue);

    let resolvePut: ((value: { tags: LocalTag[] }) => void) | undefined;
    mockPut.mockImplementation(
      () =>
        new Promise<{ tags: LocalTag[] }>((resolve) => {
          resolvePut = resolve;
        })
    );

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useSetIssueTags(), { wrapper });

    act(() => {
      result.current.mutate({ key: issue.jiraKey, tagIds: [backendTag.id] });
    });

    await waitFor(() => {
      expect(queryClient.getQueryData<Issue>(['issue', issue.jiraKey])?.localTags).toEqual([backendTag]);
      expect(
        queryClient.getQueryData<Issue[]>(['issues', 'all', undefined, undefined, undefined])?.[0]?.localTags
      ).toEqual([backendTag]);
      expect(queryClient.getQueryData<Issue[]>(['issues', 'all', undefined, undefined, true])).toEqual([]);
    });

    act(() => {
      resolvePut?.({ tags: [backendTag] });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['tagCounts'] });
  });
});
