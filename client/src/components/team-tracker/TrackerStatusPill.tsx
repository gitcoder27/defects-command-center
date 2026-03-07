import type { TrackerDeveloperStatus } from '@/types';

const statusConfig: Record<TrackerDeveloperStatus, { label: string; color: string; bg: string }> = {
  on_track: { label: 'On Track', color: 'var(--success)', bg: 'rgba(16, 185, 129, 0.15)' },
  at_risk: { label: 'At Risk', color: 'var(--warning)', bg: 'rgba(245, 158, 11, 0.15)' },
  blocked: { label: 'Blocked', color: 'var(--danger)', bg: 'rgba(239, 68, 68, 0.15)' },
  waiting: { label: 'Waiting', color: 'var(--info)', bg: 'rgba(139, 92, 246, 0.15)' },
  done_for_today: { label: 'Done', color: 'var(--accent)', bg: 'rgba(6, 182, 212, 0.15)' },
};

interface TrackerStatusPillProps {
  status: TrackerDeveloperStatus;
  size?: 'sm' | 'md';
}

export function TrackerStatusPill({ status, size = 'sm' }: TrackerStatusPillProps) {
  const cfg = statusConfig[status];
  const fontSize = size === 'sm' ? '10px' : '11px';
  const padding = size === 'sm' ? '2px 8px' : '3px 10px';

  return (
    <span
      className="inline-flex items-center rounded-full font-semibold uppercase whitespace-nowrap"
      style={{
        fontSize,
        letterSpacing: '0.06em',
        padding,
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.color}`,
        borderColor: `color-mix(in srgb, ${cfg.color} 30%, transparent)`,
      }}
    >
      {cfg.label}
    </span>
  );
}
