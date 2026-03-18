import type { CSSProperties } from 'react';
import { Clock, ArrowRight, Zap, ClipboardList, AlertTriangle, Scale } from 'lucide-react';
import type { TrackerAttentionItem, TrackerAttentionReasonCode } from '@/types';
import { formatAbsoluteDateTime, formatRelativeTime } from '@/lib/utils';
import { TrackerStatusPill } from './TrackerStatusPill';
import { AttentionCardQuickActions } from './AttentionCardQuickActions';

interface AttentionCardProps {
  item: TrackerAttentionItem;
  index: number;
  date: string;
  onOpen: () => void;
  onMarkInactive: () => void;
  onCaptureFollowUp: () => void;
}

type SeverityTone = 'danger' | 'warning' | 'info' | 'accent';

const reasonToTone: Record<TrackerAttentionReasonCode, SeverityTone> = {
  blocked: 'danger',
  overdue_linked_work: 'danger',
  over_capacity: 'danger',
  at_risk: 'warning',
  stale_with_open_risk: 'warning',
  stale_without_current_work: 'warning',
  stale_by_time: 'warning',
  status_change_without_follow_up: 'info',
  waiting: 'info',
  no_current: 'accent',
};

const toneColor: Record<SeverityTone, string> = {
  danger: 'var(--danger)',
  warning: 'var(--warning)',
  info: 'var(--info)',
  accent: 'var(--accent)',
};

const cardTint: Record<SeverityTone, string> = {
  danger: 'rgba(239, 68, 68, 0.04)',
  warning: 'rgba(245, 158, 11, 0.03)',
  info: 'rgba(59, 130, 246, 0.03)',
  accent: 'var(--bg-tertiary)',
};

const badgeStyle: Record<TrackerAttentionReasonCode, CSSProperties> = {
  blocked: { color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.22)' },
  at_risk: { color: 'var(--warning)', background: 'rgba(245, 158, 11, 0.14)', borderColor: 'rgba(245, 158, 11, 0.24)' },
  stale_by_time: { color: 'var(--warning)', background: 'rgba(250, 204, 21, 0.12)', borderColor: 'rgba(250, 204, 21, 0.22)' },
  stale_with_open_risk: { color: 'var(--warning)', background: 'rgba(245, 158, 11, 0.14)', borderColor: 'rgba(245, 158, 11, 0.24)' },
  stale_without_current_work: { color: 'var(--warning)', background: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.2)' },
  overdue_linked_work: { color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.22)' },
  over_capacity: { color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.18)' },
  status_change_without_follow_up: { color: 'var(--info)', background: 'rgba(59, 130, 246, 0.12)', borderColor: 'rgba(59, 130, 246, 0.22)' },
  no_current: { color: 'var(--accent)', background: 'var(--accent-glow)', borderColor: 'color-mix(in srgb, var(--accent) 22%, transparent)' },
  waiting: { color: 'var(--info)', background: 'rgba(59, 130, 246, 0.12)', borderColor: 'rgba(59, 130, 246, 0.22)' },
};

function leadTone(item: TrackerAttentionItem): SeverityTone {
  const first = item.reasons[0];
  return first ? reasonToTone[first.code] : 'accent';
}

function Metric({ icon: Icon, label, color, title }: { icon: typeof Clock; label: string; color: string; title?: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[12px] font-medium whitespace-nowrap" style={{ color }} title={title}>
      <Icon size={13} style={{ opacity: 0.8 }} />
      {label}
    </span>
  );
}

export function AttentionCard({ item, index, date, onOpen, onMarkInactive, onCaptureFollowUp }: AttentionCardProps) {
  const tone = leadTone(item);
  const accent = toneColor[tone];
  const isStale = item.signals.freshness.staleByTime;
  const isDanger = tone === 'danger';
  const checkIn = item.lastCheckInAt ? formatRelativeTime(item.lastCheckInAt) : 'No check-in';
  const absoluteCheckIn = item.lastCheckInAt ? formatAbsoluteDateTime(item.lastCheckInAt) : undefined;
  const hasQuickActions = item.availableQuickActions.length > 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      className="group relative w-full overflow-hidden rounded-2xl border text-left transition-all duration-200 hover:brightness-[1.08] cursor-pointer"
      style={{
        borderColor: `color-mix(in srgb, ${accent} 20%, var(--border))`,
        background: cardTint[tone],
        boxShadow: isDanger ? `0 0 18px color-mix(in srgb, ${accent} 12%, transparent)` : undefined,
      }}
    >
      <div className="flex items-center gap-4 py-3 pl-5 pr-3">
        {/* Severity accent bar */}
        <div
          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
          style={{ background: accent, boxShadow: isDanger ? `0 0 6px ${accent}` : undefined }}
        />

        {/* Rank */}
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[12px] font-bold"
          style={{
            color: accent,
            background: `color-mix(in srgb, ${accent} 12%, transparent)`,
            border: `1px solid color-mix(in srgb, ${accent} 22%, transparent)`,
          }}
        >
          {index + 1}
        </div>

        {/* Identity + reason badges */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              {item.developer.displayName}
            </span>
            <TrackerStatusPill status={item.status} />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {item.reasons.map((reason) => (
              <span
                key={reason.code}
                className="rounded-full border px-2.5 py-0.5 text-[11px] font-medium"
                style={badgeStyle[reason.code]}
              >
                {reason.label}
              </span>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="my-1 w-px shrink-0 self-stretch opacity-40" style={{ background: 'var(--border)' }} />

        {/* Signal metrics */}
        <div className="shrink-0 grid grid-cols-2 gap-x-5 gap-y-1.5" style={{ minWidth: 220 }}>
          <Metric
            icon={Clock}
            label={checkIn}
            color={isStale ? 'var(--warning)' : 'var(--text-secondary)'}
            title={absoluteCheckIn}
          />
          <Metric
            icon={Zap}
            label={item.hasCurrentItem ? 'Active work' : 'No active work'}
            color={item.hasCurrentItem ? 'var(--success)' : 'var(--warning)'}
          />
          <Metric icon={ClipboardList} label={`${item.plannedCount} planned`} color="var(--text-secondary)" />
          {item.signals.risk.overdueLinkedWork && (
            <Metric icon={AlertTriangle} label={`${item.signals.risk.overdueLinkedCount} overdue`} color="var(--danger)" />
          )}
          {item.signals.risk.overCapacity && (
            <Metric icon={Scale} label={`+${item.signals.risk.capacityDelta} over cap`} color="var(--danger)" />
          )}
        </div>

        {/* Open arrow */}
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:translate-x-0.5"
          style={{ color: 'var(--accent)', background: 'var(--accent-glow)' }}
        >
          <ArrowRight size={14} />
        </div>
      </div>

      {/* Quick actions strip */}
      {hasQuickActions && (
        <div className="px-5 pb-2.5">
          <AttentionCardQuickActions
            item={item}
            date={date}
            onMarkInactive={onMarkInactive}
            onCaptureFollowUp={onCaptureFollowUp}
          />
        </div>
      )}
    </div>
  );
}
