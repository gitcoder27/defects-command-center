import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ArrowRight, ChevronLeft, ChevronRight, RefreshCw, X } from 'lucide-react';
import { useTeamTracker, useCarryForwardPreview } from '@/hooks/useTeamTracker';
import {
  useUpdateDay,
  useAddTrackerItem,
  useSetCurrentItem,
  useUpdateTrackerItem,
  useDeleteTrackerItem,
  useAddCheckIn,
  useCarryForward,
} from '@/hooks/useTeamTrackerMutations';
import { useIssues } from '@/hooks/useIssues';
import { getLocalIsoDate, shiftLocalIsoDate } from '@/lib/utils';
import { TrackerSummaryStrip, type SummaryFilter } from './TrackerSummaryStrip';
import { TrackerBoard } from './TrackerBoard';
import { DeveloperTrackerDrawer } from './DeveloperTrackerDrawer';
import type { AppView } from '@/App';

function getCarryForwardPromptKey(date: string): string {
  return `team-tracker:carry-forward-prompt:${date}`;
}

function readCarryForwardPromptState(date: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.sessionStorage.getItem(getCarryForwardPromptKey(date)) === 'dismissed';
  } catch {
    return false;
  }
}

function writeCarryForwardPromptState(date: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(getCarryForwardPromptKey(date), 'dismissed');
  } catch {
    // Ignore storage access failures; the prompt will simply reappear.
  }
}

interface TeamTrackerPageProps {
  onViewChange?: (view: AppView) => void;
}

export function TeamTrackerPage({ onViewChange }: TeamTrackerPageProps) {
  const [date, setDate] = useState(getLocalIsoDate);
  const [summaryFilter, setSummaryFilter] = useState<SummaryFilter>('all');
  const [drawerAccountId, setDrawerAccountId] = useState<string | undefined>();
  const [carryPromptDismissed, setCarryPromptDismissed] = useState(() => readCarryForwardPromptState(getLocalIsoDate()));

  const {
    data: board,
    isLoading,
    isFetching: isBoardFetching,
    refetch: refetchBoard,
  } = useTeamTracker(date);
  const { data: issues } = useIssues('all');
  const previousDate = useMemo(() => shiftLocalIsoDate(date, -1), [date]);
  const carryForwardPreview = useCarryForwardPreview(previousDate, date, !carryPromptDismissed);

  const updateDay = useUpdateDay(date);
  const addItem = useAddTrackerItem(date);
  const setCurrent = useSetCurrentItem(date);
  const updateItem = useUpdateTrackerItem(date);
  const deleteItem = useDeleteTrackerItem(date);
  const addCheckIn = useAddCheckIn(date);
  const carryForward = useCarryForward();

  const drawerDay = useMemo(
    () => board?.developers.find((d) => d.developer.accountId === drawerAccountId),
    [board, drawerAccountId]
  );

  const handleSetCurrent = useCallback(
    (itemId: number) => {
      setCurrent.mutate(itemId);
    },
    [setCurrent]
  );

  const handleMarkDone = useCallback(
    (itemId: number) => {
      updateItem.mutate({ itemId, state: 'done' });
    },
    [updateItem]
  );

  const handleDropItem = useCallback(
    (itemId: number) => {
      updateItem.mutate({ itemId, state: 'dropped' });
    },
    [updateItem]
  );

  const handleCarryForward = useCallback(() => {
    carryForward.mutate({ fromDate: date, toDate: shiftLocalIsoDate(date, 1) });
  }, [carryForward, date]);

  const dismissCarryForwardPrompt = useCallback(() => {
    writeCarryForwardPromptState(date);
    setCarryPromptDismissed(true);
  }, [date]);

  const handleCarryForwardFromPreviousDay = useCallback(() => {
    carryForward.mutate(
      { fromDate: previousDate, toDate: date },
      {
        onSuccess: () => {
          dismissCarryForwardPrompt();
        },
      }
    );
  }, [carryForward, date, dismissCarryForwardPrompt, previousDate]);

  const handleRefresh = useCallback(() => {
    void refetchBoard();
    if (!carryPromptDismissed) {
      void carryForwardPreview.refetch();
    }
  }, [carryForwardPreview, carryPromptDismissed, refetchBoard]);

  useEffect(() => {
    setCarryPromptDismissed(readCarryForwardPromptState(date));
  }, [date]);

  const isToday = date === getLocalIsoDate();
  const carryableFromPreviousDay = carryForwardPreview.data ?? 0;
  const isRefreshing = isBoardFetching || carryForwardPreview.isFetching;
  const showCarryForwardPrompt =
    !carryPromptDismissed &&
    !carryForwardPreview.isLoading &&
    !carryForwardPreview.isError &&
    carryableFromPreviousDay > 0;

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
            {!isToday && (
              <button
                onClick={handleCarryForward}
                disabled={carryForward.isPending}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors disabled:opacity-50"
                style={{
                  background: 'var(--accent-glow)',
                  color: 'var(--accent)',
                  border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
                }}
              >
                <ArrowRight size={12} />
                Carry Forward
              </button>
            )}
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
            activeFilter={summaryFilter}
            onFilterChange={setSummaryFilter}
          />
        )}

        {showCarryForwardPrompt && (
          <div
            className="mt-2 flex items-center justify-between gap-3 rounded-[16px] border px-3 py-2"
            style={{
              borderColor: 'var(--border-strong)',
              background: 'color-mix(in srgb, var(--accent-glow) 34%, var(--bg-secondary) 66%)',
            }}
          >
            <div className="min-w-0">
              <div className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>
                {carryableFromPreviousDay} unfinished item{carryableFromPreviousDay === 1 ? '' : 's'} from {previousDate}
              </div>
              <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                Carry them into {date} before you start updating today&apos;s board.
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleCarryForwardFromPreviousDay}
                disabled={carryForward.isPending}
                className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium disabled:opacity-50"
                style={{
                  background: 'var(--accent-glow)',
                  color: 'var(--accent)',
                  border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
                }}
              >
                Carry Forward
              </button>
              <button
                type="button"
                onClick={dismissCarryForwardPrompt}
                className="h-8 w-8 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
                aria-label="Dismiss carry-forward prompt"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}
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
          <TrackerBoard
            developers={board.developers}
            filter={summaryFilter}
            onOpenDrawer={setDrawerAccountId}
            onSetCurrent={handleSetCurrent}
            onMarkDone={handleMarkDone}
          />
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
        day={drawerDay}
        open={!!drawerAccountId}
        onClose={() => setDrawerAccountId(undefined)}
        onUpdateDay={(params) => updateDay.mutate(params)}
        onAddItem={(params) => addItem.mutate(params)}
        onReorderPlannedItem={(params) => updateItem.mutate(params)}
        onUpdateItemNote={(params) => updateItem.mutate(params)}
        onUpdateItemTitle={(params) => updateItem.mutate(params)}
        onSetCurrent={handleSetCurrent}
        onMarkDone={handleMarkDone}
        onDropItem={handleDropItem}
        onDeleteItem={(id) => deleteItem.mutate(id)}
        onAddCheckIn={(params) => addCheckIn.mutate(params)}
        onOpenManagerDesk={onViewChange ? () => onViewChange('manager-desk') : undefined}
        issues={issues}
        isAddItemPending={addItem.isPending}
      />
    </div>
  );
}
