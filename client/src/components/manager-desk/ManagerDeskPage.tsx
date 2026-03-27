import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { addDays, format, isToday, parseISO, subDays } from 'date-fns';
import { Briefcase } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import {
  useCarryForwardManagerDesk,
  useCancelDelegatedManagerDeskTask,
  useCreateManagerDeskItem,
  useDeleteManagerDeskItem,
  useManagerDesk,
  useManagerDeskCarryForwardContext,
  useUpdateManagerDeskItem,
} from '@/hooks/useManagerDesk';
import type { ManagerDeskItem } from '@/types/manager-desk';
import { CarryForwardDialog } from './CarryForwardDialog';
import { CarryForwardPrompt } from './CarryForwardPrompt';
import { CompletedTray } from './CompletedTray';
import { DeskItemCard } from './DeskItemCard';
import { EmptyDay } from './EmptyDay';
import { InboxTriageRow } from './InboxTriageRow';
import { ItemDetailDrawer } from './ItemDetailDrawer';
import { ManagerDeskCommandBar } from './ManagerDeskCommandBar';
import { ManagerDeskHeader } from './ManagerDeskHeader';
import { TaskRail } from './TaskRail';
import { WorkbenchSection } from './WorkbenchSection';
import {
  buildSections,
  filterItems,
  getOpenItems,
  isInboxItem,
  type ManagerDeskFilterState,
  type ManagerDeskQuickFilter,
} from './workbench-utils';

// ── Session-scoped carry-forward prompt helpers ─────────

function getCarryForwardPromptKey(date: string, sourceDate: string | null): string {
  return `manager-desk:carry-forward-prompt:${date}:${sourceDate ?? 'none'}`;
}

function readCarryForwardPromptState(date: string, sourceDate: string | null): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(getCarryForwardPromptKey(date, sourceDate)) === 'dismissed';
  } catch {
    return false;
  }
}

function writeCarryForwardPromptState(date: string, sourceDate: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(getCarryForwardPromptKey(date, sourceDate), 'dismissed');
  } catch {
    // Ignore — prompt will reappear next visit
  }
}

// ── Constants ───────────────────────────────────────────

const defaultFilters: ManagerDeskFilterState = { kind: null, category: null, status: null };

