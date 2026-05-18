import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useAddManagerDeskLink,
  useCancelDelegatedManagerDeskTask,
  useCarryForwardManagerDesk,
  useCreateManagerDeskItem,
  useDeleteManagerDeskItem,
  useManagerDesk,
  useManagerDeskCarryForwardContext,
  useManagerDeskCarryForwardPreview,
  useManagerDeskDeveloperLookup,
  useManagerDeskIssueLookup,
  usePromoteTrackerItem,
  useRemoveManagerDeskLink,
  useTrackerSharedTaskDetail,
  useUpdateManagerDeskItem,
} from '@/hooks/useManagerDesk';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
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

function createWrapper(queryClient = createQueryClient()) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const deskItem = {
  id: 42,
  dayId: 1,
  originDate: '2026-03-09',
  title: 'Follow up with QA',
  kind: 'action',
  status: 'planned',
  priority: 'medium',
  createdAt: '2026-03-09T08:00:00.000Z',
  updatedAt: '2026-03-09T08:00:00.000Z',
  links: [],
};

describe('useManagerDesk hooks', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockPatch.mockReset();
    mockDelete.mockReset();
  });

  it('loads the day, carry-forward data, and task details from their expected endpoints', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === '/manager-desk?date=2026-03-09') return Promise.resolve({ date: '2026-03-09', items: [] });
      if (url === '/manager-desk/items/42/detail') return Promise.resolve({ managerDeskItem: deskItem });
      if (url === '/manager-desk/tracker-items/55/detail') return Promise.resolve({ trackerItem: { id: 55 } });
      if (url === '/manager-desk/carry-forward-preview?fromDate=2026-03-08&toDate=2026-03-09') {
        return Promise.resolve({ items: [] });
      }
      if (url === '/manager-desk/carry-forward-context?toDate=2026-03-09') {
        return Promise.resolve({ fromDate: '2026-03-08' });
      }
      return Promise.reject(new Error(`Unexpected URL ${url}`));
    });

    const wrapper = createWrapper();
    const day = renderHook(() => useManagerDesk('2026-03-09'), { wrapper });
    const deskDetail = renderHook(() => useTrackerSharedTaskDetail({ managerDeskItemId: 42, trackerItemId: null }), {
      wrapper,
    });
    const trackerDetail = renderHook(() => useTrackerSharedTaskDetail({ managerDeskItemId: null, trackerItemId: 55 }), {
      wrapper,
    });
    const preview = renderHook(() => useManagerDeskCarryForwardPreview('2026-03-08', '2026-03-09'), { wrapper });
    const context = renderHook(() => useManagerDeskCarryForwardContext('2026-03-09'), { wrapper });

    await waitFor(() => {
      expect(day.result.current.isSuccess).toBe(true);
      expect(deskDetail.result.current.isSuccess).toBe(true);
      expect(trackerDetail.result.current.isSuccess).toBe(true);
      expect(preview.result.current.isSuccess).toBe(true);
      expect(context.result.current.isSuccess).toBe(true);
    });

    expect(day.result.current.data).toEqual({ date: '2026-03-09', items: [] });
    expect(deskDetail.result.current.data).toEqual({ managerDeskItem: deskItem });
    expect(trackerDetail.result.current.data).toEqual({ trackerItem: { id: 55 } });
  });

  it('keeps disabled day, detail, preview, and context queries idle', () => {
    const wrapper = createWrapper();
    const day = renderHook(() => useManagerDesk('2026-03-09', false), { wrapper });
    const detail = renderHook(() => useTrackerSharedTaskDetail({ managerDeskItemId: null, trackerItemId: null }), {
      wrapper,
    });
    const preview = renderHook(() => useManagerDeskCarryForwardPreview('2026-03-08', '2026-03-09', false), {
      wrapper,
    });
    const context = renderHook(() => useManagerDeskCarryForwardContext('2026-03-09', false), { wrapper });

    expect(day.result.current.fetchStatus).toBe('idle');
    expect(detail.result.current.fetchStatus).toBe('idle');
    expect(preview.result.current.fetchStatus).toBe('idle');
    expect(context.result.current.fetchStatus).toBe('idle');
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('gates issue lookup by query length and loads developer lookup with date filters', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === '/manager-desk/lookups/issues?q=AM%201') {
        return Promise.resolve({ items: [{ jiraKey: 'AM-1', summary: 'Regression' }] });
      }
      if (url === '/manager-desk/lookups/developers?q=&date=2026-03-09') {
        return Promise.resolve({ items: [{ accountId: 'alice-1', displayName: 'Alice' }] });
      }
      return Promise.reject(new Error(`Unexpected URL ${url}`));
    });

    const shortIssueLookup = renderHook(() => useManagerDeskIssueLookup('A'), {
      wrapper: createWrapper(),
    });
    expect(shortIssueLookup.result.current.fetchStatus).toBe('idle');

    const wrapper = createWrapper();
    const issueLookup = renderHook(() => useManagerDeskIssueLookup('AM 1'), { wrapper });
    const developerLookup = renderHook(() => useManagerDeskDeveloperLookup('', '2026-03-09'), { wrapper });

    await waitFor(() => {
      expect(issueLookup.result.current.isSuccess).toBe(true);
      expect(developerLookup.result.current.isSuccess).toBe(true);
    });

    expect(issueLookup.result.current.data).toEqual([{ jiraKey: 'AM-1', summary: 'Regression' }]);
    expect(developerLookup.result.current.data).toEqual([{ accountId: 'alice-1', displayName: 'Alice' }]);
  });

  it('posts, deletes, and invalidates dependent desk views for simple mutations', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    mockPost.mockResolvedValue(deskItem);
    mockDelete.mockResolvedValue({ deleted: true });
    const wrapper = createWrapper(queryClient);

    const createItem = renderHook(() => useCreateManagerDeskItem('2026-03-09'), { wrapper });
    const addLink = renderHook(() => useAddManagerDeskLink('2026-03-09'), { wrapper });
    const removeLink = renderHook(() => useRemoveManagerDeskLink('2026-03-09'), { wrapper });
    const deleteItem = renderHook(() => useDeleteManagerDeskItem('2026-03-09'), { wrapper });

    await act(async () => {
      await createItem.result.current.mutateAsync({ title: 'Follow up with QA', kind: 'action' } as never);
      await addLink.result.current.mutateAsync({ itemId: 42, linkType: 'issue', issueKey: 'AM-1' } as never);
      await removeLink.result.current.mutateAsync({ itemId: 42, linkId: 7 });
      await deleteItem.result.current.mutateAsync(42);
    });

    expect(mockPost).toHaveBeenCalledWith('/manager-desk/items', {
      title: 'Follow up with QA',
      kind: 'action',
    });
    expect(mockPost).toHaveBeenCalledWith('/manager-desk/items/42/links', {
      linkType: 'issue',
      issueKey: 'AM-1',
    });
    expect(mockDelete).toHaveBeenCalledWith('/manager-desk/items/42/links/7');
    expect(mockDelete).toHaveBeenCalledWith('/manager-desk/items/42');
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['today'] });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['manager-desk'] });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['team-tracker'] });
  });

  it('updates matching shared task detail caches after promoting, updating, and cancelling desk items', async () => {
    const queryClient = createQueryClient();
    const detailKey = ['manager-desk', 'task-detail', 42, 55, 'anonymous'];
    queryClient.setQueryData(detailKey, {
      trackerItem: { id: 55, title: 'Tracker task' },
      managerDeskItem: { ...deskItem, title: 'Old title' },
      developer: { accountId: 'old-dev', displayName: 'Old Dev' },
    });
    queryClient.setQueryData(['manager-desk', 'task-detail', 99, 77, 'anonymous'], {
      trackerItem: { id: 77, title: 'Different task' },
    });

    mockPost.mockImplementation((url: string) => {
      if (url === '/manager-desk/tracker-items/55/promote') {
        return Promise.resolve({
          trackerItem: { id: 55, title: 'Tracker task' },
          managerDeskItem: { ...deskItem, title: 'Promoted task' },
        });
      }
      if (url === '/manager-desk/items/42/cancel-delegated-task') {
        return Promise.resolve({ ...deskItem, title: 'Cancelled delegation' });
      }
      return Promise.reject(new Error(`Unexpected URL ${url}`));
    });
    mockPatch.mockResolvedValue({
      ...deskItem,
      title: 'Updated title',
      assignee: {
        accountId: 'alice-1',
        displayName: 'Alice',
        avatarUrl: 'https://example.com/alice.png',
        availability: { state: 'active' },
      },
    });

    const wrapper = createWrapper(queryClient);
    const promote = renderHook(() => usePromoteTrackerItem(), { wrapper });
    const update = renderHook(() => useUpdateManagerDeskItem('2026-03-09'), { wrapper });
    const cancel = renderHook(() => useCancelDelegatedManagerDeskTask('2026-03-09'), { wrapper });

    await act(async () => {
      await promote.result.current.mutateAsync(55);
      await update.result.current.mutateAsync({ itemId: 42, title: 'Updated title' } as never);
      await cancel.result.current.mutateAsync(42);
    });

    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      managerDeskItem: { id: 42, title: 'Cancelled delegation' },
      developer: { accountId: 'alice-1', displayName: 'Alice' },
    });
    expect((queryClient.getQueryData(detailKey) as { trackerItem?: unknown }).trackerItem).toBeUndefined();
    expect(queryClient.getQueryData(['manager-desk', 'task-detail', 99, 77, 'anonymous'])).toEqual({
      trackerItem: { id: 77, title: 'Different task' },
    });
  });

  it('carries manager desk items forward and invalidates source, destination, and dependent views', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    mockPost.mockResolvedValue({ created: 2 });

    const { result } = renderHook(() => useCarryForwardManagerDesk('2026-03-09'), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        fromDate: '2026-03-08',
        toDate: '2026-03-10',
        itemIds: [42, 43],
      });
    });

    expect(mockPost).toHaveBeenCalledWith('/manager-desk/carry-forward', {
      fromDate: '2026-03-08',
      toDate: '2026-03-10',
      itemIds: [42, 43],
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['manager-desk', '2026-03-09'] });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['manager-desk', '2026-03-10'] });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['manager-desk', 'carry-forward-context', '2026-03-10'],
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['today'] });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['workload'] });
  });
});
