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
      className="absolute top-full right-0 mt-1 w-[360px] rounded-lg py-1 z-50"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5), 0 0 1px rgba(255,255,255,0.05)',
      }}
    >
      {alerts.map((alert) => (
        <button
          key={alert.id}
          onClick={() => onAlertClick(alert)}
          className="w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
        >
          <span className="text-[14px] mt-0.5 shrink-0">{severityIcon(alert.type)}</span>
          <span className="text-[13px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
            {alert.message}
          </span>
        </button>
      ))}
    </div>
  );
}
