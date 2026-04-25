import type { ManagerDeskItem, ManagerDeskStatus } from '@/types/manager-desk';
import { DeskItemCard } from './DeskItemCard';
import {
  getCardVariant,
  lensCopy,
  UnifiedEmptyState,
} from './UnifiedDeskListPrimitives';
import type { ManagerDeskQuickFilter } from './workbench-utils';

interface Props {
  items: ManagerDeskItem[];
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
  const showSubtitle = quickFilter !== 'all' || viewMode !== 'live';

  return (
    <section className="md-glass-panel flex min-h-full flex-col rounded-xl">
      <div className="border-b px-3 py-2.5" style={{ borderColor: 'var(--border)' }}>
        <div className="flex min-h-7 flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h2 className="text-[13px] font-semibold leading-none tracking-[-0.01em]" style={{ color: 'var(--text-primary)' }}>
              {visibleTitle}
            </h2>
            <span
              className="inline-flex h-5 items-center rounded-md border px-1.5 font-mono text-[10px] font-semibold tabular-nums"
              style={{
                borderColor: 'var(--border)',
                background: 'color-mix(in srgb, var(--bg-secondary) 86%, transparent)',
                color: 'var(--text-secondary)',
              }}
            >
              {items.length}
            </span>
            {continuedOpenCount > 0 && quickFilter !== 'done' && (
              <span
                className="inline-flex h-5 items-center rounded-md border px-1.5 text-[10px] font-medium"
                title={`${continuedOpenCount} open ${continuedOpenCount === 1 ? 'item has' : 'items have'} continued from earlier days.`}
                style={{
                  borderColor: 'rgba(217,169,78,0.18)',
                  background: 'color-mix(in srgb, var(--md-accent-glow) 30%, transparent)',
                  color: 'color-mix(in srgb, var(--md-accent) 82%, var(--text-secondary))',
                }}
              >
                {continuedOpenCount} from earlier
              </span>
            )}
            {showSubtitle && (
              <span className="hidden max-w-[48ch] truncate text-[11px] md:inline" style={{ color: 'var(--text-muted)' }}>
                {visibleSubtitle}
              </span>
            )}
          </div>
        </div>
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
