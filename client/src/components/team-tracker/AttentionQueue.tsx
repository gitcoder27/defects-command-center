import { AlertTriangle, ArrowRight, Clock } from 'lucide-react';
import type { TrackerAttentionItem, TrackerAttentionReasonCode } from '@/types';
import { formatRelativeTime } from '@/lib/utils';
import { TrackerStatusPill } from './TrackerStatusPill';

interface AttentionQueueProps {
  items: TrackerAttentionItem[];
  onOpenDrawer: (accountId: string) => void;
}

const toneByReason: Record<TrackerAttentionReasonCode, { color: string; background: string; border: string }> = {
  blocked: { color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.18)' },
  at_risk: { color: 'var(--warning)', background: 'rgba(245, 158, 11, 0.14)', border: 'rgba(245, 158, 11, 0.2)' },
  stale_by_time: { color: 'var(--warning)', background: 'rgba(250, 204, 21, 0.12)', border: 'rgba(250, 204, 21, 0.18)' },
  stale_with_open_risk: { color: 'var(--warning)', background: 'rgba(245, 158, 11, 0.14)', border: 'rgba(245, 158, 11, 0.2)' },
  stale_without_current_work: { color: 'var(--warning)', background: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.18)' },
  overdue_linked_work: { color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.18)' },
  over_capacity: { color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.16)' },
  status_change_without_follow_up: { color: 'var(--info)', background: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.18)' },
  no_current: { color: 'var(--accent)', background: 'var(--accent-glow)', border: 'color-mix(in srgb, var(--accent) 18%, transparent)' },
  waiting: { color: 'var(--info)', background: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.18)' },
};

function checkInLabel(item: TrackerAttentionItem): string {
  return item.lastCheckInAt ? formatRelativeTime(item.lastCheckInAt) : 'No check-in yet';
}

export function AttentionQueue({ items, onOpenDrawer }: AttentionQueueProps) {
  return (
    <section className="mb-4 rounded-[20px] border px-3 py-3" style={{ borderColor: 'var(--border-strong)', background: 'color-mix(in srgb, var(--bg-secondary) 92%, var(--accent-glow) 8%)' }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Needs Attention Now
          </div>
          <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            Ranked follow-ups from the current board state.
          </div>
        </div>
        <div className="rounded-full px-2 py-1 text-[10px] font-semibold" style={{ color: 'var(--accent)', background: 'var(--accent-glow)' }}>
          {items.length} active
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-3 flex items-center gap-2 rounded-2xl border px-3 py-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-tertiary)' }}>
          <AlertTriangle size={14} style={{ color: 'var(--success)' }} />
          <div className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
            Nothing urgent is ranked right now.
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((item, index) => (
            <button
              key={item.developer.accountId}
              type="button"
              onClick={() => onOpenDrawer(item.developer.accountId)}
              className="flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-all hover:brightness-105"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-tertiary)' }}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold" style={{ color: 'var(--accent)', background: 'var(--accent-glow)' }}>
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="truncate text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {item.developer.displayName}
                  </div>
                  <TrackerStatusPill status={item.status} />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {item.reasons.map((reason) => (
                    <span
                      key={reason.code}
                      className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
                      style={toneByReason[reason.code]}
                    >
                      {reason.label}
                    </span>
                  ))}
                </div>
                <div className="mt-1 flex items-center gap-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {checkInLabel(item)}
                  </span>
                  <span>{item.hasCurrentItem ? 'Has current work' : 'No active work'}</span>
                  <span>{item.plannedCount} planned</span>
                  {item.signals.risk.overdueLinkedWork && <span>{item.signals.risk.overdueLinkedCount} overdue Jira</span>}
                  {item.signals.risk.overCapacity && <span>+{item.signals.risk.capacityDelta} over cap</span>}
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium" style={{ color: 'var(--accent)' }}>
                Open
                <ArrowRight size={12} />
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
