import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, CheckCircle2, CircleOff, Clock, Play, Zap } from 'lucide-react';
import type { Issue, TrackerDeveloperDay, TrackerDeveloperGroup, TrackerWorkItem } from '@/types';
import { formatAbsoluteDateTime, formatRelativeTime } from '@/lib/utils';
import { TrackerStatusPill } from './TrackerStatusPill';

interface TrackerRosterBoardProps {
  date: string;
  developers: TrackerDeveloperDay[];
  groups: TrackerDeveloperGroup[];
  isGrouped: boolean;
  searchActive: boolean;
  onOpenDrawer: (accountId: string) => void;
  onOpenTaskDetail?: (itemId: number, managerDeskItemId?: number) => void;
  onSetCurrent: (itemId: number) => void;
  issues?: Issue[];
  readOnly?: boolean;
}

const statusGroupColors: Record<string, string> = {
  blocked: 'var(--danger)',
  at_risk: 'var(--warning)',
  waiting: 'var(--info)',
  on_track: 'var(--success)',
  done_for_today: 'var(--success)',
  needs_attention: 'var(--warning)',
  stable: 'var(--accent)',
  all: 'var(--accent)',
};

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const getAssignedCount = (day: TrackerDeveloperDay) => (day.currentItem ? 1 : 0) + day.plannedItems.length;

const getLoadLabel = (day: TrackerDeveloperDay) => {
  const assigned = getAssignedCount(day);
  return day.capacityUnits ? `${assigned}/${day.capacityUnits}` : `${assigned}`;
};

const getFreshnessLabel = (day: TrackerDeveloperDay) => {
  if (day.lastCheckInAt) {
    return formatRelativeTime(day.lastCheckInAt);
  }

  return 'No check-in';
};

const getRiskLabel = (day: TrackerDeveloperDay) => {
  if (day.status === 'blocked') return 'Blocked';
  if (day.signals.risk.overdueLinkedWork) {
    return day.signals.risk.overdueLinkedCount === 1
      ? '1 overdue'
      : `${day.signals.risk.overdueLinkedCount} overdue`;
  }
  if (day.signals.risk.overCapacity) return `+${day.signals.risk.capacityDelta} over cap`;
  if (day.signals.freshness.staleWithOpenRisk) return 'Stale risk';
  if (day.signals.freshness.staleWithoutCurrentWork) return 'Needs current';
  if (day.signals.freshness.statusChangeWithoutFollowUp) return 'Needs follow-up';
  if (day.status === 'done_for_today') return 'Done';

  return 'Clear';
};

const getRiskTone = (day: TrackerDeveloperDay) => {
  if (day.status === 'blocked' || day.signals.risk.overdueLinkedWork || day.signals.risk.overCapacity) return 'var(--danger)';
  if (day.signals.freshness.staleByTime || day.signals.freshness.staleWithoutCurrentWork) return 'var(--warning)';
  if (day.status === 'done_for_today') return 'var(--success)';
  return 'var(--text-muted)';
};

function WorkSummary({
  item,
  fallback,
  onOpenTaskDetail,
}: {
  item?: TrackerWorkItem;
  fallback: string;
  onOpenTaskDetail?: (itemId: number, managerDeskItemId?: number) => void;
}) {
  if (!item) {
    return (
      <span className="truncate text-[13px] font-semibold" style={{ color: 'var(--warning)' }}>
        {fallback}
      </span>
    );
  }

  const content = (
    <>
      <span className="truncate text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
        {item.title}
      </span>
      {item.jiraKey && (
        <span className="font-mono text-[11px]" style={{ color: 'var(--accent)' }}>
          {item.jiraKey}
        </span>
      )}
    </>
  );

  if (!onOpenTaskDetail) {
    return <div className="flex min-w-0 flex-col gap-0.5">{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onOpenTaskDetail(item.id, item.managerDeskItemId);
      }}
      className="flex min-w-0 flex-col gap-0.5 text-left focus:outline-none focus:ring-2 focus:ring-[var(--border-active)]"
      title={item.title}
    >
      {content}
    </button>
  );
}

