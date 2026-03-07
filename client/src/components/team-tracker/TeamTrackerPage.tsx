import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ArrowRight } from 'lucide-react';
import { useTeamTracker } from '@/hooks/useTeamTracker';
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
import { TrackerSummaryStrip, type SummaryFilter } from './TrackerSummaryStrip';
import { TrackerBoard } from './TrackerBoard';
import { DeveloperTrackerDrawer } from './DeveloperTrackerDrawer';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function shiftIsoDate(date: string, days: number): string {
  const shifted = new Date(`${date}T00:00:00.000Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

export function TeamTrackerPage() {
  const [date, setDate] = useState(todayIso);
  const [summaryFilter, setSummaryFilter] = useState<SummaryFilter>('all');
  const [drawerAccountId, setDrawerAccountId] = useState<string | undefined>();

  const { data: board, isLoading } = useTeamTracker(date);
  const { data: issues } = useIssues('all');

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
    carryForward.mutate({ fromDate: date, toDate: shiftIsoDate(date, 1) });
  }, [carryForward, date]);

  const isToday = date === todayIso();

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
              className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
            >
              <Calendar size={12} style={{ color: 'var(--text-muted)' }} />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="text-[12px] font-mono bg-transparent outline-none"
                style={{ color: 'var(--text-primary)', colorScheme: 'dark' }}
              />
            </div>
            {!isToday && (
              <button
                onClick={() => setDate(todayIso())}
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
        onSetCurrent={handleSetCurrent}
        onMarkDone={handleMarkDone}
        onDropItem={handleDropItem}
        onDeleteItem={(id) => deleteItem.mutate(id)}
        onAddCheckIn={(params) => addCheckIn.mutate(params)}
        issues={issues}
      />
    </div>
  );
}
