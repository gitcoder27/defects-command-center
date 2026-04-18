import { useCallback, useEffect, useMemo, useState } from 'react';
import { MotionConfig, motion } from 'framer-motion';
import { addDays, format, isToday, parseISO, subDays } from 'date-fns';
import { Briefcase, CalendarClock, History } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import {
  useCancelDelegatedManagerDeskTask,
  useCreateManagerDeskItem,
  useDeleteManagerDeskItem,
  useManagerDesk,
  useUpdateManagerDeskItem,
} from '@/hooks/useManagerDesk';
import type { ManagerDeskItem, ManagerDeskViewMode } from '@/types/manager-desk';
import { CompletedTray } from './CompletedTray';
import { DeskItemCard } from './DeskItemCard';
import { EmptyDay } from './EmptyDay';
import { InboxTriageRow } from './InboxTriageRow';
import { ItemDetailDrawer } from './ItemDetailDrawer';
import { ManagerDeskCommandBar } from './ManagerDeskCommandBar';
import { ManagerDeskHeader } from './ManagerDeskHeader';
import { SummaryStrip } from './SummaryStrip';
import { TaskRail } from './TaskRail';
import { WorkbenchSection } from './WorkbenchSection';
import { MANAGER_DESK_CARD_LAYOUT_TRANSITION } from './motion';
import {
  buildSections,
  filterItems,
  getOpenItems,
  isInboxItem,
  type ManagerDeskFilterState,
  type ManagerDeskQuickFilter,
} from './workbench-utils';

const defaultFilters: ManagerDeskFilterState = { kind: null, category: null, status: null };

type HistorySubview = 'snapshot' | 'created';

