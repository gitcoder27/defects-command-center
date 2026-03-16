import { motion } from 'framer-motion';
import {
  Inbox,
  Target,
  Loader,
  Clock,
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  BarChart3,
} from 'lucide-react';
import type { ManagerDeskSummary } from '@/types/manager-desk';

interface Props {
  summary: ManagerDeskSummary | null;
}

const signals: Array<{
  key: keyof ManagerDeskSummary;
  label: string;
  icon: typeof Inbox;
  colorVar: string;
}> = [
  { key: 'totalOpen', label: 'Open', icon: BarChart3, colorVar: 'var(--text-primary)' },
  { key: 'inbox', label: 'Inbox', icon: Inbox, colorVar: 'var(--text-muted)' },
  { key: 'planned', label: 'Planned', icon: Target, colorVar: 'var(--md-accent)' },
  { key: 'inProgress', label: 'Active', icon: Loader, colorVar: 'var(--accent)' },
  { key: 'waiting', label: 'Waiting', icon: Clock, colorVar: 'var(--warning)' },
  { key: 'overdueFollowUps', label: 'Overdue', icon: AlertTriangle, colorVar: 'var(--danger)' },
  { key: 'meetings', label: 'Meetings', icon: CalendarCheck, colorVar: 'var(--info)' },
  { key: 'completed', label: 'Done', icon: CheckCircle2, colorVar: 'var(--success)' },
];

export function SummaryStrip({ summary }: Props) {
  return (
    <div
      className="md-glass-panel rounded-xl px-2 py-1.5 grid gap-0.5"
      style={{
        gridTemplateColumns: 'repeat(auto-fit, minmax(72px, 1fr))',
      }}
    >
      {signals.map(({ key, label, icon: Icon, colorVar }, idx) => {
        const value = summary?.[key] ?? 0;
        const isHighlight = key === 'overdueFollowUps' && value > 0;
        return (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03, duration: 0.25 }}
            className="flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors"
            style={{
              background: isHighlight ? 'rgba(239,68,68,0.08)' : 'transparent',
            }}
          >
            <Icon
              size={11}
              style={{
                color: colorVar,
                filter: isHighlight ? 'drop-shadow(0 0 3px rgba(239,68,68,0.5))' : undefined,
              }}
            />
            <div className="min-w-0">
              <div
                className="text-[13px] font-semibold tabular-nums leading-tight"
                style={{ color: colorVar }}
              >
                {value}
              </div>
              <div
                className="text-[8px] uppercase font-bold tracking-[0.06em] leading-tight"
                style={{ color: 'var(--text-muted)' }}
              >
                {label}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
