import type { TrackerWorkItem } from '@/types';
import { Play, CheckCircle2, XCircle, GripVertical, StickyNote } from 'lucide-react';

interface TrackerItemRowProps {
  item: TrackerWorkItem;
  onSetCurrent?: (id: number) => void;
  onMarkDone?: (id: number) => void;
  onDrop?: (id: number) => void;
  compact?: boolean;
}

const stateIcons: Record<string, { icon: typeof Play; color: string }> = {
  planned: { icon: GripVertical, color: 'var(--text-muted)' },
  in_progress: { icon: Play, color: 'var(--accent)' },
  done: { icon: CheckCircle2, color: 'var(--success)' },
  dropped: { icon: XCircle, color: 'var(--text-muted)' },
};

export function TrackerItemRow({ item, onSetCurrent, onMarkDone, onDrop, compact }: TrackerItemRowProps) {
  const stateInfo = stateIcons[item.state] ?? stateIcons.planned;
  const Icon = stateInfo.icon;
  const isActive = item.state === 'in_progress';
  const isDone = item.state === 'done' || item.state === 'dropped';

  return (
    <div
      className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors"
      style={{
        background: isActive ? 'rgba(6, 182, 212, 0.06)' : 'transparent',
        borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
      }}
    >
      <Icon
        size={compact ? 12 : 14}
        style={{ color: stateInfo.color, flexShrink: 0 }}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {item.jiraKey && (
            <span
              className="font-mono text-[10px] font-semibold shrink-0"
              style={{ color: 'var(--accent)' }}
            >
              {item.jiraKey}
            </span>
          )}
          {item.itemType === 'custom' && (
            <span
              className="text-[9px] font-semibold uppercase shrink-0 px-1 rounded"
              style={{
                color: 'var(--info)',
                background: 'rgba(139, 92, 246, 0.12)',
                letterSpacing: '0.06em',
              }}
            >
              Custom
            </span>
          )}
          <span
            className="text-[12px] truncate"
            style={{
              color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
              textDecoration: isDone ? 'line-through' : 'none',
            }}
          >
            {item.title}
          </span>
        </div>
        {item.note && !compact && (
          <div className="flex items-center gap-1 mt-0.5">
            <StickyNote size={10} style={{ color: 'var(--text-muted)' }} />
            <span className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
              {item.note}
            </span>
          </div>
        )}
      </div>

      {!isDone && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {item.state !== 'in_progress' && onSetCurrent && (
            <button
              onClick={() => onSetCurrent(item.id)}
              className="h-6 w-6 rounded-md flex items-center justify-center transition-colors"
              style={{ background: 'var(--bg-tertiary)' }}
              title="Set as current"
            >
              <Play size={10} style={{ color: 'var(--accent)' }} />
            </button>
          )}
          {onMarkDone && (
            <button
              onClick={() => onMarkDone(item.id)}
              className="h-6 w-6 rounded-md flex items-center justify-center transition-colors"
              style={{ background: 'var(--bg-tertiary)' }}
              title="Mark done"
            >
              <CheckCircle2 size={10} style={{ color: 'var(--success)' }} />
            </button>
          )}
          {onDrop && (
            <button
              onClick={() => onDrop(item.id)}
              className="h-6 w-6 rounded-md flex items-center justify-center transition-colors"
              style={{ background: 'var(--bg-tertiary)' }}
              title="Drop"
            >
              <XCircle size={10} style={{ color: 'var(--text-muted)' }} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
