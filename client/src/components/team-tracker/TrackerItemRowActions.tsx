import { CheckCircle2, GripVertical, PencilLine, Play, XCircle } from 'lucide-react';
import type { TrackerItemState } from '@/types';

interface TrackerItemRowActionsProps {
  itemId: number;
  itemState: TrackerItemState;
  draggable?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  hasNote?: boolean;
  onSetCurrent?: (id: number) => void;
  onMarkDone?: (id: number) => void;
  onDrop?: (id: number) => void;
  onMoveUp?: (id: number) => void;
  onMoveDown?: (id: number) => void;
  onToggleNoteEditor?: () => void;
}

export function TrackerItemRowActions({
  itemId,
  itemState,
  draggable,
  canMoveUp = false,
  canMoveDown = false,
  hasNote,
  onSetCurrent,
  onMarkDone,
  onDrop,
  onMoveUp,
  onMoveDown,
  onToggleNoteEditor,
}: TrackerItemRowActionsProps) {
  return (
    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
      {!draggable && itemState === 'planned' && onMoveUp && (
        <button
          onClick={(event) => {
            event.stopPropagation();
            onMoveUp(itemId);
          }}
          disabled={!canMoveUp}
          className="h-6 w-6 rounded-md flex items-center justify-center transition-colors disabled:opacity-30"
          style={{ background: 'var(--bg-tertiary)' }}
          title="Move up"
        >
          <GripVertical size={10} style={{ color: 'var(--text-secondary)' }} />
        </button>
      )}
      {!draggable && itemState === 'planned' && onMoveDown && (
        <button
          onClick={(event) => {
            event.stopPropagation();
            onMoveDown(itemId);
          }}
          disabled={!canMoveDown}
          className="h-6 w-6 rounded-md flex items-center justify-center transition-colors disabled:opacity-30"
          style={{ background: 'var(--bg-tertiary)' }}
          title="Move down"
        >
          <GripVertical size={10} style={{ color: 'var(--text-secondary)' }} />
        </button>
      )}
      {itemState !== 'in_progress' && onSetCurrent && (
        <button
          onClick={(event) => {
            event.stopPropagation();
            onSetCurrent(itemId);
          }}
          className="h-6 w-6 rounded-md flex items-center justify-center transition-colors"
          style={{ background: 'var(--bg-tertiary)' }}
          title="Set as current"
        >
          <Play size={10} style={{ color: 'var(--accent)' }} />
        </button>
      )}
      {onToggleNoteEditor && (
        <button
          onClick={(event) => {
            event.stopPropagation();
            onToggleNoteEditor();
          }}
          className="h-6 w-6 rounded-md flex items-center justify-center transition-colors"
          style={{ background: 'var(--bg-tertiary)' }}
          title="Edit note"
        >
          <PencilLine size={10} style={{ color: hasNote ? 'var(--accent)' : 'var(--text-secondary)' }} />
        </button>
      )}
      {onMarkDone && (
        <button
          onClick={(event) => {
            event.stopPropagation();
            onMarkDone(itemId);
          }}
          className="h-6 w-6 rounded-md flex items-center justify-center transition-colors"
          style={{ background: 'var(--bg-tertiary)' }}
          title="Mark done"
        >
          <CheckCircle2 size={10} style={{ color: 'var(--success)' }} />
        </button>
      )}
      {onDrop && (
        <button
          onClick={(event) => {
            event.stopPropagation();
            onDrop(itemId);
          }}
          className="h-6 w-6 rounded-md flex items-center justify-center transition-colors"
          style={{ background: 'var(--bg-tertiary)' }}
          title="Drop"
        >
          <XCircle size={10} style={{ color: 'var(--text-muted)' }} />
        </button>
      )}
    </div>
  );
}