export function ManagerDeskPage() {
  const { addToast } = useToast();
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [inlineTriageId, setInlineTriageId] = useState<number | null>(null);
  const [filters, setFilters] = useState<ManagerDeskFilterState>(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState<ManagerDeskQuickFilter>('all');
  const [historySubview, setHistorySubview] = useState<HistorySubview>('snapshot');

  const { data: day, isLoading, isFetching, error, refetch } = useManagerDesk(date);
  const createItem = useCreateManagerDeskItem(date);
  const updateItem = useUpdateManagerDeskItem(date);
  const deleteItem = useDeleteManagerDeskItem(date);
  const cancelDelegated = useCancelDelegatedManagerDeskTask(date);

  const viewMode = day?.viewMode ?? 'live';
  const readOnly = viewMode === 'history';

  useEffect(() => {
    setHistorySubview('snapshot');
  }, [date, viewMode]);

  const sourceItems = useMemo(() => {
    if (viewMode === 'history' && historySubview === 'created') {
      return day?.createdThatDayItems ?? [];
    }
    return day?.items ?? [];
  }, [day?.createdThatDayItems, day?.items, historySubview, viewMode]);

  const filteredItems = useMemo(
    () => filterItems(sourceItems, searchQuery, quickFilter, filters),
    [sourceItems, searchQuery, quickFilter, filters],
  );
  const sections = useMemo(() => buildSections(filteredItems), [filteredItems]);
  const openItems = useMemo(() => getOpenItems(filteredItems), [filteredItems]);
  const selectedItem = useMemo(
    () => filteredItems.find((item) => item.id === selectedItemId) ?? null,
    [filteredItems, selectedItemId],
  );

  useEffect(() => {
    if (selectedItemId !== null && !filteredItems.some((item) => item.id === selectedItemId)) {
      setSelectedItemId(null);
    }
  }, [filteredItems, selectedItemId]);

  useEffect(() => {
    if (!isInboxItem(selectedItem) && inlineTriageId !== null) {
      setInlineTriageId((current) => (current === selectedItem?.id ? null : current));
    }
  }, [inlineTriageId, selectedItem]);

  const goToday = useCallback(() => setDate(format(new Date(), 'yyyy-MM-dd')), []);
  const goPrev = useCallback(() => setDate((value) => format(subDays(parseISO(value), 1), 'yyyy-MM-dd')), []);
  const goNext = useCallback(() => setDate((value) => format(addDays(parseISO(value), 1), 'yyyy-MM-dd')), []);

  const handleSelectItem = useCallback((item: ManagerDeskItem) => {
    setSelectedItemId(item.id);
    setInlineTriageId(!readOnly && item.status === 'inbox' ? item.id : null);
  }, [readOnly]);

  const handleQuickCapture = useCallback(
    (title: string, kind?: ManagerDeskItem['kind'], category?: ManagerDeskItem['category']) => {
      if (readOnly) {
        addToast('Historical views are read-only. Switch to today or a future date to add work.', 'info');
        return;
      }

      createItem.mutate(
        { date, title, kind, category },
        {
          onSuccess: (item) => {
            addToast(viewMode === 'planning' ? 'Planned item added' : 'Item captured', 'success');
            setSelectedItemId(item.id);
            setInlineTriageId(item.status === 'inbox' ? item.id : null);
          },
          onError: (err) => addToast(err.message, 'error'),
        },
      );
    },
    [addToast, createItem, date, readOnly, viewMode],
  );

  const handleUpdateItem = useCallback(
    (itemId: number, updates: Record<string, unknown>) => {
      if (readOnly) {
        addToast('Historical snapshots are read-only.', 'info');
        return;
      }

      updateItem.mutate(
        { itemId, ...updates } as Parameters<typeof updateItem.mutate>[0],
        {
          onSuccess: (item) => {
            if (item.status !== 'inbox') {
              setInlineTriageId((current) => (current === item.id ? null : current));
            }
          },
          onError: (err) => addToast(err.message, 'error'),
        },
      );
    },
    [addToast, readOnly, updateItem],
  );

  const handleDeleteItem = useCallback(
    (itemId: number) => {
      if (readOnly) {
        addToast('Historical snapshots are read-only.', 'info');
        return;
      }

      deleteItem.mutate(itemId, {
        onSuccess: () => {
          addToast('Item removed from desk', 'success');
          setSelectedItemId((current) => (current === itemId ? null : current));
          setInlineTriageId((current) => (current === itemId ? null : current));
        },
        onError: (err) => addToast(err.message, 'error'),
      });
    },
    [addToast, deleteItem, readOnly],
  );

  const handleCancelDelegatedTask = useCallback(
    (itemId: number) => {
      if (readOnly) {
        addToast('Historical snapshots are read-only.', 'info');
        return;
      }

      cancelDelegated.mutate(itemId, {
        onSuccess: () => {
          addToast('Delegated task cancelled', 'success');
        },
        onError: (err) => addToast(err.message, 'error'),
      });
    },
    [addToast, cancelDelegated, readOnly],
  );

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="md-glass-panel w-full max-w-md rounded-xl p-6 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(239,68,68,0.12)' }}>
            <Briefcase size={18} style={{ color: 'var(--danger)' }} />
          </div>
          <h2 className="mt-3 text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Failed to load Manager Desk
          </h2>
          <p className="mt-1.5 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
            {(error as Error).message}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 rounded-lg px-4 py-1.5 text-[12px] font-semibold"
            style={{ background: 'var(--md-accent)', color: '#000' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const dateObj = parseISO(date);
  const displayDate = format(dateObj, 'EEEE, MMMM d, yyyy');
  const hasStructuredFilters = filters.kind !== null || filters.category !== null || filters.status !== null;
  const hasAnyNarrowing = searchQuery.trim().length > 0 || quickFilter !== 'all' || hasStructuredFilters;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ManagerDeskHeader
        displayDate={displayDate}
        isTodayDate={isToday(dateObj)}
        isFetching={isFetching}
        viewMode={viewMode}
        onPrev={goPrev}
        onNext={goNext}
        onToday={goToday}
        onRefresh={() => void refetch()}
      />

      <div className="px-2 pt-2 md:px-3">
        <SummaryStrip summary={day?.summary ?? null} />
      </div>

      <div className="px-2 pt-2 md:px-3">
        <ViewModeBanner
          date={date}
          viewMode={viewMode}
          historySubview={historySubview}
          createdThatDayCount={day?.createdThatDayItems?.length ?? 0}
          onChangeHistorySubview={setHistorySubview}
        />
      </div>

      <ManagerDeskCommandBar
        items={sourceItems}
        searchQuery={searchQuery}
        quickFilter={quickFilter}
        filters={filters}
        showFilters={showFilters}
        isCreatePending={createItem.isPending}
        captureDisabled={readOnly}
        captureDisabledLabel="Historical views are review-only. Open today or a future date to add work."
        onSearchChange={setSearchQuery}
        onQuickFilterChange={setQuickFilter}
        onToggleFilters={() => setShowFilters((current) => !current)}
        onClearSearch={() => setSearchQuery('')}
        onClearFilters={() => setFilters(defaultFilters)}
        onChangeFilters={setFilters}
        onCapture={handleQuickCapture}
      />

      <div className="min-h-0 flex-1 overflow-hidden px-2 py-2 md:px-3">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div
              className="h-7 w-7 animate-spin rounded-full border-2 border-t-transparent"
              style={{ borderColor: 'var(--md-accent)', borderTopColor: 'transparent' }}
            />
          </div>
        ) : (
          <div className="grid h-full gap-2 lg:grid-cols-[200px_minmax(0,1fr)]">
            <TaskRail items={openItems} selectedItemId={selectedItemId} onSelect={handleSelectItem} />

            <div className="min-h-0 overflow-y-auto">
              <MotionConfig reducedMotion="user">
                {(sourceItems.length ?? 0) === 0 && !hasAnyNarrowing ? (
                  <EmptyDay date={displayDate} viewMode={viewMode} />
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={MANAGER_DESK_CARD_LAYOUT_TRANSITION}
                    className="space-y-2"
                  >
                    <div className="grid gap-2 xl:grid-cols-2">
                      <WorkbenchSection
                        title={viewMode === 'planning' ? 'Scheduled Work' : 'Focus'}
                        subtitle={
                          viewMode === 'planning'
                            ? 'Work intentionally planned for this date'
                            : 'Planned and in-progress work'
                        }
                        count={sections.focus.length}
                        accent="var(--md-accent)"
                        emptyMessage={
                          viewMode === 'planning'
                            ? 'No focused work is scheduled for this date.'
                            : 'No active work matches the current view.'
                        }
                      >
                        {sections.focus.map((item) => (
                          <DeskItemCard
                            key={item.id}
                            item={item}
                            onSelect={() => handleSelectItem(item)}
                            onStatusChange={readOnly ? undefined : (status) => handleUpdateItem(item.id, { status })}
                            readOnly={readOnly}
                          />
                        ))}
                      </WorkbenchSection>

                      <WorkbenchSection title="Waiting" subtitle="Blocked items and overdue follow-ups" count={sections.waiting.length} accent="var(--warning)" emptyMessage="Nothing is currently waiting on someone else.">
                        {sections.waiting.map((item) => (
                          <DeskItemCard
                            key={item.id}
                            item={item}
                            onSelect={() => handleSelectItem(item)}
                            onStatusChange={readOnly ? undefined : (status) => handleUpdateItem(item.id, { status })}
                            variant="waiting"
                            readOnly={readOnly}
                          />
                        ))}
                      </WorkbenchSection>

                      <WorkbenchSection title="Meetings" subtitle={viewMode === 'planning' ? 'Scheduled meetings for this date' : 'Time-bound conversations and sync points'} count={sections.meetings.length} accent="var(--info)" emptyMessage="No meetings match the current view.">
                        {sections.meetings.map((item) => (
                          <DeskItemCard
                            key={item.id}
                            item={item}
                            onSelect={() => handleSelectItem(item)}
                            onStatusChange={readOnly ? undefined : (status) => handleUpdateItem(item.id, { status })}
                            variant="meeting"
                            readOnly={readOnly}
                          />
                        ))}
                      </WorkbenchSection>

                      <WorkbenchSection
                        title={viewMode === 'history' && historySubview === 'created' ? 'Captured That Day' : 'Inbox'}
                        subtitle={
                          viewMode === 'history' && historySubview === 'created'
                            ? 'Items first captured on this date'
                            : 'Fresh captures waiting for triage'
                        }
                        count={sections.inbox.length}
                        accent="var(--text-muted)"
                        emptyMessage={viewMode === 'history' && historySubview === 'created' ? 'Nothing was first captured on this date.' : 'Inbox is clear.'}
                      >
                        {sections.inbox.map((item) => (
                          <div key={item.id} className="space-y-2">
                            <DeskItemCard
                              item={item}
                              onSelect={() => handleSelectItem(item)}
                              onStatusChange={readOnly ? undefined : (status) => handleUpdateItem(item.id, { status })}
                              variant="inbox"
                              readOnly={readOnly}
                            />
                            {!readOnly && inlineTriageId === item.id && (
                              <InboxTriageRow item={item} onUpdate={handleUpdateItem} />
                            )}
                          </div>
                        ))}
                      </WorkbenchSection>
                    </div>

                    <CompletedTray
                      items={sections.completed}
                      onSelect={handleSelectItem}
                      onStatusChange={readOnly ? undefined : (itemId, status) => handleUpdateItem(itemId, { status })}
                      readOnly={readOnly}
                    />
                  </motion.div>
                )}
              </MotionConfig>
            </div>
          </div>
        )}
      </div>

      <ItemDetailDrawer
        item={selectedItem}
        open={selectedItem !== null}
        date={date}
        readOnly={readOnly}
        onClose={() => setSelectedItemId(null)}
        onUpdate={handleUpdateItem}
        onDelete={handleDeleteItem}
        onCancelDelegatedTask={handleCancelDelegatedTask}
        isCancelDelegatedPending={cancelDelegated.isPending}
        topSlot={<DrawerModeNote viewMode={viewMode} date={date} />}
      />
    </div>
  );
}

