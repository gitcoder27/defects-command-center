import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Zap,
  CalendarCheck,
  Scale,
  Clock,
  CheckCircle2,
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

  const focusStatus = useMemo(() => {
    if (variant !== 'default') return null;
    if (item.status === 'in_progress') {
      return {
        label: 'Started',
        chipStyle: {
          background: 'rgba(217,169,78,0.14)',
          color: 'var(--md-accent)',
          border: '1px solid rgba(217,169,78,0.28)',
        },
        dotStyle: {
          background: 'var(--md-accent)',
          boxShadow: '0 0 0 3px rgba(217,169,78,0.14)',
        },
      };
    }
    if (item.status === 'planned') {
      return {
        label: 'Planned',
        chipStyle: {
          background: 'var(--bg-secondary)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border)',
        },
        dotStyle: {
          background: 'var(--text-muted)',
        },
      };
    }
    return null;
  }, [item.status, variant]);

  const cardSurface = useMemo(() => {
    if (variant === 'default' && item.status === 'in_progress') {
      return {
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--md-accent-glow) 72%, var(--bg-tertiary) 28%) 0%, var(--bg-tertiary) 72%)',
        boxShadow: 'inset 0 0 0 1px rgba(217,169,78,0.20)',
      };
    }
    if (variant === 'default' && item.status === 'planned') {
      return {
        background: 'color-mix(in srgb, var(--bg-tertiary) 92%, transparent)',
        boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--border) 84%, transparent)',
      };
    }
    return {
      background: 'var(--bg-tertiary)',
      boxShadow: undefined,
    };
  }, [item.status, variant]);

  const borderAccent = variant === 'meeting'
    ? 'var(--info)'
    : variant === 'waiting'
    ? 'var(--warning)'
    : variant === 'completed'
    ? 'var(--success)'
    : item.status === 'in_progress'
    ? 'var(--md-accent)'
    : item.status === 'planned'
    ? 'color-mix(in srgb, var(--md-accent) 34%, transparent)'
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
      className="group relative cursor-pointer rounded-lg px-2.5 py-1.5 transition-all"
      role="button"
      tabIndex={0}
      aria-label={`Open ${item.title}`}
      style={{
        background: cardSurface.background,
        borderLeft: `2px solid ${borderAccent}`,
        opacity: isDone ? 0.55 : 1,
        boxShadow: cardSurface.boxShadow,
      }}
      whileHover={{ scale: 1.003, y: -1 }}
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
      </div>

      {quickAction && (
        <div
          className="invisible absolute right-2 top-1/2 z-10 -translate-y-1/2 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="rounded-lg p-1"
            style={{
              background: 'color-mix(in srgb, var(--bg-primary) 86%, transparent)',
              border: '1px solid color-mix(in srgb, var(--border) 78%, transparent)',
              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.18)',
              backdropFilter: 'blur(10px)',
              pointerEvents: 'auto',
            }}
          >
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onStatusChange(quickAction.status); }}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[9px] font-bold uppercase transition-all"
              style={{ background: 'var(--md-accent-glow)', color: 'var(--md-accent)', border: '1px solid var(--md-accent)' }}
              aria-label={`${quickAction.label} ${item.title}`}
            >
              {quickAction.status === 'done' ? <CheckCircle2 size={8} /> : <ArrowRight size={8} />}
              {quickAction.label}
            </button>
          </div>
        </div>
      )}

      {/* Meta row - only show extra info like next action when available */}
      {!isDone && (focusStatus || item.assignee || item.nextAction || (item.participants && variant === 'meeting')) && (
        <div className="mt-0.5 pl-7 flex items-center gap-2">
          {focusStatus && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em]"
              style={focusStatus.chipStyle}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={focusStatus.dotStyle} />
              {focusStatus.label}
            </span>
          )}
          {item.assignee && <AssigneePill assignee={item.assignee} size="xs" tone="neutral" />}
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
