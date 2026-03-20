import { AlertTriangle, Ban, Briefcase, Clock3, X } from 'lucide-react';
import type { Alert } from '@/types';

interface AlertListProps {
  alerts: Alert[];
  onAlertClick: (alert: Alert) => void;
  onDismissAlert: (alert: Alert) => void;
}

const typeMeta = {
  overdue: { icon: AlertTriangle, tint: 'var(--danger)', bg: 'rgba(239,68,68,0.12)', label: 'Overdue' },
  stale: { icon: Clock3, tint: 'var(--warning)', bg: 'rgba(245,158,11,0.12)', label: 'Stale' },
  blocked: { icon: Ban, tint: 'var(--danger)', bg: 'rgba(239,68,68,0.12)', label: 'Blocked' },
  idle_developer: { icon: Briefcase, tint: 'var(--warning)', bg: 'rgba(245,158,11,0.12)', label: 'Idle developer' },
  high_priority_not_started: { icon: AlertTriangle, tint: 'var(--warning)', bg: 'rgba(245,158,11,0.12)', label: 'High priority' },
} satisfies Record<Alert['type'], { icon: typeof AlertTriangle; tint: string; bg: string; label: string }>;

export function AlertList({ alerts, onAlertClick, onDismissAlert }: AlertListProps) {
  return (
    <div className="space-y-1.5">
      {alerts.map((alert) => (
        <AlertListItem
          key={alert.id}
          alert={alert}
          onClick={() => onAlertClick(alert)}
          onDismiss={() => onDismissAlert(alert)}
        />
      ))}
    </div>
  );
}

function AlertListItem({
  alert,
  onClick,
  onDismiss,
}: {
  alert: Alert;
  onClick: () => void;
  onDismiss: () => void;
}) {
  const meta = typeMeta[alert.type];
  const Icon = meta.icon;

  return (
    <div
      className="group rounded-[18px] border px-3 py-3 transition-all"
      style={{
        borderColor: 'color-mix(in srgb, var(--border) 82%, transparent)',
        background: 'color-mix(in srgb, var(--bg-secondary) 80%, var(--bg-tertiary) 20%)',
      }}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onClick}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
        >
          <span
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ background: meta.bg, color: meta.tint }}
          >
            <Icon size={15} />
          </span>
          <span className="min-w-0 flex-1">
            <span
              className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: 'var(--text-muted)' }}
            >
              {meta.label}
              {alert.issueKey ? <span className="truncate normal-case tracking-normal">{alert.issueKey}</span> : null}
            </span>
            <span className="mt-1 block text-[13px] leading-snug" style={{ color: 'var(--text-primary)' }}>
              {alert.message}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDismiss();
          }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors"
          style={{ color: 'var(--text-muted)', background: 'transparent' }}
          aria-label={`Dismiss alert ${alert.id}`}
          title="Dismiss alert"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
