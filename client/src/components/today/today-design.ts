import type { TodayActionSeverity } from '@/types';

export const todayToneStyles: Record<TodayActionSeverity, { color: string; bg: string; border: string }> = {
  critical: {
    color: 'var(--danger)',
    bg: 'color-mix(in srgb, var(--danger) 13%, transparent)',
    border: 'color-mix(in srgb, var(--danger) 27%, transparent)',
  },
  warning: {
    color: 'var(--warning)',
    bg: 'color-mix(in srgb, var(--warning) 12%, transparent)',
    border: 'color-mix(in srgb, var(--warning) 25%, transparent)',
  },
  info: {
    color: 'var(--accent)',
    bg: 'color-mix(in srgb, var(--accent) 11%, transparent)',
    border: 'color-mix(in srgb, var(--accent) 22%, transparent)',
  },
  neutral: {
    color: 'var(--text-secondary)',
    bg: 'color-mix(in srgb, var(--bg-tertiary) 72%, transparent)',
    border: 'var(--border)',
  },
  success: {
    color: 'var(--success)',
    bg: 'color-mix(in srgb, var(--success) 12%, transparent)',
    border: 'color-mix(in srgb, var(--success) 24%, transparent)',
  },
};

export function todayActionColor(severity: TodayActionSeverity) {
  return todayToneStyles[severity].color;
}
