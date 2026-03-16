import { CheckCircle2, GripVertical, PencilLine, Play, XCircle } from 'lucide-react';
import type { TrackerItemState } from '@/types';

export type TrackerItemActionPreset = 'default' | 'none' | 'start-only-visible';

interface TrackerItemRowActionsProps {
  itemId: number;
  itemTitle: string;
  itemState: TrackerItemState;
  actionPreset?: TrackerItemActionPreset;
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
  itemTitle,
  itemState,
  actionPreset = 'default',
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
  if (actionPreset === 'none') {
    return null;
  }

  const startOnlyVisible = actionPreset === 'start-only-visible';

  return (
    <div
      className={`flex items-center gap-1 shrink-0 transition-opacity ${
        startOnlyVisible ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`}
    >
      {!startOnlyVisible && !draggable && itemState === 'planned' && onMoveUp && (
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
      {!startOnlyVisible && !draggable && itemState === 'planned' && onMoveDown && (
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
          className={
            startOnlyVisible
              ? 'inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-semibold transition-colors'
              : 'h-6 w-6 rounded-md flex items-center justify-center transition-colors'
          }
          style={
            startOnlyVisible
              ? {
                  background: 'var(--accent-glow)',
                  color: 'var(--accent)',
                  border: '1px solid color-mix(in srgb, var(--accent) 24%, transparent)',
                }
              : { background: 'var(--bg-tertiary)' }
          }
          title={startOnlyVisible ? `Start ${itemTitle}` : 'Set as current'}
          aria-label={startOnlyVisible ? `Start ${itemTitle}` : undefined}
        >
          <Play size={10} style={{ color: 'var(--accent)' }} />
          {startOnlyVisible && <span>Start</span>}
        </button>
      )}
      {!startOnlyVisible && onToggleNoteEditor && (
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
      {!startOnlyVisible && onMarkDone && (
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
      {!startOnlyVisible && onDrop && (
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