function ViewModeBanner({
  date,
  viewMode,
  historySubview,
  createdThatDayCount,
  onChangeHistorySubview,
}: {
  date: string;
  viewMode: ManagerDeskViewMode;
  historySubview: HistorySubview;
  createdThatDayCount: number;
  onChangeHistorySubview: (value: HistorySubview) => void;
}) {
  if (viewMode === 'live') {
    return (
      <div className="md-glass-panel rounded-xl px-3 py-2 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
        Open manager work stays on this desk until you complete it or drop it. A new day changes the lens, not the task’s existence.
      </div>
    );
  }

  if (viewMode === 'planning') {
    return (
      <div className="md-glass-panel rounded-xl px-3 py-2">
        <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
          <CalendarClock size={13} style={{ color: 'var(--accent)' }} />
          Future dates use a lighter scheduling view. Only work explicitly relevant to {date} is shown here.
        </div>
      </div>
    );
  }

  return (
    <div className="md-glass-panel rounded-xl px-3 py-2">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
          <History size={13} style={{ color: 'var(--info)' }} />
          Past dates show a review-focused snapshot. This view is read-only.
        </div>
        <div className="ml-auto flex items-center gap-1 rounded-lg border p-1" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
          <HistoryToggleButton
            active={historySubview === 'snapshot'}
            label="End of Day"
            onClick={() => onChangeHistorySubview('snapshot')}
          />
          <HistoryToggleButton
            active={historySubview === 'created'}
            label={`Captured (${createdThatDayCount})`}
            onClick={() => onChangeHistorySubview('created')}
          />
        </div>
      </div>
    </div>
  );
}

function HistoryToggleButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]"
      style={{
        background: active ? 'var(--md-accent-glow)' : 'transparent',
        color: active ? 'var(--md-accent)' : 'var(--text-secondary)',
      }}
    >
      {label}
    </button>
  );
}

function DrawerModeNote({ viewMode, date }: { viewMode: ManagerDeskViewMode; date: string }) {
  if (viewMode === 'live') {
    return null;
  }

  return (
    <div
      className="mx-5 mt-4 rounded-xl border px-3 py-2 text-[11px]"
      style={{
        borderColor: viewMode === 'history' ? 'rgba(59,130,246,0.18)' : 'rgba(6,182,212,0.18)',
        background: viewMode === 'history' ? 'rgba(59,130,246,0.06)' : 'rgba(6,182,212,0.06)',
        color: 'var(--text-secondary)',
      }}
    >
      {viewMode === 'history'
        ? `Reviewing the ${date} snapshot. Changes are disabled here so the historical record stays easy to inspect.`
        : `Planning view for ${date}. Edit details here to schedule work without cluttering the future with the full live desk.`}
    </div>
  );
}
