import { useState, useCallback, useMemo, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, History, RefreshCw } from 'lucide-react';
import { useTeamTracker } from '@/hooks/useTeamTracker';
import {
  useUpdateDay,
  useUpdateAvailability,
  useSetCurrentItem,
  useUpdateTrackerItem,
  useAddTrackerItem,
  useAddCheckIn,
} from '@/hooks/useTeamTrackerMutations';
import { useBoardQueryState } from '@/hooks/useBoardQueryState';
import { useIssues } from '@/hooks/useIssues';
import { useToast } from '@/context/ToastContext';
import { getLocalIsoDate, shiftLocalIsoDate } from '@/lib/utils';
import { TrackerSummaryStrip } from './TrackerSummaryStrip';
import { TrackerBoardToolbar } from './TrackerBoardToolbar';
import { AttentionQueue } from './AttentionQueue';
import { InactiveDeveloperTray } from './InactiveDeveloperTray';
import { TrackerBoard } from './TrackerBoard';
import { DeveloperTrackerDrawer } from './DeveloperTrackerDrawer';
import { AvailabilityDialog } from './AvailabilityDialog';
import { TrackerTaskDetailDrawer } from './TrackerTaskDetailDrawer';
import { ManagerDeskCaptureDialog } from '@/components/manager-desk/ManagerDeskCaptureDialog';
import type { AppView } from '@/App';
import type { TrackerAttentionItem, TrackerDeveloperDay, TrackerWorkItem } from '@/types';

interface TeamTrackerPageProps {
  onViewChange?: (view: AppView) => void;
}

