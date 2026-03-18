import { useState, useCallback, useEffect, type CSSProperties } from 'react';
import {
  X, Trash2, CheckCircle2, XCircle, ArrowRightFromLine, RotateCcw, Users,
} from 'lucide-react';
import type { ManagerDeskItem } from '@/types/manager-desk';
import { KIND_LABELS, STATUS_LABELS, CATEGORY_LABELS, PRIORITY_LABELS, EXECUTION_STATE_LABELS } from '@/types/manager-desk';
import { AssigneePill } from './AssigneePill';

interface DrawerHeaderProps {
  item: ManagerDeskItem;
  onClose: () => void;
  onUpdate: (itemId: number, updates: Record<string, unknown>) => void;
  onDelete: (itemId: number) => void;
  onCarryForward?: () => void;
  isCarryForwardPending?: boolean;
}

const tones: Record<string, CSSProperties> = {
  accent: { background: 'var(--md-accent-dim)', color: 'var(--md-accent)', border: '1px solid color-mix(in srgb, var(--md-accent) 24%, transparent)' },
  neutral: { background: 'color-mix(in srgb, var(--bg-secondary) 92%, transparent)', color: 'var(--text-secondary)', border: '1px solid var(--border)' },
  success: { background: 'rgba(16,185,129,0.10)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.18)' },
  danger: { background: 'rgba(239,68,68,0.10)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.18)' },
  warning: { background: 'rgba(245,158,11,0.10)', color: 'var(--warning)', border: '1px solid rgba(245,158,11,0.18)' },
};

function chipTone(kind: string, value: string): string {
  if (kind === 'status' && (value === 'done' || value === 'cancelled')) return 'success';
  if (kind === 'priority' && value === 'critical') return 'danger';
  if (kind === 'priority' && value === 'high') return 'warning';
  return 'neutral';
}

function execTone(state: string): CSSProperties {
  if (state === 'done') return { background: 'rgba(16,185,129,0.10)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.22)' };
  if (state === 'in_progress') return { background: 'rgba(6,182,212,0.10)', color: 'var(--accent)', border: '1px solid rgba(6,182,212,0.22)' };
  if (state === 'dropped') return { background: 'rgba(239,68,68,0.08)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.16)' };
  return { background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' };
}

export function DrawerHeader({
  item, onClose, onUpdate, onDelete, onCarryForward, isCarryForwardPending = false,
}: DrawerHeaderProps) {
  const [editTitle, setEditTitle] = useState(item.title);

  useEffect(() => { setEditTitle(item.title); }, [item.id, item.title]);

  const commitTitle = useCallback(() => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== item.title) onUpdate(item.id, { title: trimmed });
  }, [editTitle, item.id, item.title, onUpdate]);

  const isDone = item.status === 'done' || item.status === 'cancelled';
  const exec = item.delegatedExecution;
  const chipClass = 'rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em]';
  const actionClass = 'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-all hover:brightness-110';

  return (
    <div
      className="shrink-0 border-b px-5 pb-4 pt-3"
      style={{
        borderColor: 'var(--border)',
        background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-primary) 96%, var(--md-accent-dim)) 0%, var(--bg-primary) 100%)',
      }}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-bold tracking-wide" style={{ color: 'var(--text-muted)' }}>
          #{item.id}
        </span>
        <div className="flex items-center gap-0.5">
          <button onClick={() => onDelete(item.id)} className="flex h-7 w-7 items-center justify-center rounded-lg transition-opacity hover:opacity-70" style={{ color: 'var(--danger)' }} title="Delete item" aria-label="Delete item">
            <Trash2 size={14} />
          </button>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg transition-opacity hover:opacity-70" style={{ color: 'var(--text-secondary)' }} aria-label="Close detail panel">
            <X size={15} />
          </button>
        </div>
      </div>

      <input
        value={editTitle}
        onChange={(e) => setEditTitle(e.target.value)}
        onBlur={commitTitle}
        onKeyDown={(e) => e.key === 'Enter' && commitTitle()}
        className="mt-2 w-full bg-transparent text-[17px] font-semibold leading-snug outline-none"
        style={{ color: 'var(--text-primary)', caretColor: 'var(--md-accent)' }}
        maxLength={200}
        aria-label="Item title"
      />

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span className="text-[9px] font-bold uppercase tracking-[0.12em] mr-0.5" style={{ color: 'var(--text-muted)' }}>
          {exec ? 'Manager Status' : 'Status'}
        </span>
        <span className={chipClass} style={tones.accent}>{KIND_LABELS[item.kind]}</span>
        <span className={chipClass} style={tones[chipTone('status', item.status)]}>{STATUS_LABELS[item.status]}</span>
        <span className={chipClass} style={tones.neutral}>{CATEGORY_LABELS[item.category]}</span>
        <span className={chipClass} style={tones[chipTone('priority', item.priority)]}>{PRIORITY_LABELS[item.priority]}</span>
        {item.assignee && <AssigneePill assignee={item.assignee} />}
      </div>

      {exec && (
        <div
          className="mt-2 rounded-lg px-2.5 py-2 flex flex-wrap items-center gap-2"
          style={{
            background: 'color-mix(in srgb, var(--bg-tertiary) 70%, transparent)',
            border: '1px solid var(--border)',
          }}
        >
          <span className="text-[9px] font-bold uppercase tracking-[0.12em] mr-0.5" style={{ color: 'var(--text-muted)' }}>
            Execution
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold"
            style={execTone(exec.state)}
          >
            <Users size={9} />
            {EXECUTION_STATE_LABELS[exec.state]}
          </span>
          {exec.note && (
            <span className="text-[10px] truncate max-w-[260px]" style={{ color: 'var(--text-secondary)' }} title={exec.note}>
              {exec.note}
            </span>
          )}
          {exec.state === 'done' && exec.completedAt && (
            <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
              Completed {new Date(exec.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {!isDone ? (
          <>
            <button onClick={() => onUpdate(item.id, { status: 'done' })} className={actionClass} style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.24)' }}>
              <CheckCircle2 size={11} /> Done
            </button>
            <button onClick={onCarryForward} disabled={!onCarryForward || isCarryForwardPending} className={`${actionClass} disabled:opacity-40`} style={{ background: 'rgba(217,169,78,0.14)', color: 'var(--md-accent)', border: '1px solid rgba(217,169,78,0.28)' }} aria-label={`Carry forward ${item.title}`}>
              <ArrowRightFromLine size={11} /> {isCarryForwardPending ? 'Carrying…' : 'Carry Forward'}
            </button>
            <button onClick={() => onUpdate(item.id, { status: 'cancelled' })} className={actionClass} style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              <XCircle size={11} /> Cancel
            </button>
          </>
        ) : (
          <button onClick={() => onUpdate(item.id, { status: 'planned' })} className={actionClass} style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            <RotateCcw size={11} /> Reopen
          </button>
        )}
      </div>
    </div>
  );
}
