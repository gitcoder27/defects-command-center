import { useEffect, useState } from 'react';
import type { TrackerItemState, TrackerWorkItem } from '@/types';
import { Play, CheckCircle2, XCircle, GripVertical, StickyNote, Save, PencilLine } from 'lucide-react';
import { formatDate, priorityColor } from '@/lib/utils';

interface TrackerItemRowProps {
  item: TrackerWorkItem;
  onSetCurrent?: (id: number) => void;
  onMarkDone?: (id: number) => void;
  onDrop?: (id: number) => void;
  onMoveUp?: (id: number) => void;
  onMoveDown?: (id: number) => void;
  onUpdateNote?: (id: number, note?: string) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  compact?: boolean;
  draggable?: boolean;
}

const stateIcons: Record<TrackerItemState, { icon: typeof Play; color: string }> = {
  planned: { icon: GripVertical, color: 'var(--text-muted)' },
  in_progress: { icon: Play, color: 'var(--accent)' },
  done: { icon: CheckCircle2, color: 'var(--success)' },
  dropped: { icon: XCircle, color: 'var(--text-muted)' },
};

export function TrackerItemRow({
  item,
  onSetCurrent,
  onMarkDone,
  onDrop,
  onMoveUp,
  onMoveDown,
  onUpdateNote,
  canMoveUp = false,
  canMoveDown = false,
  compact,
  draggable,
}: TrackerItemRowProps) {
  const [noteEditing, setNoteEditing] = useState(false);
  const [draftNote, setDraftNote] = useState(item.note ?? '');

  useEffect(() => {
    setDraftNote(item.note ?? '');
  }, [item.note, item.id]);

  const stateInfo = stateIcons[item.state] ?? stateIcons.planned;
  const Icon = stateInfo.icon;
  const isActive = item.state === 'in_progress';
  const isDone = item.state === 'done' || item.state === 'dropped';
  const jiraMeta = [
    item.jiraPriorityName,
    item.jiraDueDate ? `Due ${formatDate(item.jiraDueDate)}` : undefined,
  ]
    .filter(Boolean)
    .join(' • ');

  return (
    <div
      className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors"
      style={{
        background: isActive ? 'rgba(6, 182, 212, 0.06)' : 'transparent',
        borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
      }}
    >
      {draggable ? (
        <div
          data-drag-handle
          className="cursor-grab active:cursor-grabbing touch-none shrink-0 flex items-center justify-center h-5 w-5 rounded"
          style={{ color: 'var(--text-muted)' }}
          title="Drag to reorder"
        >
          <GripVertical size={14} />
        </div>
      ) : (
        <Icon
          size={compact ? 12 : 14}
          style={{ color: stateInfo.color, flexShrink: 0 }}
        />
      )}

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
        {jiraMeta && (
          <div className="mt-0.5">
            <span className="text-[10px]" style={{ color: item.jiraPriorityName ? priorityColor(item.jiraPriorityName) : 'var(--text-muted)' }}>
              {jiraMeta}
            </span>
          </div>
        )}
        {item.note && !compact && !noteEditing && (
          <div className="flex items-center gap-1 mt-0.5">
            <StickyNote size={10} style={{ color: 'var(--text-muted)' }} />
            <span className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
              {item.note}
            </span>
          </div>
        )}
        {!compact && noteEditing && (
          <div className="mt-1.5 space-y-1.5">
            <textarea
              value={draftNote}
              onChange={(event) => setDraftNote(event.target.value)}
              rows={2}
              className="w-full rounded-lg px-2 py-1.5 text-[11px] outline-none resize-none"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-active)',
              }}
            />
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  onUpdateNote?.(item.id, draftNote.trim() || undefined);
                  setNoteEditing(false);
                }}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px]"
                style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}
              >
                <Save size={10} />
                Save
              </button>
              <button
                onClick={() => {
                  setDraftNote(item.note ?? '');
                  setNoteEditing(false);
                }}
                className="text-[10px]"
                style={{ color: 'var(--text-muted)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {!isDone && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {!draggable && item.state === 'planned' && onMoveUp && (
            <button
              onClick={() => onMoveUp(item.id)}
              disabled={!canMoveUp}
              className="h-6 w-6 rounded-md flex items-center justify-center transition-colors disabled:opacity-30"
              style={{ background: 'var(--bg-tertiary)' }}
              title="Move up"
            >
              <GripVertical size={10} style={{ color: 'var(--text-secondary)' }} />
            </button>
          )}
          {!draggable && item.state === 'planned' && onMoveDown && (
            <button
              onClick={() => onMoveDown(item.id)}
              disabled={!canMoveDown}
              className="h-6 w-6 rounded-md flex items-center justify-center transition-colors disabled:opacity-30"
              style={{ background: 'var(--bg-tertiary)' }}
              title="Move down"
            >
              <GripVertical size={10} style={{ color: 'var(--text-secondary)' }} />
            </button>
          )}
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
          {!compact && onUpdateNote && (
            <button
              onClick={() => setNoteEditing((editing) => !editing)}
              className="h-6 w-6 rounded-md flex items-center justify-center transition-colors"
              style={{ background: 'var(--bg-tertiary)' }}
              title="Edit note"
            >
              <PencilLine size={10} style={{ color: item.note ? 'var(--accent)' : 'var(--text-secondary)' }} />
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
