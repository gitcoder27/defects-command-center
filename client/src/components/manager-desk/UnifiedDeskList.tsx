import type { ManagerDeskItem, ManagerDeskStatus } from '@/types/manager-desk';
import { DeskRhythmList } from './DeskRhythmList';
import { DeskCardRow, DeskRhythmHeader } from './DeskRhythmListPrimitives';
import { lensCopy, UnifiedEmptyState } from './UnifiedDeskListPrimitives';
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
  if (quickFilter === 'all') {
    return (
      <DeskRhythmList
        items={items}
        continuedOpenCount={continuedOpenCount}
        selectedItemId={selectedItemId}
        readOnly={readOnly}
        viewMode={viewMode}
        onSelect={onSelect}
        onStatusChange={onStatusChange}
      />
    );
  }

  return (
    <SingleLensList
      items={items}
      quickFilter={quickFilter}
      selectedItemId={selectedItemId}
      readOnly={readOnly}
      viewMode={viewMode}
      onSelect={onSelect}
      onStatusChange={onStatusChange}
    />
  );
}

function SingleLensList({
  items,
  quickFilter,
  selectedItemId,
  readOnly,
  viewMode,
  onSelect,
  onStatusChange,
}: Omit<Props, 'continuedOpenCount'>) {
  const copy = lensCopy[quickFilter];
  const visibleTitle = viewMode === 'planning' && quickFilter === 'planned' ? 'Scheduled work' : copy.title;

  return (
    <section className="md-glass-panel flex min-h-full flex-col overflow-hidden rounded-xl">
      <DeskRhythmHeader title={visibleTitle} subtitle={copy.subtitle} count={items.length} />
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {items.length === 0 ? (
          <UnifiedEmptyState quickFilter={quickFilter} message={copy.empty} />
        ) : (
          <div className="space-y-1.5">
            {items.map((item) => (
              <DeskCardRow
                key={item.id}
                item={item}
                selected={item.id === selectedItemId}
                readOnly={readOnly ?? false}
                onSelect={onSelect}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
