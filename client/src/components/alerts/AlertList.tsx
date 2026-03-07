import type { Alert } from '@/types';

interface AlertListProps {
  alerts: Alert[];
  onAlertClick: (alert: Alert) => void;
}

export function AlertList({ alerts, onAlertClick }: AlertListProps) {
  const severityIcon = (type: string) => {
    switch (type) {
      case 'overdue': return '🔴';
      case 'stale': return '🟡';
      case 'blocked': return '🔴';
      case 'idle_developer': return '🟡';
      case 'high_priority_not_started': return '🟠';
      default: return '⚪';
    }
  };

  return (
    <div
      className="absolute top-full right-0 mt-3 w-[min(420px,calc(100vw-2rem))] rounded-[24px] p-2 z-50"
      style={{
        background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-secondary) 96%, white 4%) 0%, color-mix(in srgb, var(--bg-primary) 88%, var(--bg-secondary) 12%) 100%)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--panel-shadow)',
      }}
    >
      {alerts.map((alert) => (
        <button
          key={alert.id}
          onClick={() => onAlertClick(alert)}
          className="w-full text-left px-3 py-3 flex items-start gap-3 rounded-[18px] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
        >
          <span className="text-[14px] mt-0.5 shrink-0 h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>
            {severityIcon(alert.type)}
          </span>
          <span className="text-[13px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
            {alert.message}
          </span>
        </button>
      ))}
    </div>
  );
}
