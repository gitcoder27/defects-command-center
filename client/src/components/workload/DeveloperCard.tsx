import { motion } from 'framer-motion';
import { workloadColor } from '@/lib/utils';
import type { DeveloperWorkload } from '@/types';

interface DeveloperCardProps {
  dev: DeveloperWorkload;
  expanded: boolean;
  onClick: () => void;
}

export function DeveloperCard({ dev, expanded, onClick }: DeveloperCardProps) {
  const maxScore = 20;
  const fillPercent = Math.min((dev.score / maxScore) * 100, 100);
  const isIdle = dev.activeDefects === 0;
  const color = isIdle ? 'var(--text-muted)' : workloadColor(dev.level);

  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-1 cursor-pointer transition-all duration-150"
      style={{ minWidth: expanded ? 160 : 0 }}
    >
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {dev.developer.displayName}
        </span>
        {isIdle && (
          <span className="text-[10px] animate-glow-idle" style={{ color: 'var(--warning)' }}>
            ⚠
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${fillPercent}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          style={{ background: color }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="font-mono text-[14px] font-semibold tabular-nums" style={{ color }}>
          {dev.score}
        </span>
        {expanded && (
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {dev.level}
          </span>
        )}
      </div>

      {expanded && (
        <div className="flex flex-col gap-0.5 text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>
          <span>Active: {dev.activeDefects}</span>
          <span>Due Today: {dev.dueToday}</span>
          <span>Blocked: {dev.blocked}</span>
          {isIdle && <span style={{ color: 'var(--warning)' }}>No active defects</span>}
        </div>
      )}
    </button>
  );
}
