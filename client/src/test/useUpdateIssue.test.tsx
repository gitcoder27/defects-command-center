import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUpdateIssue } from '@/hooks/useUpdateIssue';
import { getLocalIsoDate } from '@/lib/utils';
import type { Developer, Issue } from '@/types';

const mockPatch = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    patch: (...args: unknown[]) => mockPatch(...args),
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

describe('useUpdateIssue', () => {
  const trackerDate = getLocalIsoDate();

  beforeEach(() => {
    mockPatch.mockReset();
  });

  it('optimistically updates the assignee name in issue detail and issue lists', async () => {
    const queryClient = createQueryClient();
    const issue = buildIssue();
    const updatedIssue = buildIssue({
      assigneeId: 'bob-2',
      assigneeName: 'Bob',
      updatedAt: '2026-03-05T10:00:00Z',
    });
    const developers: Developer[] = [
      { accountId: 'alice-1', displayName: 'Alice', isActive: true },
      { accountId: 'bob-2', displayName: 'Bob', isActive: true },
    ];

    queryClient.setQueryData<Issue[]>(['issues', 'all', undefined, undefined, undefined, trackerDate], [issue]);
    queryClient.setQueryData<Issue>(['issue', issue.jiraKey, trackerDate], issue);
    queryClient.setQueryData<Developer[]>(['developers', undefined], developers);

    let resolvePatch: ((value: Issue) => void) | undefined;
    mockPatch.mockImplementation(
      () =>
        new Promise<Issue>((resolve) => {
          resolvePatch = resolve;
        })
    );

    const { result } = renderHook(() => useUpdateIssue(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.mutate({ key: issue.jiraKey, update: { assigneeId: 'bob-2' } });
    });

    await waitFor(() => {
      expect(queryClient.getQueryData<Issue>(['issue', issue.jiraKey, trackerDate])).toMatchObject({
        assigneeId: 'bob-2',
        assigneeName: 'Bob',
      });
      expect(
        queryClient.getQueryData<Issue[]>(['issues', 'all', undefined, undefined, undefined, trackerDate])?.[0]
      ).toMatchObject({
        assigneeId: 'bob-2',
        assigneeName: 'Bob',
      });
    });

    act(() => {
      resolvePatch?.(updatedIssue);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('restores the previous assignee name when the mutation fails', async () => {
    const queryClient = createQueryClient();
    const issue = buildIssue();
    const developers: Developer[] = [
      { accountId: 'alice-1', displayName: 'Alice', isActive: true },
      { accountId: 'bob-2', displayName: 'Bob', isActive: true },
    ];

    queryClient.setQueryData<Issue[]>(['issues', 'all', undefined, undefined, undefined, trackerDate], [issue]);
    queryClient.setQueryData<Issue>(['issue', issue.jiraKey, trackerDate], issue);
    queryClient.setQueryData<Developer[]>(['developers', undefined], developers);

    mockPatch.mockRejectedValue(new Error('Update failed'));

    const { result } = renderHook(() => useUpdateIssue(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync({ key: issue.jiraKey, update: { assigneeId: 'bob-2' } });
      } catch {
        // Expected in rollback coverage.
      }
    });

    await waitFor(() => {
      expect(queryClient.getQueryData<Issue>(['issue', issue.jiraKey, trackerDate])).toMatchObject({
        assigneeId: 'alice-1',
        assigneeName: 'Alice',
      });
      expect(
        queryClient.getQueryData<Issue[]>(['issues', 'all', undefined, undefined, undefined, trackerDate])?.[0]
      ).toMatchObject({
        assigneeId: 'alice-1',
        assigneeName: 'Alice',
      });
    });
  });
});