export function ManagerDeskPage() {
  const { addToast } = useToast();
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [inlineTriageId, setInlineTriageId] = useState<number | null>(null);
  const [showCarryForward, setShowCarryForward] = useState(false);
  const [carryDialogMode, setCarryDialogMode] = useState<'smart' | 'header'>('header');
  const [carryPromptDismissed, setCarryPromptDismissed] = useState(false);
  const [filters, setFilters] = useState<ManagerDeskFilterState>(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState<ManagerDeskQuickFilter>('all');
  const { data: day, isLoading, isFetching, error, refetch } = useManagerDesk(date);
  const createItem = useCreateManagerDeskItem(date);
  const updateItem = useUpdateManagerDeskItem(date);
  const deleteItem = useDeleteManagerDeskItem(date);
  const cancelDelegated = useCancelDelegatedManagerDeskTask(date);
  const carryForward = useCarryForwardManagerDesk(date);

  // Previous-day continuity
  const previousDate = useMemo(() => format(subDays(parseISO(date), 1), 'yyyy-MM-dd'), [date]);
  const nextDate = useMemo(() => format(addDays(parseISO(date), 1), 'yyyy-MM-dd'), [date]);
  const smartCarryContext = useManagerDeskCarryForwardContext(date);
  const smartSourceDate = smartCarryContext.data?.fromDate ?? null;
  const carryableFromEarlierDay = smartCarryContext.data?.carryable ?? 0;

  // Reset prompt state when date changes
  useEffect(() => {
    setCarryPromptDismissed(readCarryForwardPromptState(date, smartSourceDate));
  }, [date, smartSourceDate]);

  const dismissCarryForwardPrompt = useCallback(() => {
    writeCarryForwardPromptState(date, smartSourceDate);
    setCarryPromptDismissed(true);
  }, [date, smartSourceDate]);

  const showCarryForwardPrompt =
    !carryPromptDismissed &&
    !smartCarryContext.isLoading &&
    !smartCarryContext.isError &&
    carryableFromEarlierDay > 0 &&
    smartSourceDate !== null;

  const filteredItems = useMemo(
    () => filterItems(day?.items ?? [], searchQuery, quickFilter, filters),
    [day?.items, searchQuery, quickFilter, filters],
  );
  const sections = useMemo(() => buildSections(filteredItems), [filteredItems]);
  const openItems = useMemo(() => getOpenItems(filteredItems), [filteredItems]);
  const hasCurrentCarryableItems = useMemo(
    () => (day?.items ?? []).some((item) => item.status !== 'done' && item.status !== 'cancelled'),
    [day?.items],
  );
  const canHeaderCarry = hasCurrentCarryableItems || carryableFromEarlierDay > 0;
  const selectedItem = useMemo(
    () => filteredItems.find((item) => item.id === selectedItemId) ?? null,
    [filteredItems, selectedItemId],
  );

  // Clear selection if the selected item is no longer in the filtered list
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
    setInlineTriageId(item.status === 'inbox' ? item.id : null);
  }, []);

  const handleQuickCapture = useCallback(
    (title: string, kind?: ManagerDeskItem['kind'], category?: ManagerDeskItem['category']) => {
      createItem.mutate(
        { date, title, kind, category },
        {
          onSuccess: (item) => {
            addToast('Item captured', 'success');
            setSelectedItemId(item.id);
            setInlineTriageId(item.id);
          },
          onError: (err) => addToast(err.message, 'error'),
        },
      );
    },
    [addToast, createItem, date],
  );

  const handleUpdateItem = useCallback(
    (itemId: number, updates: Record<string, unknown>) => {
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
    [addToast, updateItem],
  );

  const handleDeleteItem = useCallback(
    (itemId: number) => {
      deleteItem.mutate(itemId, {
        onSuccess: () => {
          addToast('Item removed from desk', 'success');
          setSelectedItemId((current) => (current === itemId ? null : current));
          setInlineTriageId((current) => (current === itemId ? null : current));
        },
        onError: (err) => addToast(err.message, 'error'),
      });
    },
    [addToast, deleteItem],
  );

  const handleCancelDelegatedTask = useCallback(
    (itemId: number) => {
      cancelDelegated.mutate(itemId, {
        onSuccess: () => {
          addToast('Delegated task cancelled', 'success');
        },
        onError: (err) => addToast(err.message, 'error'),
      });
    },
    [addToast, cancelDelegated],
  );

  const handleCarryForward = useCallback(
    (toDate: string, itemIds?: number[]) => {
      const fromDate = carryDialogMode === 'smart' ? smartSourceDate ?? previousDate : date;
      carryForward.mutate(
        { fromDate, toDate, itemIds },
        {
          onSuccess: (res) => {
            addToast(res.created === 0 ? 'Nothing new was carried forward' : `${res.created} item(s) carried forward`, res.created === 0 ? 'info' : 'success');
            setShowCarryForward(false);
            if (carryDialogMode === 'smart') {
              dismissCarryForwardPrompt();
            }
          },
          onError: (err) => addToast(err.message, 'error'),
        },
      );
    },
    [addToast, carryDialogMode, carryForward, date, dismissCarryForwardPrompt, previousDate, smartSourceDate],
  );

  const handleCarryForwardItem = useCallback(
    (item: ManagerDeskItem) => {
      const toDate = format(addDays(parseISO(date), 1), 'yyyy-MM-dd');
      carryForward.mutate(
        { fromDate: date, toDate, itemIds: [item.id] },
        {
          onSuccess: (res) => addToast(res.created === 0 ? 'Task already carried forward' : 'Task carried forward', res.created === 0 ? 'info' : 'success'),
          onError: (err) => addToast(err.message, 'error'),
        },
      );
    },
    [addToast, carryForward, date],
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
        canCarryForward={canHeaderCarry}
        onPrev={goPrev}
        onNext={goNext}
        onToday={goToday}
        onRefresh={() => void refetch()}
        onCarryForward={() => {
          setCarryDialogMode(hasCurrentCarryableItems ? 'header' : 'smart');
          setShowCarryForward(true);
        }}
      />

      {showCarryForwardPrompt && (
        <div className="px-2 pt-1 md:px-3">
          <CarryForwardPrompt
            carryableCount={carryableFromEarlierDay}
            sourceDate={smartSourceDate ?? previousDate}
            viewedDate={date}
            isPending={carryForward.isPending}
            onReviewAndCarry={() => { setCarryDialogMode('smart'); setShowCarryForward(true); }}
            onDismiss={dismissCarryForwardPrompt}
          />
        </div>
      )}

      <ManagerDeskCommandBar
        items={day?.items ?? []}
        searchQuery={searchQuery}
        quickFilter={quickFilter}
        filters={filters}
        showFilters={showFilters}
        isCreatePending={createItem.isPending}
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
              {(day?.items.length ?? 0) === 0 && !hasAnyNarrowing ? (
                <EmptyDay date={displayDate} />
              ) : (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                  <div className="grid gap-2 xl:grid-cols-2">
                    <WorkbenchSection title="Focus" subtitle="Planned and in-progress work" count={sections.focus.length} accent="var(--md-accent)" emptyMessage="No active work matches the current view.">
                      {sections.focus.map((item) => (
                        <DeskItemCard
                          key={item.id}
                          item={item}
                          onSelect={() => handleSelectItem(item)}
                          onStatusChange={(status) => handleUpdateItem(item.id, { status })}
                        />
                      ))}
                    </WorkbenchSection>

                    <WorkbenchSection title="Waiting" subtitle="Blocked items and overdue follow-ups" count={sections.waiting.length} accent="var(--warning)" emptyMessage="Nothing is currently waiting on someone else.">
                      {sections.waiting.map((item) => (
                        <DeskItemCard
                          key={item.id}
                          item={item}
                          onSelect={() => handleSelectItem(item)}
                          onStatusChange={(status) => handleUpdateItem(item.id, { status })}
                          variant="waiting"
                        />
                      ))}
                    </WorkbenchSection>

                    <WorkbenchSection title="Meetings" subtitle="Time-bound conversations and sync points" count={sections.meetings.length} accent="var(--info)" emptyMessage="No meetings match the current view.">
                      {sections.meetings.map((item) => (
                        <DeskItemCard
                          key={item.id}
                          item={item}
                          onSelect={() => handleSelectItem(item)}
                          onStatusChange={(status) => handleUpdateItem(item.id, { status })}
                          variant="meeting"
                        />
                      ))}
                    </WorkbenchSection>

                    <WorkbenchSection title="Inbox" subtitle="Fresh captures waiting for triage" count={sections.inbox.length} accent="var(--text-muted)" emptyMessage="Inbox is clear.">
                      {sections.inbox.map((item) => (
                        <div key={item.id} className="space-y-2">
                          <DeskItemCard
                            item={item}
                            onSelect={() => handleSelectItem(item)}
                            onStatusChange={(status) => handleUpdateItem(item.id, { status })}
                            variant="inbox"
                          />
                          {inlineTriageId === item.id && (
                            <InboxTriageRow item={item} onUpdate={handleUpdateItem} />
                          )}
                        </div>
                      ))}
                    </WorkbenchSection>
                  </div>

                  <CompletedTray
                    items={sections.completed}
                    onSelect={handleSelectItem}
                    onStatusChange={(itemId, status) => handleUpdateItem(itemId, { status })}
                  />
                </motion.div>
              )}
            </div>
          </div>
        )}
      </div>

      <ItemDetailDrawer
        item={selectedItem}
        open={selectedItem !== null}
        date={date}
        onClose={() => setSelectedItemId(null)}
        onUpdate={handleUpdateItem}
        onDelete={handleDeleteItem}
        onCancelDelegatedTask={handleCancelDelegatedTask}
        isCancelDelegatedPending={cancelDelegated.isPending}
        onCarryForward={selectedItem ? () => handleCarryForwardItem(selectedItem) : undefined}
        isCarryForwardPending={carryForward.isPending}
      />

      {showCarryForward && (
        <CarryForwardDialog
          fromDate={carryDialogMode === 'smart' ? smartSourceDate ?? previousDate : date}
          toDate={carryDialogMode === 'smart' ? date : nextDate}
          allowDateChange={carryDialogMode === 'header'}
          isPending={carryForward.isPending}
          onConfirm={handleCarryForward}
          onClose={() => setShowCarryForward(false)}
        />
      )}
    </div>
  );
}
