import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Zap,
  CalendarCheck,
  Scale,
  Clock,
  CheckCircle2,
  ArrowRightFromLine,
  XCircle,
  ArrowRight,
  Link2,
  AlertTriangle,
} from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';
import type { ManagerDeskItem, ManagerDeskStatus } from '@/types/manager-desk';
import { KIND_LABELS, CATEGORY_LABELS, PRIORITY_LABELS } from '@/types/manager-desk';
import { AssigneePill } from './AssigneePill';

interface Props {
  item: ManagerDeskItem;
  onSelect: () => void;
  onStatusChange: (status: ManagerDeskStatus) => void;
  onCarryForward?: () => void;
  isCarryForwardPending?: boolean;
  variant?: 'default' | 'meeting' | 'waiting' | 'inbox' | 'completed';
}

const kindIcons = {
  action: Zap,
  meeting: CalendarCheck,
  decision: Scale,
  waiting: Clock,
};

const priorityColors: Record<string, string> = {
  critical: 'var(--danger)',
  high: 'var(--warning)',
  medium: 'var(--md-accent)',
  low: 'var(--text-muted)',
};

export function DeskItemCard({
  item,
  onSelect,
  onStatusChange,
  onCarryForward,
  isCarryForwardPending = false,
  variant = 'default',
}: Props) {
  const KindIcon = kindIcons[item.kind];
  const isDone = item.status === 'done' || item.status === 'cancelled';

  const isOverdue = useMemo(() => {
    if (!item.followUpAt || isDone) return false;
    return isPast(parseISO(item.followUpAt));
  }, [item.followUpAt, isDone]);

  const timeDisplay = useMemo(() => {
    if (item.plannedStartAt) {
      try {
        const start = format(parseISO(item.plannedStartAt), 'HH:mm');
        const end = item.plannedEndAt ? format(parseISO(item.plannedEndAt), 'HH:mm') : null;
        return end ? `${start} – ${end}` : start;
      } catch { return null; }
    }
    return null;
  }, [item.plannedStartAt, item.plannedEndAt]);

  const followUpDisplay = useMemo(() => {
    if (!item.followUpAt) return null;
    try {
      return format(parseISO(item.followUpAt), 'MMM d, HH:mm');
    } catch { return null; }
  }, [item.followUpAt]);

  // Quick-action: move to next logical status
  const quickAction = useMemo(() => {
    if (item.status === 'inbox') return { label: 'Plan', status: 'planned' as const };
    if (item.status === 'planned') return { label: 'Start', status: 'in_progress' as const };
    if (item.status === 'in_progress') return { label: 'Done', status: 'done' as const };
    if (item.status === 'waiting') return { label: 'Done', status: 'done' as const };
    return null;
  }, [item.status]);

  const borderAccent = variant === 'meeting'
    ? 'var(--info)'
    : variant === 'waiting'
    ? 'var(--warning)'
    : variant === 'completed'
    ? 'var(--success)'
    : 'transparent';

  return (
    <motion.div
      layout
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
      className="group rounded-xl px-3 py-2 cursor-pointer transition-all relative"
      role="button"
      tabIndex={0}
      aria-label={`Open ${item.title}`}
      style={{
        background: 'var(--bg-tertiary)',
        borderLeft: `3px solid ${borderAccent}`,
        opacity: isDone ? 0.6 : 1,
      }}
      whileHover={{ scale: 1.005, backgroundColor: 'var(--bg-elevated)' }}
      whileTap={{ scale: 0.998 }}
    >
      {/* Overdue glow */}
      {isOverdue && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 0 1px rgba(239,68,68,0.25), 0 0 12px rgba(239,68,68,0.06)',
          }}
        />
      )}

      <div className="flex items-start gap-2.5">
        {/* Kind icon */}
        <div
          className="h-6 w-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{
            background: variant === 'meeting'
              ? 'rgba(139,92,246,0.12)'
              : variant === 'waiting'
              ? 'rgba(245,158,11,0.12)'
              : 'var(--bg-secondary)',
          }}
        >
          <KindIcon
            size={12}
            style={{
              color: variant === 'meeting'
                ? 'var(--info)'
                : variant === 'waiting'
                ? 'var(--warning)'
                : 'var(--text-secondary)',
            }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-[13px] font-medium truncate"
              style={{
                color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
                textDecoration: item.status === 'cancelled' ? 'line-through' : undefined,
              }}
            >
              {item.title}
            </span>

            {item.assignee && <AssigneePill assignee={item.assignee} size="sm" tone="neutral" />}

            {/* Priority pip */}
            {item.priority !== 'low' && !isDone && (
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  background: priorityColors[item.priority],
                  boxShadow: item.priority === 'critical'
                    ? `0 0 6px ${priorityColors[item.priority]}`
                    : undefined,
                }}
                title={PRIORITY_LABELS[item.priority]}
              />
            )}
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {/* Category badge */}
            <span
              className="text-[9px] font-bold uppercase tracking-[0.06em] rounded px-1.5 py-0.5"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
            >
              {CATEGORY_LABELS[item.category]}
            </span>

            {/* Time */}
            {timeDisplay && (
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                {timeDisplay}
              </span>
            )}

            {/* Participants */}
            {item.participants && (
              <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                {item.participants}
              </span>
            )}

            {/* Follow-up date */}
            {followUpDisplay && (
              <span
                className="flex items-center gap-0.5 text-[10px] font-mono"
                style={{ color: isOverdue ? 'var(--danger)' : 'var(--text-muted)' }}
              >
                {isOverdue && <AlertTriangle size={9} />}
                ↩ {followUpDisplay}
              </span>
            )}

            {/* Links count */}
            {item.links.length > 0 && (
              <span
                className="flex items-center gap-0.5 text-[10px]"
                style={{ color: 'var(--text-muted)' }}
              >
                <Link2 size={9} /> {item.links.length}
              </span>
            )}

            {/* Next action preview */}
            {item.nextAction && !isDone && (
              <span
                className="text-[10px] truncate max-w-[180px]"
                style={{ color: 'var(--text-muted)' }}
                title={item.nextAction}
              >
                → {item.nextAction}
              </span>
            )}

            {/* Outcome for done items */}
            {isDone && item.outcome && (
              <span
                className="text-[10px] italic truncate max-w-[200px]"
                style={{ color: 'var(--success)' }}
                title={item.outcome}
              >
                ✓ {item.outcome}
              </span>
            )}
          </div>
        </div>

        {(quickAction || (!isDone && onCarryForward)) && (
          <div className="mt-0.5 flex flex-col items-end gap-1.5 self-start">
            {!isDone && onCarryForward && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onCarryForward();
                }}
                disabled={isCarryForwardPending}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-all disabled:opacity-40"
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--md-accent)',
                  border: '1px solid color-mix(in srgb, var(--md-accent) 20%, var(--border) 80%)',
                }}
                aria-label={`Carry forward ${item.title}`}
              >
                <ArrowRightFromLine size={10} />
                Carry
              </button>
            )}

            {quickAction && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onStatusChange(quickAction.status);
                }}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-all"
                style={{
                  background: 'var(--md-accent-glow)',
                  color: 'var(--md-accent)',
                  border: '1px solid var(--md-accent)',
                }}
                aria-label={`${quickAction.label} ${item.title}`}
              >
                {quickAction.status === 'done' ? (
                  <CheckCircle2 size={10} />
                ) : (
                  <ArrowRight size={10} />
                )}
                {quickAction.label}
              </button>
            )}
          </div>
        )}

        {/* Done/cancelled indicator */}
        {isDone && (
          <div className="flex-shrink-0 mt-1">
            {item.status === 'done' ? (
              <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />
            ) : (
              <XCircle size={14} style={{ color: 'var(--text-muted)' }} />
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
