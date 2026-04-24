import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { ChevronDown, ChevronRight, UserMinus, X } from 'lucide-react';
import type { TrackerDeveloperDay, TrackerDeveloperStatus } from '@/types';
import type { TrackerWorkItem } from '@/types';
import { formatAbsoluteDateTime, formatRelativeTime } from '@/lib/utils';
import { TrackerItemRow } from './TrackerItemRow';
import { TrackerSignalBadges } from './TrackerSignalBadges';
import { TrackerStatusPill } from './TrackerStatusPill';

const statusOptions: TrackerDeveloperStatus[] = ['on_track', 'at_risk', 'blocked', 'waiting', 'done_for_today'];
const statusLabels: Record<TrackerDeveloperStatus, string> = {
  on_track: 'On track',
  at_risk: 'At risk',
  blocked: 'Blocked',
  waiting: 'Waiting',
  done_for_today: 'Done',
};

const statusStyles: Record<TrackerDeveloperStatus, { color: string; background: string }> = {
  on_track: { color: 'var(--success)', background: 'rgba(16, 185, 129, 0.15)' },
  at_risk: { color: 'var(--warning)', background: 'rgba(245, 158, 11, 0.15)' },
  blocked: { color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.15)' },
  waiting: { color: 'var(--info)', background: 'rgba(139, 92, 246, 0.15)' },
  done_for_today: { color: 'var(--accent)', background: 'rgba(6, 182, 212, 0.15)' },
};

type UpdateDayHandler = (params: {
  accountId: string;
  status?: TrackerDeveloperStatus;
  capacityUnits?: number | null;
  managerNotes?: string;
}) => void;

interface DrawerHeaderProps {
  day: TrackerDeveloperDay;
  loadLabel: string;
  isOverCapacity: boolean;
  readOnly: boolean;
  onClose: () => void;
  onUpdateDay: UpdateDayHandler;
  onMarkInactive?: (day: TrackerDeveloperDay) => void;
}

