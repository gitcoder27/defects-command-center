import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { DEFAULT_DASHBOARD_FILTER_STATE, type DashboardFilterState } from '@/components/layout/dashboard-state';
import type { WorkSavedView } from '@/types';
import { useWorkSavedViews, useCreateWorkView, useUpdateWorkView, useDeleteWorkView } from './useWorkSavedViews';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AddToastFn = (...args: any[]) => void;

export interface WorkSavedViewState {
  activeViewId: number | undefined;
  isDirty: boolean;
  savedViews: WorkSavedView[];
  isViewsLoading: boolean;
  isSaving: boolean;
  handleApplyView: (view: WorkSavedView) => void;
  handleClearView: () => void;
  handleSaveNewView: (name: string) => void;
  handleUpdateView: (viewId: number, name: string) => void;
  handleDeleteView: (viewId: number) => void;
}

function savedViewToFilterState(view: WorkSavedView): DashboardFilterState {
  return {
    activeFilter: view.filter,
    activeDeveloper: view.developerAccountId ?? undefined,
    selectedTagId: view.tagId ?? undefined,
    noTagsFilter: view.noTagsFilter,
  };
}

function filterStateToSavedViewInput(filterState: DashboardFilterState) {
  return {
    filter: filterState.activeFilter,
    developerAccountId: filterState.activeDeveloper ?? null,
    tagId: filterState.selectedTagId ?? null,
    noTagsFilter: filterState.noTagsFilter,
  };
}

function isFilterStateDirtyFrom(filterState: DashboardFilterState, view: WorkSavedView | undefined): boolean {
  if (!view) {
    return false;
  }
  return (
    filterState.activeFilter !== view.filter ||
    filterState.activeDeveloper !== (view.developerAccountId ?? undefined) ||
    filterState.selectedTagId !== (view.tagId ?? undefined) ||
    filterState.noTagsFilter !== view.noTagsFilter
  );
}

export function useWorkSavedViewState(
  addToast: AddToastFn,
  filterState: DashboardFilterState,
  setFilterState: Dispatch<SetStateAction<DashboardFilterState>>,
): WorkSavedViewState {
  const [activeViewId, setActiveViewId] = useState<number | undefined>();
  const activeViewSnapshot = useRef<WorkSavedView | undefined>();

  const { data: savedViews, isLoading: isViewsLoading } = useWorkSavedViews();
  const createView = useCreateWorkView();
  const updateView = useUpdateWorkView();
  const deleteView = useDeleteWorkView();

  const handleApplyView = useCallback(
    (view: WorkSavedView) => {
      activeViewSnapshot.current = view;
      setActiveViewId(view.id);
      setFilterState(savedViewToFilterState(view));
    },
    [setFilterState],
  );

  const handleClearView = useCallback(() => {
    activeViewSnapshot.current = undefined;
    setActiveViewId(undefined);
    setFilterState(DEFAULT_DASHBOARD_FILTER_STATE);
  }, [setFilterState]);

  const handleSaveNewView = useCallback(
    (name: string) => {
      createView.mutate(
        { name, ...filterStateToSavedViewInput(filterState) },
        {
          onSuccess: (newView) => {
            activeViewSnapshot.current = newView;
            setActiveViewId(newView.id);
            addToast(`View "${name}" saved`, 'success');
          },
          onError: (err) => addToast(err.message, 'error'),
        },
      );
    },
    [addToast, createView, filterState],
  );

  const handleUpdateView = useCallback(
    (viewId: number, name: string) => {
      updateView.mutate(
        { viewId, name, ...filterStateToSavedViewInput(filterState) },
        {
          onSuccess: (updatedView) => {
            activeViewSnapshot.current = updatedView;
            addToast(`View "${name}" updated`, 'success');
          },
          onError: (err) => addToast(err.message, 'error'),
        },
      );
    },
    [addToast, filterState, updateView],
  );

  const handleDeleteView = useCallback(
    (viewId: number) => {
      deleteView.mutate(viewId, {
        onSuccess: () => {
          if (activeViewId === viewId) {
            activeViewSnapshot.current = undefined;
            setActiveViewId(undefined);
          }
          addToast('View deleted', 'success');
        },
        onError: (err) => addToast(err.message, 'error'),
      });
    },
    [activeViewId, addToast, deleteView],
  );

  return {
    activeViewId,
    isDirty: isFilterStateDirtyFrom(filterState, activeViewSnapshot.current),
    savedViews: savedViews ?? [],
    isViewsLoading,
    isSaving: createView.isPending || updateView.isPending,
    handleApplyView,
    handleClearView,
    handleSaveNewView,
    handleUpdateView,
    handleDeleteView,
  };
}
