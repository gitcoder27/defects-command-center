import { useState } from 'react';
import { motion, Reorder } from 'framer-motion';
import { Play, CheckCircle2, XCircle, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import type { TrackerWorkItem } from '@/types';
import { formatDate, priorityColor } from '@/lib/utils';

interface PlannedQueueProps {
  items: TrackerWorkItem[];
  onSetCurrent: (id: number) => void;
  onMarkDone: (id: number) => void;
  onDrop: (id: number) => void;
  onReorder: (itemId: number, newPosition: number) => void;
}

export function PlannedQueue({ items, onSetCurrent, onMarkDone, onDrop, onReorder }: PlannedQueueProps) {
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
      {orderedItems.map((item, index) => (
        <PlannedItemRow
          key={item.id}
          item={item}
          index={index}
          total={orderedItems.length}
          onSetCurrent={onSetCurrent}
          onMarkDone={onMarkDone}
          onDrop={onDrop}
          onMoveUp={() => onReorder(item.id, index - 1)}
          onMoveDown={() => onReorder(item.id, index + 1)}
        />
      ))}
    </Reorder.Group>
  );
}

function PlannedItemRow({
  item,
  index,
  total,
  onSetCurrent,
  onMarkDone,
  onDrop,
  onMoveUp,
  onMoveDown,
}: {
  item: TrackerWorkItem;
  index: number;
  total: number;
  onSetCurrent: (id: number) => void;
  onMarkDone: (id: number) => void;
  onDrop: (id: number) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const jiraMeta = [
    item.jiraPriorityName,
    item.jiraDueDate ? `Due ${formatDate(item.jiraDueDate)}` : undefined,
  ]
    .filter(Boolean)
    .join(' · ');
  const jiraLabel = item.jiraSummary && item.jiraSummary !== item.title
    ? `${item.jiraKey} · ${item.jiraSummary}`
    : item.jiraKey;

  return (
    <Reorder.Item
      value={item}
      className="group"
      whileDrag={{
        scale: 1.02,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        zIndex: 50,
      }}
    >
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2.5 transition-colors"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Drag handle */}
        <div
          data-drag-handle
          className="cursor-grab active:cursor-grabbing touch-none shrink-0 flex items-center justify-center h-6 w-6 rounded-lg opacity-40 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--text-muted)' }}
        >
          <GripVertical size={14} />
        </div>

        {/* Position indicator */}
        <span
          className="text-[10px] font-mono font-bold shrink-0 w-5 text-center"
          style={{ color: 'var(--text-muted)' }}
        >
          {index + 1}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className="text-[12px] truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {item.title}
            </span>
          </div>
          {item.jiraKey && (
            <div className="mt-0.5 flex items-center gap-1.5 min-w-0">
              <span
                className="text-[9px] font-semibold uppercase shrink-0"
                style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}
              >
                Jira
              </span>
              <span
                className="font-mono text-[10px] truncate"
                style={{ color: 'var(--accent)' }}
              >
                {jiraLabel}
              </span>
            </div>
          )}
          {jiraMeta && (
            <span
              className="text-[10px]"
              style={{
                color: item.jiraPriorityName
                  ? priorityColor(item.jiraPriorityName)
                  : 'var(--text-muted)',
              }}
            >
              {jiraMeta}
            </span>
          )}
        </div>

        {/* Actions - visible on hover */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {index > 0 && (
            <button
              onClick={onMoveUp}
              className="h-6 w-6 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: 'var(--text-muted)' }}
              title="Move up"
            >
              <ChevronUp size={12} />
            </button>
          )}
          {index < total - 1 && (
            <button
              onClick={onMoveDown}
              className="h-6 w-6 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: 'var(--text-muted)' }}
              title="Move down"
            >
              <ChevronDown size={12} />
            </button>
          )}
          <button
            onClick={() => onSetCurrent(item.id)}
            className="h-6 w-6 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--accent)' }}
            title="Set as current"
          >
            <Play size={12} />
          </button>
          <button
            onClick={() => onMarkDone(item.id)}
            className="h-6 w-6 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--success)' }}
            title="Mark done"
          >
            <CheckCircle2 size={12} />
          </button>
          <button
            onClick={() => onDrop(item.id)}
            className="h-6 w-6 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-muted)' }}
            title="Drop"
          >
            <XCircle size={12} />
          </button>
        </div>
      </div>
    </Reorder.Item>
  );
}
