import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_DASHBOARD_FILTER_STATE } from '@/components/layout/dashboard-state';
import { useWorkSavedViewState } from '@/hooks/useWorkSavedViewState';
import type { WorkSavedView } from '@/types';

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

const savedView: WorkSavedView = {
  id: 1,
  name: 'Blocked for Priya',
  filter: 'blocked',
  developerAccountId: 'dev-1',
  tagId: null,
  noTagsFilter: false,
  createdAt: '2026-03-07T00:00:00.000Z',
  updatedAt: '2026-03-07T00:00:00.000Z',
};

describe('useWorkSavedViewState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ views: [savedView] });
    mockPost.mockResolvedValue(savedView);
    mockPatch.mockResolvedValue(savedView);
    mockDelete.mockResolvedValue({ deleted: true });
  });

  it('applies a saved view into the filter state and reports clean dirty state', async () => {
    const { result } = renderHook(
      () => {
        const state = useWorkSavedViewState(vi.fn(), DEFAULT_DASHBOARD_FILTER_STATE, () => {});
        return state;
      },
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.savedViews).toHaveLength(1));
    expect(result.current.isDirty).toBe(false);

    act(() => result.current.handleApplyView(savedView));

    expect(result.current.activeViewId).toBe(savedView.id);
  });

  it('reports dirty when the filter state drifts from the applied view', async () => {
    const drifted = { ...DEFAULT_DASHBOARD_FILTER_STATE, activeFilter: 'overdue' as const };
    const { result } = renderHook(
      () => useWorkSavedViewState(vi.fn(), drifted, () => {}),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.savedViews).toHaveLength(1));

    act(() => result.current.handleApplyView(savedView));

    expect(result.current.isDirty).toBe(true);
  });

  it('saves the current filter state as a new view', async () => {
    const filterState = { activeFilter: 'blocked' as const, activeDeveloper: 'dev-1', selectedTagId: undefined, noTagsFilter: true };
    const addToast = vi.fn();
    const { result } = renderHook(
      () => useWorkSavedViewState(addToast, filterState, () => {}),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.savedViews).toHaveLength(1));

    act(() => result.current.handleSaveNewView('My view'));

    await waitFor(() => expect(mockPost).toHaveBeenCalled());
    expect(mockPost).toHaveBeenCalledWith('/work/views', {
      name: 'My view',
      filter: 'blocked',
      developerAccountId: 'dev-1',
      tagId: null,
      noTagsFilter: true,
    });
    await waitFor(() => expect(addToast).toHaveBeenCalled());
    expect(result.current.activeViewId).toBe(savedView.id);
  });

  it('clears the active view', async () => {
    const { result } = renderHook(
      () => useWorkSavedViewState(vi.fn(), DEFAULT_DASHBOARD_FILTER_STATE, () => {}),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.savedViews).toHaveLength(1));

    act(() => result.current.handleApplyView(savedView));
    act(() => result.current.handleClearView());

    expect(result.current.activeViewId).toBeUndefined();
  });

  it('deletes a view and drops the active selection', async () => {
    const addToast = vi.fn();
    const { result } = renderHook(
      () => useWorkSavedViewState(addToast, DEFAULT_DASHBOARD_FILTER_STATE, () => {}),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.savedViews).toHaveLength(1));

    act(() => result.current.handleApplyView(savedView));
    act(() => result.current.handleDeleteView(savedView.id));

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('/work/views/1'));
    expect(result.current.activeViewId).toBeUndefined();
    expect(addToast).toHaveBeenCalledWith('View deleted', 'success');
  });
});
