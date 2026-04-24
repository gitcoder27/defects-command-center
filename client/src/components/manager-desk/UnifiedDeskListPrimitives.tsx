import type { ReactNode } from 'react';
import { CalendarCheck, CheckCircle2, Clock3, Inbox, ListChecks } from 'lucide-react';
import type { ManagerDeskItem } from '@/types/manager-desk';
import type { ManagerDeskQuickFilter } from './workbench-utils';

export const lensCopy: Record<ManagerDeskQuickFilter, { title: string; subtitle: string; empty: string }> = {
  all: {
    title: "Today's Desk",
    subtitle: 'Open work that still belongs on your plate.',
    empty: 'No open work matches this view.',
  },
  waiting: {
    title: 'Waiting',
    subtitle: 'Blocked work and follow-ups that depend on someone else.',
    empty: 'Nothing is currently waiting on someone else.',
  },
  meetings: {
    title: 'Meetings',
    subtitle: 'Time-bound conversations and sync points.',
    empty: 'No meetings match this view.',
  },
  inbox: {
    title: 'Inbox',
    subtitle: 'Fresh captures that still need a little structure.',
    empty: 'Inbox is clear.',
  },
  done: {
    title: 'Done',
    subtitle: 'Resolved work for the current lens.',
    empty: 'No completed work matches this view.',
  },
};

export function getCardVariant(item: ManagerDeskItem): 'default' | 'meeting' | 'waiting' | 'inbox' | 'completed' {
  if (item.status === 'done' || item.status === 'cancelled') return 'completed';
  if (item.status === 'inbox') return 'inbox';
  if (item.kind === 'meeting') return 'meeting';
  if (item.status === 'waiting' || item.kind === 'waiting') return 'waiting';
  return 'default';
}

export function SignalChip({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone: 'accent' | 'muted' | 'success';
}) {
  const color = tone === 'success' ? 'var(--success)' : tone === 'accent' ? 'var(--md-accent)' : 'var(--text-secondary)';
  const background = tone === 'success' ? 'rgba(16,185,129,0.10)' : tone === 'accent' ? 'var(--md-accent-glow)' : 'var(--bg-secondary)';

  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em]"
      style={{ borderColor: 'var(--border)', background, color }}
    >
      {icon}
      <span>{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </span>
  );
}

export function UnifiedEmptyState({
  quickFilter,
  message,
}: {
  quickFilter: ManagerDeskQuickFilter;
  message: string;
}) {
  const Icon = quickFilter === 'done'
    ? CheckCircle2
    : quickFilter === 'meetings'
    ? CalendarCheck
    : quickFilter === 'waiting'
    ? Clock3
    : quickFilter === 'inbox'
    ? Inbox
    : ListChecks;

  return (
    <div
      className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed px-4 text-center"
      style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
    >
      <div
        className="flex h-9 w-9 items-center justify-center rounded-xl"
        style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
      >
        <Icon size={16} />
      </div>
      <p className="mt-3 text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
        {message}
      </p>
    </div>
  );
}
