import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { format, addDays, subDays, isToday, parseISO } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Briefcase,
  ArrowRightFromLine,
  RefreshCw,
  Filter,
  X,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import {
  useManagerDesk,
  useCreateManagerDeskItem,
  useUpdateManagerDeskItem,
  useDeleteManagerDeskItem,
  useCarryForwardManagerDesk,
} from '@/hooks/useManagerDesk';
import type {
  ManagerDeskItem,
  ManagerDeskItemKind,
  ManagerDeskCategory,
  ManagerDeskStatus,
} from '@/types/manager-desk';
import { QuickCapture } from './QuickCapture';
import { SummaryStrip } from './SummaryStrip';
import { DeskSection } from './DeskSection';
import { DeskItemCard } from './DeskItemCard';
import { ItemDetailDrawer } from './ItemDetailDrawer';
import { CarryForwardDialog } from './CarryForwardDialog';
import { EmptyDay } from './EmptyDay';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

type FilterState = {
  kind: ManagerDeskItemKind | null;
  category: ManagerDeskCategory | null;
  status: ManagerDeskStatus | null;
};

export function ManagerDeskPage() {
  const { addToast } = useToast();

  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [showCarryForward, setShowCarryForward] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ kind: null, category: null, status: null });
  const [showFilters, setShowFilters] = useState(false);

  const { data: day, isLoading, isFetching, error, refetch } = useManagerDesk(date);
  const createItem = useCreateManagerDeskItem(date);
  const updateItem = useUpdateManagerDeskItem(date);
  const deleteItem = useDeleteManagerDeskItem(date);
  const carryForward = useCarryForwardManagerDesk(date);

  const goToday = useCallback(() => setDate(format(new Date(), 'yyyy-MM-dd')), []);
  const goPrev = useCallback(() => setDate(d => format(subDays(parseISO(d), 1), 'yyyy-MM-dd')), []);
  const goNext = useCallback(() => setDate(d => format(addDays(parseISO(d), 1), 'yyyy-MM-dd')), []);

  const selectedItem = useMemo(
    () => day?.items.find(i => i.id === selectedItemId) ?? null,
    [day?.items, selectedItemId],
  );

  const hasActiveFilters = filters.kind !== null || filters.category !== null || filters.status !== null;

  const filteredItems = useMemo(() => {
    if (!day?.items) return [];
    return day.items.filter(item => {
      if (filters.kind && item.kind !== filters.kind) return false;
      if (filters.category && item.category !== filters.category) return false;
      if (filters.status && item.status !== filters.status) return false;
      return true;
    });
  }, [day?.items, filters]);

  // Group filtered items by operational section
  const sections = useMemo(() => {
    const inbox: ManagerDeskItem[] = [];
    const active: ManagerDeskItem[] = [];
    const meetings: ManagerDeskItem[] = [];
    const waiting: ManagerDeskItem[] = [];
    const completed: ManagerDeskItem[] = [];

    for (const item of filteredItems) {
      if (item.status === 'done' || item.status === 'cancelled') {
        completed.push(item);
      } else if (item.status === 'inbox') {
        inbox.push(item);
      } else if (item.kind === 'meeting') {
        meetings.push(item);
      } else if (item.status === 'waiting' || item.kind === 'waiting') {
        waiting.push(item);
      } else {
        active.push(item);
      }
    }

    // Sort active by priority weight
    const prioWeight = { critical: 0, high: 1, medium: 2, low: 3 };
    active.sort((a, b) => prioWeight[a.priority] - prioWeight[b.priority]);
    meetings.sort((a, b) => (a.plannedStartAt ?? '').localeCompare(b.plannedStartAt ?? ''));

    return { inbox, active, meetings, waiting, completed };
  }, [filteredItems]);

  const handleQuickCapture = useCallback(
    (title: string, kind?: ManagerDeskItemKind, category?: ManagerDeskCategory) => {
      createItem.mutate(
        { date, title, kind, category },
        {
          onSuccess: () => addToast('Item captured', 'success'),
          onError: (err) => addToast(err.message, 'error'),
        },
      );
    },
    [createItem, date, addToast],
  );

  const handleUpdateItem = useCallback(
    (itemId: number, updates: Record<string, unknown>) => {
      updateItem.mutate(
        { itemId, ...updates } as Parameters<typeof updateItem.mutate>[0],
        {
          onError: (err) => addToast(err.message, 'error'),
        },
      );
    },
    [updateItem, addToast],
  );

  const handleDeleteItem = useCallback(
    (itemId: number) => {
      deleteItem.mutate(itemId, {
        onSuccess: () => {
          addToast('Item deleted', 'success');
          if (selectedItemId === itemId) setSelectedItemId(null);
        },
        onError: (err) => addToast(err.message, 'error'),
      });
    },
    [deleteItem, addToast, selectedItemId],
  );

  const handleCarryForward = useCallback(
    (toDate: string, itemIds?: number[]) => {
      carryForward.mutate(
        { fromDate: date, toDate, itemIds },
        {
          onSuccess: (res) => {
            if (res.created === 0) {
              addToast('Nothing new was carried forward', 'info', 'Selected items may already exist on the target date.');
            } else {
              addToast(`${res.created} item(s) carried forward`, 'success');
            }
            setShowCarryForward(false);
          },
          onError: (err) => addToast(err.message, 'error'),
        },
      );
    },
    [carryForward, date, addToast],
  );

  const handleCarryForwardItem = useCallback(
    (item: ManagerDeskItem) => {
      const targetDate = format(addDays(parseISO(date), 1), 'yyyy-MM-dd');
      carryForward.mutate(
        { fromDate: date, toDate: targetDate, itemIds: [item.id] },
        {
          onSuccess: (res) => {
            if (res.created === 0) {
              addToast('Task already carried forward', 'info', `"${item.title}" is already on ${targetDate}.`);
            } else {
              addToast('Task carried forward', 'success', `"${item.title}" moved to ${targetDate}.`);
            }
          },
          onError: (err) => addToast(err.message, 'error'),
        },
      );
    },
    [addToast, carryForward, date],
  );

  const clearFilters = useCallback(() => setFilters({ kind: null, category: null, status: null }), []);

  const dateObj = parseISO(date);
  const isTodayDate = isToday(dateObj);
  const displayDate = format(dateObj, 'EEEE, MMMM d, yyyy');

  // Carry-forwardable items
  const carryableItems = useMemo(
    () => (day?.items ?? []).filter(i => i.status !== 'done' && i.status !== 'cancelled'),
    [day?.items],
  );

  // ── Error state ────────────────────────────────
  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-6" style={{ background: 'var(--bg-canvas)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full rounded-2xl p-8 text-center"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
        >
          <div
            className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(239,68,68,0.12)' }}
          >
            <Briefcase size={22} style={{ color: 'var(--danger)' }} />
          </div>
          <h2 className="text-[17px] font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
            Failed to load Manager Desk
          </h2>
          <p className="text-[13px] mb-5" style={{ color: 'var(--text-secondary)' }}>
            {(error as Error).message}
          </p>
          <button
            onClick={() => refetch()}
            className="px-5 py-2 rounded-xl text-[13px] font-medium transition-all"
            style={{ background: 'var(--md-accent)', color: '#000' }}
          >
            Retry
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: 'transparent' }}>
      {/* ── Page header ─────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="shrink-0 px-3 pt-3 pb-1 md:px-4"
      >
        <div
          className="md-header-panel rounded-[14px] px-3 py-2 md:px-4 md:py-2.5 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between"
        >
          {/* Left: branding + date nav */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--md-accent-glow)', color: 'var(--md-accent)' }}
            >
              <Briefcase size={17} />
            </div>
            <div className="min-w-0">
              <h1
                className="text-[17px] font-semibold tracking-[-0.01em] truncate"
                style={{ color: 'var(--text-primary)' }}
              >
                Manager Desk
              </h1>
              <div className="text-[11px] font-medium" style={{ color: 'var(--md-accent)' }}>
                Private workspace
              </div>
            </div>

            {/* Date controls */}
            <div
              className="flex items-center rounded-xl p-0.5 gap-0.5 ml-2"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
            >
              <button
                onClick={goPrev}
                className="h-7 w-7 rounded-lg flex items-center justify-center transition-colors hover:opacity-80"
                style={{ color: 'var(--text-secondary)' }}
                title="Previous day"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={goToday}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold tracking-wide transition-colors"
                style={{
                  background: isTodayDate ? 'var(--md-accent-glow)' : 'transparent',
                  color: isTodayDate ? 'var(--md-accent)' : 'var(--text-secondary)',
                }}
                title="Go to today"
              >
                <CalendarDays size={11} />
                {isTodayDate ? 'Today' : 'Today'}
              </button>
              <button
                onClick={goNext}
                className="h-7 w-7 rounded-lg flex items-center justify-center transition-colors hover:opacity-80"
                style={{ color: 'var(--text-secondary)' }}
                title="Next day"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            <span
              className="hidden md:inline text-[13px] font-medium ml-1 truncate"
              style={{ color: 'var(--text-secondary)' }}
            >
              {displayDate}
            </span>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1.5 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors disabled:opacity-50"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
              aria-label="Refresh manager desk"
              title="Refresh manager desk"
            >
              <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
              Refresh
            </button>

            {carryableItems.length > 0 && (
              <button
                onClick={() => setShowCarryForward(true)}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--md-accent)',
                  border: '1px solid var(--border)',
                }}
                title="Carry unfinished items forward"
              >
                <ArrowRightFromLine size={12} />
                Carry Forward
              </button>
            )}

            <button
              onClick={() => setShowFilters(f => !f)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors"
              style={{
                background: hasActiveFilters ? 'var(--md-accent-glow)' : 'var(--bg-tertiary)',
                color: hasActiveFilters ? 'var(--md-accent)' : 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
              title="Filter items"
            >
              <Filter size={12} />
              {hasActiveFilters ? 'Filtered' : 'Filter'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Filter bar ──────────────────────────── */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="shrink-0 px-2 md:px-3"
        >
          <FilterBar filters={filters} onChange={setFilters} onClear={clearFilters} />
        </motion.div>
      )}

      {/* ── Content ─────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2 md:px-3 md:pb-3">
        <div className="max-w-[1400px] mx-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <div
                className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: 'var(--md-accent)', borderTopColor: 'transparent' }}
              />
            </div>
          ) : (
            <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-2 pt-2">
              {/* Summary */}
              <motion.div variants={fadeUp}>
                <SummaryStrip summary={day?.summary ?? null} />
              </motion.div>

              {/* Quick Capture */}
              <motion.div variants={fadeUp}>
                <QuickCapture
                  onCapture={handleQuickCapture}
                  isPending={createItem.isPending}
                />
              </motion.div>

              {/* Empty day shortcut */}
              {(day?.items.length ?? 0) === 0 && !hasActiveFilters ? (
                <motion.div variants={fadeUp}>
                  <EmptyDay date={displayDate} />
                </motion.div>
              ) : (
                <>
                  {/* Active / Planned */}
                  <motion.div variants={fadeUp}>
                    <DeskSection
                      title="Focus"
                      subtitle="Planned & in progress"
                      count={sections.active.length}
                      accentVar="var(--md-accent)"
                      emptyMessage="No active work items for this day"
                    >
                      {sections.active.map(item => (
                        <DeskItemCard
                          key={item.id}
                          item={item}
                          onSelect={() => setSelectedItemId(item.id)}
                          onStatusChange={(status) => handleUpdateItem(item.id, { status })}
                          onCarryForward={() => handleCarryForwardItem(item)}
                          isCarryForwardPending={carryForward.isPending}
                        />
                      ))}
                    </DeskSection>
                  </motion.div>

                  {/* Meetings */}
                  <motion.div variants={fadeUp}>
                    <DeskSection
                      title="Meetings"
                      subtitle="Conversations & syncs"
                      count={sections.meetings.length}
                      accentVar="var(--info)"
                      emptyMessage="No meetings scheduled"
                    >
                      {sections.meetings.map(item => (
                        <DeskItemCard
                          key={item.id}
                          item={item}
                          onSelect={() => setSelectedItemId(item.id)}
                          onStatusChange={(status) => handleUpdateItem(item.id, { status })}
                          onCarryForward={() => handleCarryForwardItem(item)}
                          isCarryForwardPending={carryForward.isPending}
                          variant="meeting"
                        />
                      ))}
                    </DeskSection>
                  </motion.div>

                  {/* Waiting / Follow-Up */}
                  <motion.div variants={fadeUp}>
                    <DeskSection
                      title="Waiting"
                      subtitle="Blocked & follow-ups"
                      count={sections.waiting.length}
                      accentVar="var(--warning)"
                      emptyMessage="Nothing waiting on others"
                    >
                      {sections.waiting.map(item => (
                        <DeskItemCard
                          key={item.id}
                          item={item}
                          onSelect={() => setSelectedItemId(item.id)}
                          onStatusChange={(status) => handleUpdateItem(item.id, { status })}
                          onCarryForward={() => handleCarryForwardItem(item)}
                          isCarryForwardPending={carryForward.isPending}
                          variant="waiting"
                        />
                      ))}
                    </DeskSection>
                  </motion.div>

                  {/* Inbox */}
                  <motion.div variants={fadeUp}>
                    <DeskSection
                      title="Inbox"
                      subtitle="Captured, not yet organized"
                      count={sections.inbox.length}
                      accentVar="var(--text-muted)"
                      emptyMessage="Inbox is clear"
                    >
                      {sections.inbox.map(item => (
                        <DeskItemCard
                          key={item.id}
                          item={item}
                          onSelect={() => setSelectedItemId(item.id)}
                          onStatusChange={(status) => handleUpdateItem(item.id, { status })}
                          onCarryForward={() => handleCarryForwardItem(item)}
                          isCarryForwardPending={carryForward.isPending}
                          variant="inbox"
                        />
                      ))}
                    </DeskSection>
                  </motion.div>

                  {/* Completed */}
                  <motion.div variants={fadeUp}>
                    <DeskSection
                      title="Completed"
                      subtitle="Done & cancelled"
                      count={sections.completed.length}
                      accentVar="var(--success)"
                      emptyMessage="Nothing completed yet"
                      defaultCollapsed
                    >
                      {sections.completed.map(item => (
                        <DeskItemCard
                          key={item.id}
                          item={item}
                          onSelect={() => setSelectedItemId(item.id)}
                          onStatusChange={(status) => handleUpdateItem(item.id, { status })}
                          variant="completed"
                        />
                      ))}
                    </DeskSection>
                  </motion.div>
                </>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Item detail drawer ──────────────────── */}
      <ItemDetailDrawer
        item={selectedItem}
        open={selectedItem !== null}
        date={date}
        onClose={() => setSelectedItemId(null)}
        onUpdate={handleUpdateItem}
        onDelete={handleDeleteItem}
      />

      {/* ── Carry forward dialog ────────────────── */}
      {showCarryForward && (
        <CarryForwardDialog
          items={carryableItems}
          fromDate={date}
          isPending={carryForward.isPending}
          onConfirm={handleCarryForward}
          onClose={() => setShowCarryForward(false)}
        />
      )}
    </div>
  );
}

// ── Inline filter bar ─────────────────────────────────

function FilterBar({
  filters,
  onChange,
  onClear,
}: {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  onClear: () => void;
}) {
  const kinds: ManagerDeskItemKind[] = ['action', 'meeting', 'decision', 'waiting'];
  const categories: ManagerDeskCategory[] = [
    'analysis', 'design', 'team_management', 'cross_team',
    'follow_up', 'escalation', 'admin', 'planning', 'other',
  ];
  const statuses: ManagerDeskStatus[] = ['inbox', 'planned', 'in_progress', 'waiting', 'done', 'cancelled'];

  return (
    <div
      className="rounded-xl px-3 py-2 mt-1.5 flex flex-wrap items-center gap-2"
      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
    >
      <span className="text-[10px] uppercase font-bold tracking-widest" style={{ color: 'var(--text-muted)' }}>
        Filters
      </span>

      <FilterPills
        label="Kind"
        options={kinds}
        value={filters.kind}
        onSelect={v => onChange({ ...filters, kind: v === filters.kind ? null : v })}
        display={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
      />

      <div className="w-px h-4" style={{ background: 'var(--border)' }} />

      <FilterPills
        label="Category"
        options={categories}
        value={filters.category}
        onSelect={v => onChange({ ...filters, category: v === filters.category ? null : v })}
        display={(v) => v.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
      />

      <div className="w-px h-4" style={{ background: 'var(--border)' }} />

      <FilterPills
        label="Status"
        options={statuses}
        value={filters.status}
        onSelect={v => onChange({ ...filters, status: v === filters.status ? null : v })}
        display={(v) => v.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
      />

      <button
        onClick={onClear}
        className="ml-auto flex items-center gap-1 text-[10px] font-medium rounded-md px-2 py-1 transition-colors"
        style={{ color: 'var(--text-muted)' }}
      >
        <X size={10} /> Clear
      </button>
    </div>
  );
}

function FilterPills<T extends string>({
  label,
  options,
  value,
  onSelect,
  display,
}: {
  label: string;
  options: T[];
  value: T | null;
  onSelect: (v: T) => void;
  display: (v: T) => string;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] font-medium mr-0.5" style={{ color: 'var(--text-muted)' }}>
        {label}:
      </span>
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onSelect(opt)}
          className="rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-all"
          style={{
            background: value === opt ? 'var(--md-accent-glow)' : 'var(--bg-tertiary)',
            color: value === opt ? 'var(--md-accent)' : 'var(--text-muted)',
            border: value === opt ? '1px solid var(--md-accent)' : '1px solid transparent',
          }}
        >
          {display(opt)}
        </button>
      ))}
    </div>
  );
}
