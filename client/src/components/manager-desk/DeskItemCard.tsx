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
import { KIND_LABELS, PRIORITY_LABELS } from '@/types/manager-desk';
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
        return end ? `${start}–${end}` : start;
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
      className="group rounded-lg px-2.5 py-1.5 cursor-pointer transition-all relative"
      role="button"
      tabIndex={0}
      aria-label={`Open ${item.title}`}
      style={{
        background: 'var(--bg-tertiary)',
        borderLeft: `2px solid ${borderAccent}`,
        opacity: isDone ? 0.55 : 1,
      }}
      whileHover={{ scale: 1.003, backgroundColor: 'var(--bg-elevated)' }}
      whileTap={{ scale: 0.998 }}
    >
      {isOverdue && (
        <div
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{ boxShadow: 'inset 0 0 0 1px rgba(239,68,68,0.25)' }}
        />
      )}

      <div className="flex items-center gap-2">
        <div
          className="h-5 w-5 rounded flex items-center justify-center flex-shrink-0"
          style={{
            background: variant === 'meeting' ? 'rgba(139,92,246,0.12)' : variant === 'waiting' ? 'rgba(245,158,11,0.12)' : 'var(--bg-secondary)',
          }}
        >
          <KindIcon
            size={10}
            style={{
              color: variant === 'meeting' ? 'var(--info)' : variant === 'waiting' ? 'var(--warning)' : 'var(--text-secondary)',
            }}
          />
        </div>

        <span
          className="min-w-0 flex-1 truncate text-[12px] font-medium"
          style={{
            color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
            textDecoration: item.status === 'cancelled' ? 'line-through' : undefined,
          }}
        >
          {item.title}
        </span>

        {/* Inline metadata */}
        {item.assignee && <AssigneePill assignee={item.assignee} size="sm" tone="neutral" />}

        {item.priority !== 'low' && !isDone && (
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{
              background: priorityColors[item.priority],
              boxShadow: item.priority === 'critical' ? `0 0 4px ${priorityColors[item.priority]}` : undefined,
            }}
            title={PRIORITY_LABELS[item.priority]}
          />
        )}

        {timeDisplay && (
          <span className="text-[9px] font-mono flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
            {timeDisplay}
          </span>
        )}

        {item.links.length > 0 && (
          <span className="flex items-center gap-0.5 text-[9px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
            <Link2 size={8} /> {item.links.length}
          </span>
        )}

        {followUpDisplay && (
          <span
            className="flex items-center gap-0.5 text-[9px] font-mono flex-shrink-0"
            style={{ color: isOverdue ? 'var(--danger)' : 'var(--text-muted)' }}
          >
            {isOverdue && <AlertTriangle size={8} />}
            ↩ {followUpDisplay}
          </span>
        )}

        {isDone && (
          <div className="flex-shrink-0">
            {item.status === 'done' ? (
              <CheckCircle2 size={12} style={{ color: 'var(--success)' }} />
            ) : (
              <XCircle size={12} style={{ color: 'var(--text-muted)' }} />
            )}
          </div>
        )}

        {/* Hover-only actions */}
        {(quickAction || (!isDone && onCarryForward)) && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            {!isDone && onCarryForward && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onCarryForward(); }}
                disabled={isCarryForwardPending}
                className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase transition-all disabled:opacity-40"
                style={{ background: 'var(--bg-secondary)', color: 'var(--md-accent)', border: '1px solid var(--border)' }}
                aria-label={`Carry forward ${item.title}`}
              >
                <ArrowRightFromLine size={8} />
                Carry
              </button>
            )}
            {quickAction && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onStatusChange(quickAction.status); }}
                className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase transition-all"
                style={{ background: 'var(--md-accent-glow)', color: 'var(--md-accent)', border: '1px solid var(--md-accent)' }}
                aria-label={`${quickAction.label} ${item.title}`}
              >
                {quickAction.status === 'done' ? <CheckCircle2 size={8} /> : <ArrowRight size={8} />}
                {quickAction.label}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Meta row - only show extra info like next action when available */}
      {!isDone && (item.nextAction || (item.participants && variant === 'meeting')) && (
        <div className="mt-0.5 pl-7 flex items-center gap-2">
          {item.participants && variant === 'meeting' && (
            <span className="text-[9px]" style={{ color: 'var(--text-secondary)' }}>{item.participants}</span>
          )}
          {item.nextAction && (
            <span className="text-[9px] truncate max-w-[200px]" style={{ color: 'var(--text-muted)' }}>→ {item.nextAction}</span>
          )}
        </div>
      )}

      {isDone && item.outcome && (
        <div className="mt-0.5 pl-7">
          <span className="text-[9px] italic truncate max-w-[200px]" style={{ color: 'var(--success)' }}>✓ {item.outcome}</span>
        </div>
      )}
    </motion.div>
  );
}
