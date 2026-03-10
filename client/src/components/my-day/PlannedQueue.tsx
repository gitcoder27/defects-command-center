import { useState } from 'react';
import { Reorder } from 'framer-motion';
import type { TrackerWorkItem } from '@/types';
import { TrackerItemRow } from '@/components/team-tracker/TrackerItemRow';

interface PlannedQueueProps {
  items: TrackerWorkItem[];
  onSetCurrent: (id: number) => void;
  onMarkDone: (id: number) => void;
  onDrop: (id: number) => void;
  onReorder: (itemId: number, newPosition: number) => void;
  onUpdateNote: (id: number, note?: string) => void;
  onUpdateTitle: (id: number, title: string) => void;
}

export function PlannedQueue({
  items,
  onSetCurrent,
  onMarkDone,
  onDrop,
  onReorder,
  onUpdateNote,
  onUpdateTitle,
}: PlannedQueueProps) {
  const [orderedItems, setOrderedItems] = useState(items);

  // Sync from parent when items change
  if (items !== orderedItems && JSON.stringify(items.map((i) => i.id)) !== JSON.stringify(orderedItems.map((i) => i.id))) {
    setOrderedItems(items);
  }

  const handleReorder = (newOrder: TrackerWorkItem[]) => {
    setOrderedItems(newOrder);
    // Find which item moved and its new position
    newOrder.forEach((item, idx) => {
      if (items[idx]?.id !== item.id) {
        onReorder(item.id, idx);
      }
    });
  };

  if (items.length === 0) {
    return (
      <div
        className="rounded-xl p-4 text-center"
        style={{
          background: 'var(--bg-tertiary)',
          border: '1px dashed var(--border)',
        }}
      >
        <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
          No planned tasks — add one below
        </p>
      </div>
    );
  }

  return (
    <Reorder.Group axis="y" values={orderedItems} onReorder={handleReorder} className="space-y-1">
      {orderedItems.map((item) => (
        <Reorder.Item
          key={item.id}
          value={item}
          className="rounded-xl px-1"
          whileDrag={{
            scale: 1.02,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            zIndex: 50,
          }}
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
          }}
        >
          <TrackerItemRow
            item={item}
            draggable
            onSetCurrent={onSetCurrent}
            onMarkDone={onMarkDone}
            onDrop={onDrop}
            onUpdateNote={onUpdateNote}
            onUpdateTitle={onUpdateTitle}
          />
        </Reorder.Item>
      ))}
    </Reorder.Group>
  );
}
