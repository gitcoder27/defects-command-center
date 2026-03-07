import { motion } from 'framer-motion';
import { AlertTriangle, Clock, ShieldAlert, Pause, CircleOff, CheckCircle2, Users } from 'lucide-react';
import type { TrackerBoardSummary } from '@/types';

type SummaryFilter = 'all' | 'stale' | 'blocked' | 'at_risk' | 'waiting' | 'no_current' | 'done_for_today';

interface TrackerSummaryStripProps {
  summary: TrackerBoardSummary;
  activeFilter: SummaryFilter;
  onFilterChange: (filter: SummaryFilter) => void;
}

const chips: Array<{
  key: SummaryFilter;
  label: string;
  icon: typeof AlertTriangle;
  countKey: keyof TrackerBoardSummary;
  color: string;
}> = [
  { key: 'all', label: 'All', icon: Users, countKey: 'total', color: 'var(--accent)' },
  { key: 'stale', label: 'Stale', icon: Clock, countKey: 'stale', color: 'var(--warning)' },
  { key: 'blocked', label: 'Blocked', icon: ShieldAlert, countKey: 'blocked', color: 'var(--danger)' },
  { key: 'at_risk', label: 'At Risk', icon: AlertTriangle, countKey: 'atRisk', color: 'var(--warning)' },
  { key: 'waiting', label: 'Waiting', icon: Pause, countKey: 'waiting', color: 'var(--info)' },
  { key: 'no_current', label: 'No Current', icon: CircleOff, countKey: 'noCurrent', color: 'var(--text-muted)' },
  { key: 'done_for_today', label: 'Done', icon: CheckCircle2, countKey: 'doneForToday', color: 'var(--success)' },
];

export function TrackerSummaryStrip({ summary, activeFilter, onFilterChange }: TrackerSummaryStripProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1"
    >
      {chips.map((chip) => {
        const count = summary[chip.countKey];
        const isActive = activeFilter === chip.key;
        const Icon = chip.icon;

        return (
          <button
            key={chip.key}
            onClick={() => onFilterChange(chip.key === activeFilter ? 'all' : chip.key)}
            className="shrink-0 flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-medium transition-all"
            style={{
              background: isActive ? `color-mix(in srgb, ${chip.color} 18%, transparent)` : 'var(--bg-tertiary)',
              border: `1px solid ${isActive ? `color-mix(in srgb, ${chip.color} 40%, transparent)` : 'var(--border)'}`,
              color: isActive ? chip.color : 'var(--text-secondary)',
            }}
          >
            <Icon size={12} />
            <span>{chip.label}</span>
            <span
              className="font-mono text-[10px] font-semibold rounded-full px-1.5 py-0.5"
              style={{
                background: isActive ? `color-mix(in srgb, ${chip.color} 12%, transparent)` : 'var(--bg-secondary)',
                color: isActive ? chip.color : 'var(--text-muted)',
              }}
            >
              {count}
            </span>
          </button>
        );
      })}
    </motion.div>
  );
}

export type { SummaryFilter };