export function TeamTrackerPage({ onViewChange }: TeamTrackerPageProps) {
  const { addToast } = useToast();
  const [date, setDate] = useState(getLocalIsoDate);
  const [drawerAccountId, setDrawerAccountId] = useState<string | undefined>();
  const [selectedTask, setSelectedTask] = useState<{ trackerItemId: number; managerDeskItemId?: number } | null>(null);
  const [availabilityTarget, setAvailabilityTarget] = useState<TrackerDeveloperDay | undefined>();
  const [captureFollowUpTarget, setCaptureFollowUpTarget] = useState<TrackerAttentionItem | null>(null);

  // Board query + saved views (extracted hook)
  const qs = useBoardQueryState(addToast);

  const {
    data: board,
    isLoading,
    isFetching: isBoardFetching,
    refetch: refetchBoard,
  } = useTeamTracker(date, qs.boardQuery);

  // Feed resolved query back to qs for derived values
  const resolvedQuery = board?.query;

  const { data: issues } = useIssues('all');
  const isToday = date === getLocalIsoDate();
  const nextDate = useMemo(() => shiftLocalIsoDate(date, 1), [date]);

  const addTrackerItem = useAddTrackerItem(date);
  const updateDay = useUpdateDay(date);
  const updateAvailability = useUpdateAvailability(date);
  const setCurrent = useSetCurrentItem(date);
  const updateItem = useUpdateTrackerItem(date);
  const addCheckIn = useAddCheckIn(date);

  const groups = board?.groups ?? [];
  const viewMode = board?.viewMode ?? (isToday ? 'live' : 'history');
  const readOnly = viewMode === 'history';
  const resolvedSummaryFilter = resolvedQuery?.summaryFilter ?? 'all';
  const resolvedSortBy = resolvedQuery?.sortBy ?? 'name';
  const resolvedGroupBy = resolvedQuery?.groupBy ?? 'none';
  const resolvedSearch = resolvedQuery?.q ?? '';
  const isGrouped = resolvedGroupBy !== 'none';

  const drawerDay = useMemo(
    () => board?.developers.find((d) => d.developer.accountId === drawerAccountId),
    [board, drawerAccountId]
  );

  const findTrackerItem = useCallback(
    (itemId: number): TrackerWorkItem | undefined => {
      for (const day of board?.developers ?? []) {
        if (day.currentItem?.id === itemId) {
          return day.currentItem;
        }

        const plannedItem = day.plannedItems.find((item) => item.id === itemId);
        if (plannedItem) {
          return plannedItem;
        }

        const completedItem = day.completedItems.find((item) => item.id === itemId);
        if (completedItem) {
          return completedItem;
        }

        const droppedItem = day.droppedItems.find((item) => item.id === itemId);
        if (droppedItem) {
          return droppedItem;
        }
      }

      return undefined;
    },
    [board?.developers]
  );

  const handleSetCurrent = useCallback(
    (itemId: number) => {
      setCurrent.mutate(itemId, {
        onError: (err) => addToast(err.message, 'error'),
      });
    },
    [addToast, setCurrent]
  );

  const handleMarkDone = useCallback(
    (itemId: number) => {
      const previousItem = findTrackerItem(itemId);
      const previousState = previousItem?.state ?? 'in_progress';
      const itemLabel = previousItem?.title ?? 'Task';

      updateItem.mutate(
        { itemId, state: 'done' },
        {
          onSuccess: () => {
            addToast({
              type: 'success',
              title: `${itemLabel} marked done`,
              message: 'Current work was moved out of the active slot.',
              action: {
                label: 'Undo',
                onClick: () => {
                  updateItem.mutate(
                    { itemId, state: previousState },
                    {
                      onSuccess: () => addToast('Task restored', 'success'),
                      onError: (err) => addToast(err.message, 'error'),
                    }
                  );
                },
              },
              duration: 8000,
            });
          },
          onError: (err) => addToast(err.message, 'error'),
        }
      );
    },
    [addToast, findTrackerItem, updateItem]
  );

  const handleDropItem = useCallback(
    (itemId: number) => {
      updateItem.mutate({ itemId, state: 'dropped' });
    },
    [updateItem]
  );

  const handleOpenTaskDetail = useCallback((itemId: number, managerDeskItemId?: number) => {
    setDrawerAccountId(undefined);
    setSelectedTask({ trackerItemId: itemId, managerDeskItemId });
  }, []);

  const handleCreateTask = useCallback(
    (params: { accountId: string; title: string; jiraKey?: string; note?: string }) => {
      if (readOnly) {
        return;
      }
      addTrackerItem.mutate(params);
    },
    [addTrackerItem, readOnly]
  );

  const handleRefresh = useCallback(() => {
    void refetchBoard();
  }, [refetchBoard]);

  useEffect(() => {
    setSelectedTask(null);
  }, [date]);
  const isRefreshing = isBoardFetching;

  const handleMarkInactive = useCallback((day: TrackerDeveloperDay) => {
    setAvailabilityTarget(day);
  }, []);

  const handleConfirmInactive = useCallback((note?: string) => {
    if (!availabilityTarget) {
      return;
    }

    updateAvailability.mutate(
      {
        accountId: availabilityTarget.developer.accountId,
        state: 'inactive',
        note,
      },
      {
        onSuccess: () => {
          setAvailabilityTarget(undefined);
          if (drawerAccountId === availabilityTarget.developer.accountId) {
            setDrawerAccountId(undefined);
          }
        },
      }
    );
  }, [availabilityTarget, drawerAccountId, updateAvailability]);

  const handleReactivate = useCallback((accountId: string) => {
    updateAvailability.mutate({ accountId, state: 'active' });
  }, [updateAvailability]);

  const handleAttentionMarkInactive = useCallback((accountId: string) => {
    const day = board?.developers.find((d) => d.developer.accountId === accountId);
    if (day) {
      setAvailabilityTarget(day);
    }
  }, [board?.developers]);

  const handleAttentionCaptureFollowUp = useCallback((item: TrackerAttentionItem) => {
    setCaptureFollowUpTarget(item);
  }, []);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Page header strip */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="shrink-0 px-4 pt-3 pb-1"
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div
              className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}
            >
              <Calendar size={16} />
            </div>
            <div>
              <div className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                Team Tracker
              </div>
              <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                Daily work tracking &amp; follow-ups
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors disabled:opacity-50"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
              aria-label="Refresh team tracker"
              title="Refresh team tracker"
            >
              <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <div
              className="flex items-center gap-0.5 rounded-xl px-1 py-0.5"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
            >
              <button
                onClick={() => setDate(shiftLocalIsoDate(date, -1))}
                className="h-7 w-7 rounded-lg flex items-center justify-center transition-colors hover:brightness-125"
                style={{ color: 'var(--text-secondary)' }}
                aria-label="Previous day"
              >
                <ChevronLeft size={14} />
              </button>
              <div className="flex items-center gap-1.5 px-1.5">
                <Calendar size={12} style={{ color: 'var(--text-muted)' }} />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="text-[12px] font-mono bg-transparent outline-none"
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>
              <button
                onClick={() => setDate(shiftLocalIsoDate(date, 1))}
                disabled={isToday}
                className="h-7 w-7 rounded-lg flex items-center justify-center transition-colors hover:brightness-125 disabled:opacity-30"
                style={{ color: 'var(--text-secondary)' }}
                aria-label="Next day"
              >
                <ChevronRight size={14} />
              </button>
            </div>
            {!isToday && (
              <button
                onClick={() => setDate(getLocalIsoDate())}
                className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--accent)',
                  border: '1px solid var(--border)',
                }}
              >
                Today
              </button>
            )}
          </div>
        </div>

        {board && (
          <TrackerSummaryStrip
            summary={board.summary}
            activeFilter={resolvedSummaryFilter}
            onFilterChange={qs.handleSummaryFilterChange}
          />
        )}

        {board && (
          <TrackerBoardToolbar
            searchQuery={resolvedSearch}
            onSearchChange={qs.handleSearchChange}
            sortBy={resolvedSortBy}
            onSortChange={qs.handleSortChange}
            groupBy={resolvedGroupBy}
            onGroupChange={qs.handleGroupChange}
            visibleCount={board.visibleSummary.total}
            totalCount={board.summary.total}
            views={qs.savedViews}
            activeViewId={qs.activeViewId}
            isDirty={qs.isDirtyFrom(resolvedQuery)}
            isViewsLoading={qs.isViewsLoading}
            onApplyView={qs.handleApplyView}
            onClearView={qs.handleClearView}
            onSaveNew={qs.handleSaveNewView}
            onUpdateView={qs.handleUpdateView}
            onDeleteView={qs.handleDeleteView}
            isSaving={qs.isSaving}
          />
        )}
        <TeamTrackerModeBanner date={date} viewMode={viewMode} />
      </motion.div>

      {/* Board area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 pt-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
              />
              <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                Loading tracker…
              </span>
            </div>
          </div>
        ) : board ? (
          <>
            {!readOnly && (
              <AttentionQueue
                items={board.attentionQueue}
                date={date}
                onOpenDrawer={setDrawerAccountId}
                onMarkInactive={handleAttentionMarkInactive}
                onCaptureFollowUp={handleAttentionCaptureFollowUp}
              />
            )}
            <InactiveDeveloperTray
              items={board.inactiveDevelopers}
              onReactivate={handleReactivate}
              pendingAccountId={updateAvailability.isPending ? updateAvailability.variables?.accountId : undefined}
              readOnly={readOnly}
            />
            <TrackerBoard
              date={date}
              developers={board.developers}
              groups={groups}
              isGrouped={isGrouped}
              searchActive={!!resolvedSearch}
              onOpenDrawer={setDrawerAccountId}
              onOpenTaskDetail={readOnly ? undefined : handleOpenTaskDetail}
              onMarkInactive={handleMarkInactive}
              onSetCurrent={handleSetCurrent}
              onMarkDone={handleMarkDone}
              onQuickAdd={handleCreateTask}
              issues={issues}
              isQuickAddPending={addTrackerItem.isPending}
              readOnly={readOnly}
            />
          </>
        ) : (
          <div className="flex items-center justify-center py-20">
            <div className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
              No tracker data. Add developers from the settings page first.
            </div>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      <DeveloperTrackerDrawer
        date={date}
        day={drawerDay}
        open={!!drawerAccountId}
        onClose={() => setDrawerAccountId(undefined)}
        onUpdateDay={(params) => updateDay.mutate(params)}
        onAddItem={handleCreateTask}
        onOpenTaskDetail={handleOpenTaskDetail}
        onReorderPlannedItem={(params) => updateItem.mutate(params)}
        onUpdateItemNote={(params) => updateItem.mutate(params)}
        onUpdateItemTitle={(params) => updateItem.mutate(params)}
        onSetCurrent={handleSetCurrent}
        onMarkDone={handleMarkDone}
        onDropItem={handleDropItem}
        onAddCheckIn={(params) => addCheckIn.mutate(params)}
        onOpenManagerDesk={onViewChange ? () => onViewChange('manager-desk') : undefined}
        issues={issues}
        isAddItemPending={addTrackerItem.isPending}
        readOnly={readOnly}
      />
      <TrackerTaskDetailDrawer
        trackerItemId={selectedTask?.trackerItemId ?? null}
        initialManagerDeskItemId={selectedTask?.managerDeskItemId ?? null}
        onClose={() => setSelectedTask(null)}
      />
      <AvailabilityDialog
        open={!!availabilityTarget}
        developerName={availabilityTarget?.developer.displayName}
        date={date}
        isPending={updateAvailability.isPending && updateAvailability.variables?.state === 'inactive'}
        onClose={() => setAvailabilityTarget(undefined)}
        onConfirm={handleConfirmInactive}
      />
      <AnimatePresence>
        {captureFollowUpTarget && (
          <ManagerDeskCaptureDialog
            onClose={() => setCaptureFollowUpTarget(null)}
            onOpenManagerDesk={onViewChange ? () => onViewChange('manager-desk') : undefined}
            heading={`Follow up with ${captureFollowUpTarget.developer.displayName}`}
            description="Capture a follow-up item on your Manager Desk linked to this developer."
            initialTitle={`Follow up with ${captureFollowUpTarget.developer.displayName}`}
            initialKind="action"
            initialCategory="follow_up"
            initialLinks={[{ linkType: 'developer', developerAccountId: captureFollowUpTarget.developer.accountId }]}
            contextChips={[
              { label: 'Developer', value: captureFollowUpTarget.developer.displayName, tone: 'developer' },
              ...captureFollowUpTarget.reasons.map((r) => ({ label: 'Reason', value: r.label, tone: 'generic' as const })),
            ]}
            date={date}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function TeamTrackerModeBanner({
  date,
  viewMode,
}: {
  date: string;
  viewMode: 'live' | 'history';
}) {
  if (viewMode === 'live') {
    return (
      <div className="mt-2 rounded-[16px] border px-3 py-2 text-[12px]" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
        Open team work stays on the tracker until it is done or dropped. A new day changes the lens, not the task’s continuity.
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-[16px] border px-3 py-2" style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--bg-secondary) 94%, transparent)' }}>
      <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
        <History size={13} style={{ color: 'var(--accent)' }} />
        {date} is shown as a historical snapshot. This view is read-only so you can review who was working on what without changing the past.
      </div>
    </div>
  );
}