export function DrawerHeader({
  day,
  loadLabel,
  isOverCapacity,
  readOnly,
  onClose,
  onUpdateDay,
  onMarkInactive,
}: DrawerHeaderProps) {
  const initials = day.developer.displayName
    .split(' ')
    .map((name) => name[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="shrink-0 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold"
            style={{
              background: 'linear-gradient(135deg, var(--accent-glow), var(--bg-tertiary))',
              color: 'var(--accent)',
              border: '1px solid var(--border)',
            }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              {day.developer.displayName}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              <StatusPillSelect day={day} readOnly={readOnly} onUpdateDay={onUpdateDay} />
              <span>
                Load{' '}
                <span className="font-mono font-semibold" style={{ color: isOverCapacity ? 'var(--danger)' : 'var(--text-primary)' }}>
                  {loadLabel}
                </span>
              </span>
              <span>Done {day.completedItems.length}</span>
              {day.lastCheckInAt ? (
                <span
                  style={{ color: day.signals.freshness.staleByTime ? 'var(--warning)' : 'var(--text-muted)' }}
                  title={formatAbsoluteDateTime(day.lastCheckInAt)}
                >
                  Check-in {formatRelativeTime(day.lastCheckInAt)}
                </span>
              ) : (
                <span>No check-in</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {!readOnly && onMarkInactive && (
            <button
              type="button"
              onClick={() => onMarkInactive(day)}
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:brightness-125 focus:outline-none focus:ring-2 focus:ring-[var(--border-active)]"
              style={{
                background: 'color-mix(in srgb, var(--warning) 10%, transparent)',
                color: 'var(--warning)',
                border: '1px solid color-mix(in srgb, var(--warning) 28%, var(--border))',
              }}
              aria-label={`Mark ${day.developer.displayName} inactive`}
              title={`Mark ${day.developer.displayName} inactive`}
            >
              <UserMinus size={15} />
            </button>
          )}
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-active)]"
            style={{ background: 'var(--bg-tertiary)' }}
            aria-label="Close developer details"
            title="Close"
          >
            <X size={16} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>
      </div>
    </div>
  );
}

interface StatusPillSelectProps {
  day: TrackerDeveloperDay;
  readOnly: boolean;
  onUpdateDay: UpdateDayHandler;
}

function StatusPillSelect({ day, readOnly, onUpdateDay }: StatusPillSelectProps) {
  if (readOnly) {
    return <TrackerStatusPill status={day.status} size="sm" />;
  }

  const style = statusStyles[day.status];

  return (
    <span className="relative inline-flex shrink-0">
      <select
        value={day.status}
        onChange={(event) => onUpdateDay({ accountId: day.developer.accountId, status: event.target.value as TrackerDeveloperStatus })}
        className="h-[24px] appearance-none rounded-full py-0 pl-2.5 pr-6 text-[10px] font-semibold uppercase outline-none transition-colors focus:ring-2 focus:ring-[var(--border-active)]"
        style={{
          color: style.color,
          background: style.background,
          border: `1px solid color-mix(in srgb, ${style.color} 30%, transparent)`,
          letterSpacing: '0.06em',
        }}
        aria-label="Change developer status"
        title="Change developer status"
      >
        {statusOptions.map((status) => (
          <option key={status} value={status}>
            {statusLabels[status]}
          </option>
        ))}
      </select>
      <ChevronDown
        size={11}
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2"
        style={{ color: style.color }}
      />
    </span>
  );
}

interface StatusSummaryProps {
  day: TrackerDeveloperDay;
  readOnly: boolean;
  capacityText: string;
  setCapacityText: Dispatch<SetStateAction<string>>;
  onUpdateDay: UpdateDayHandler;
  onSaveCapacity: () => void;
}

export function StatusSummary({
  day,
  readOnly,
  capacityText,
  setCapacityText,
  onUpdateDay,
  onSaveCapacity,
}: StatusSummaryProps) {
  return (
    <div className="shrink-0 px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <TrackerSignalBadges day={day} compact maxItems={3} />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Cap</span>
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={capacityText}
            onChange={(event) => setCapacityText(event.target.value)}
            disabled={readOnly}
            placeholder="-"
            className="w-10 rounded-md px-1.5 py-0.5 text-center text-[12px] font-mono outline-none"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
          />
          <button
            type="button"
            onClick={onSaveCapacity}
            disabled={readOnly}
            className="rounded-md px-1.5 py-0.5 text-[11px] font-medium disabled:opacity-40"
            style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}
          >
            Save
          </button>
          {!readOnly && day.capacityUnits !== undefined && day.capacityUnits !== null && (
            <button
              type="button"
              onClick={() => {
                setCapacityText('');
                onUpdateDay({ accountId: day.developer.accountId, capacityUnits: null });
              }}
              className="text-[11px]"
              style={{ color: 'var(--text-muted)' }}
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface DrawerSectionProps {
  title: string;
  count?: number;
  action?: ReactNode;
  children: ReactNode;
}

export function DrawerSection({ title, count, action, children }: DrawerSectionProps) {
  return (
    <section className="mb-3">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
          <span>{title}</span>
          {typeof count === 'number' && (
            <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{count}</span>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

interface HistorySectionProps {
  title: string;
  items: TrackerWorkItem[];
  open: boolean;
  onToggle: () => void;
}

export function HistorySection({ title, items, open, onToggle }: HistorySectionProps) {
  const hasItems = items.length > 0;

  return (
    <section className="mb-2">
      <button
        type="button"
        onClick={hasItems ? onToggle : undefined}
        disabled={!hasItems}
        className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition-colors disabled:cursor-default"
        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        aria-expanded={hasItems ? open : undefined}
      >
        <span className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.06em' }}>
          {title} <span className="font-mono">{items.length}</span>
        </span>
        {hasItems && (
          open ? <ChevronDown size={14} /> : <ChevronRight size={14} />
        )}
      </button>
      {hasItems && open && (
        <div className="mt-1.5 space-y-0.5">
          {items.map((item) => (
            <TrackerItemRow key={item.id} item={item} compact hideActions onOpen={undefined} />
          ))}
        </div>
      )}
    </section>
  );
}