function RosterRow({
  day,
  index,
  onOpenDrawer,
  onOpenTaskDetail,
  onSetCurrent,
  readOnly,
}: {
  day: TrackerDeveloperDay;
  index: number;
  onOpenDrawer: (accountId: string) => void;
  onOpenTaskDetail?: (itemId: number, managerDeskItemId?: number) => void;
  onSetCurrent: (itemId: number) => void;
  readOnly?: boolean;
}) {
  const assignedCount = getAssignedCount(day);
  const loadIsHigh = Boolean(day.capacityUnits && assignedCount > day.capacityUnits);
  const firstPlanned = day.plannedItems[0];
  const canSetCurrent = !readOnly && !day.currentItem && Boolean(firstPlanned);
  const freshnessTitle = day.lastCheckInAt ? formatAbsoluteDateTime(day.lastCheckInAt) : undefined;
  const freshnessIsStale = day.signals.freshness.staleByTime || !day.lastCheckInAt;
  const riskLabel = getRiskLabel(day);
  const riskTone = getRiskTone(day);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: Math.min(index * 0.025, 0.16) }}
      role="button"
      tabIndex={0}
      onClick={() => onOpenDrawer(day.developer.accountId)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpenDrawer(day.developer.accountId);
        }
      }}
      className="grid cursor-pointer gap-3 border-b px-3 py-3 text-left transition-colors hover:bg-[var(--bg-tertiary)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--border-active)] md:grid-cols-[minmax(190px,1.15fr)_minmax(220px,1.45fr)_minmax(130px,0.8fr)_80px_minmax(110px,0.72fr)_minmax(105px,0.72fr)_96px] md:items-center"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold"
          style={{ background: 'var(--bg-tertiary)', color: 'var(--accent)', border: '1px solid var(--border)' }}
        >
          {getInitials(day.developer.displayName)}
        </span>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            {day.developer.displayName}
          </div>
          <div className="mt-1">
            <TrackerStatusPill status={day.status} />
          </div>
        </div>
      </div>

      <WorkSummary item={day.currentItem} fallback="No current work" onOpenTaskDetail={onOpenTaskDetail} />

      <div className="min-w-0">
        <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Next
        </div>
        <div className="truncate text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
          {day.plannedItems.length > 0
            ? `${day.plannedItems.length} planned${firstPlanned ? ` · ${firstPlanned.title}` : ''}`
            : 'Nothing planned'}
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[12px] font-semibold tabular-nums" style={{ color: loadIsHigh ? 'var(--danger)' : 'var(--text-secondary)' }}>
        <Zap size={13} />
        {getLoadLabel(day)}
      </div>

      <div className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: freshnessIsStale ? 'var(--warning)' : 'var(--text-secondary)' }} title={freshnessTitle}>
        <Clock size={13} />
        <span className="truncate">{getFreshnessLabel(day)}</span>
      </div>

      <div className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: riskTone }}>
        {riskLabel === 'Clear' ? <CheckCircle2 size={13} /> : riskLabel === 'Needs current' ? <CircleOff size={13} /> : <AlertTriangle size={13} />}
        <span className="truncate">{riskLabel}</span>
      </div>

      <div className="flex justify-start md:justify-end">
        {canSetCurrent ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSetCurrent(firstPlanned!.id);
            }}
            className="inline-flex h-8 items-center justify-center rounded-lg px-3 text-[12px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-active)]"
            style={{ background: 'var(--accent)', color: 'var(--bg-primary)' }}
          >
            Set current
          </button>
        ) : (
          <span className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-semibold" style={{ color: 'var(--text-secondary)', background: 'var(--bg-tertiary)' }}>
            Open
            <ArrowRight size={13} />
          </span>
        )}
      </div>
    </motion.div>
  );
}

function RosterSection({
  developers,
  indexOffset,
  onOpenDrawer,
  onOpenTaskDetail,
  onSetCurrent,
  readOnly,
}: {
  developers: TrackerDeveloperDay[];
  indexOffset: number;
  onOpenDrawer: (accountId: string) => void;
  onOpenTaskDetail?: (itemId: number, managerDeskItemId?: number) => void;
  onSetCurrent: (itemId: number) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--bg-secondary) 72%, transparent)' }}>
      <div className="hidden border-b px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] md:grid md:grid-cols-[minmax(190px,1.15fr)_minmax(220px,1.45fr)_minmax(130px,0.8fr)_80px_minmax(110px,0.72fr)_minmax(105px,0.72fr)_96px]" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
        <span>Developer</span>
        <span>Current work</span>
        <span>Next</span>
        <span>Load</span>
        <span>Freshness</span>
        <span>Risk</span>
        <span className="text-right">Action</span>
      </div>
      {developers.map((day, index) => (
        <RosterRow
          key={day.developer.accountId}
          day={day}
          index={indexOffset + index}
          onOpenDrawer={onOpenDrawer}
          onOpenTaskDetail={onOpenTaskDetail}
          onSetCurrent={onSetCurrent}
          readOnly={readOnly}
        />
      ))}
    </div>
  );
}

export function TrackerRosterBoard({
  developers,
  groups,
  isGrouped,
  searchActive,
  onOpenDrawer,
  onOpenTaskDetail,
  onSetCurrent,
  readOnly = false,
}: TrackerRosterBoardProps) {
  const visibleCount = isGrouped
    ? groups.reduce((sum, group) => sum + group.developers.length, 0)
    : developers.length;

  if (visibleCount === 0) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-xl border px-4 py-10 text-center" style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--bg-secondary) 72%, transparent)' }}>
        <div>
          <div className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            {searchActive ? 'No developers match this search.' : 'No developers match this view.'}
          </div>
          <div className="mt-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
            {searchActive ? 'Try a different name, task, or Jira key.' : 'Change the filters or add team members from settings.'}
          </div>
        </div>
      </div>
    );
  }

  if (!isGrouped) {
    return (
      <RosterSection
        developers={developers}
        indexOffset={0}
        onOpenDrawer={onOpenDrawer}
        onOpenTaskDetail={onOpenTaskDetail}
        onSetCurrent={onSetCurrent}
        readOnly={readOnly}
      />
    );
  }

  let offset = 0;

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const color = statusGroupColors[group.key] ?? 'var(--accent)';
        const currentOffset = offset;
        offset += group.developers.length;

        return (
          <section key={group.key}>
            <div className="mb-2 flex items-center gap-2 px-1">
              <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
              <span className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                {group.label}
              </span>
              <span className="tabular-nums text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {group.count}
              </span>
            </div>
            <RosterSection
              developers={group.developers}
              indexOffset={currentOffset}
              onOpenDrawer={onOpenDrawer}
              onOpenTaskDetail={onOpenTaskDetail}
              onSetCurrent={onSetCurrent}
              readOnly={readOnly}
            />
          </section>
        );
      })}
    </div>
  );
}
