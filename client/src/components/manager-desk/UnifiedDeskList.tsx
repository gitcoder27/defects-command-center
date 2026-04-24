import { CheckCircle2, Clock3, ListChecks, Sparkles } from 'lucide-react';
import type { ManagerDeskItem, ManagerDeskStatus } from '@/types/manager-desk';
import { DeskItemCard } from './DeskItemCard';
import {
  getCardVariant,
  lensCopy,
  SignalChip,
  UnifiedEmptyState,
} from './UnifiedDeskListPrimitives';
import type { ManagerDeskQuickFilter } from './workbench-utils';

interface Props {
  items: ManagerDeskItem[];
  totalOpenCount: number;
  completedCount: number;
  continuedOpenCount: number;
  quickFilter: ManagerDeskQuickFilter;
  selectedItemId: number | null;
  readOnly?: boolean;
  viewMode: 'live' | 'history' | 'planning';
  onSelect: (item: ManagerDeskItem) => void;
  onStatusChange?: (itemId: number, status: ManagerDeskStatus) => void;
}

export function UnifiedDeskList({
  items,
  totalOpenCount,
  completedCount,
  continuedOpenCount,
  quickFilter,
  selectedItemId,
  readOnly = false,
  viewMode,
  onSelect,
  onStatusChange,
}: Props) {
  const copy = lensCopy[quickFilter];
  const visibleTitle = viewMode === 'planning' && quickFilter === 'all' ? 'Scheduled Work' : copy.title;
  const visibleSubtitle = viewMode === 'planning' && quickFilter === 'all'
    ? 'Work intentionally planned for this date.'
    : copy.subtitle;

  return (
    <section className="md-glass-panel flex min-h-full flex-col rounded-xl">
      <div className="border-b px-3 py-3" style={{ borderColor: 'var(--border)' }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-lg"
                style={{ background: 'var(--md-accent-glow)', color: 'var(--md-accent)' }}
              >
                {quickFilter === 'attention' ? <Sparkles size={14} /> : <ListChecks size={14} />}
              </span>
              <div>
                <h2 className="text-[14px] font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
                  {visibleTitle}
                </h2>
                <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  {visibleSubtitle}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <SignalChip icon={<ListChecks size={10} />} label="Open" value={totalOpenCount} tone="accent" />
            {continuedOpenCount > 0 && quickFilter !== 'done' && (
              <SignalChip icon={<Clock3 size={10} />} label="Continued" value={continuedOpenCount} tone="muted" />
            )}
            <SignalChip icon={<CheckCircle2 size={10} />} label="Done" value={completedCount} tone="success" />
          </div>
        </div>

        {continuedOpenCount > 0 && quickFilter !== 'done' && (
          <div
            className="mt-2 rounded-lg border px-3 py-2 text-[11px]"
            style={{
              borderColor: 'rgba(217,169,78,0.18)',
              background: 'color-mix(in srgb, var(--md-accent-glow) 62%, transparent)',
              color: 'var(--text-secondary)',
            }}
          >
            {continuedOpenCount} open {continuedOpenCount === 1 ? 'item has' : 'items have'} continued from earlier days.
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {items.length === 0 ? (
          <UnifiedEmptyState quickFilter={quickFilter} message={copy.empty} />
        ) : (
          <div className="space-y-1.5">
            {items.map((item) => (
              <div key={item.id}>
                <DeskItemCard
                  item={item}
                  onSelect={() => onSelect(item)}
                  onStatusChange={onStatusChange ? (status) => onStatusChange(item.id, status) : undefined}
                  variant={getCardVariant(item)}
                  selected={item.id === selectedItemId}
                  readOnly={readOnly}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
