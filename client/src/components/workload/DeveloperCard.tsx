import { motion } from 'framer-motion';
import { workloadColor } from '@/lib/utils';
import type { DeveloperWorkload } from '@/types';

interface DeveloperCardProps {
  dev: DeveloperWorkload;
  expanded: boolean;
  active?: boolean;
  onClick: () => void;
}

export function DeveloperCard({ dev, expanded, active = false, onClick }: DeveloperCardProps) {
  const maxScore = 20;
  const fillPercent = Math.min((dev.score / maxScore) * 100, 100);
  const isIdle = dev.activeDefects === 0;
  const color = isIdle ? 'var(--text-muted)' : workloadColor(dev.level);

  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-2 cursor-pointer transition-all duration-200 rounded-[16px] border p-2.5 text-left"
      aria-pressed={active}
      style={{
        minWidth: expanded ? 160 : 0,
        borderColor: active ? 'var(--accent)' : 'var(--border)',
        background: active
          ? 'linear-gradient(180deg, color-mix(in srgb, var(--accent-glow) 72%, var(--bg-secondary) 28%) 0%, color-mix(in srgb, var(--accent-glow) 42%, var(--bg-primary) 58%) 100%)'
          : 'linear-gradient(180deg, color-mix(in srgb, var(--bg-secondary) 92%, white 8%) 0%, color-mix(in srgb, var(--bg-primary) 90%, var(--bg-secondary) 10%) 100%)',
        boxShadow: active ? '0 0 0 1px color-mix(in srgb, var(--accent) 28%, transparent), var(--soft-shadow)' : 'var(--soft-shadow)',
      }}
    >
      <div className="flex items-start gap-2">
        <span className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-semibold" style={{ background: isIdle ? 'var(--bg-tertiary)' : `${color}18`, color }}>
          {dev.developer.displayName
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() ?? '')
            .join('')}
        </span>
        <div className="min-w-0 flex-1">
          <span className="text-[13px] font-medium truncate block" style={{ color: 'var(--text-primary)' }}>
            {dev.developer.displayName}
          </span>
          <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            {expanded ? 'Developer workload profile' : 'Queue pressure'}
          </span>
        </div>
        {isIdle && (
          <span className="text-[10px] animate-glow-idle" style={{ color: 'var(--warning)' }}>
            ⚠
          </span>
        )}
      </div>

      <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${fillPercent}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          style={{ background: color }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="font-mono text-[18px] font-semibold tabular-nums" style={{ color }}>
          {dev.score}
        </span>
        <span className="text-[11px] uppercase rounded-full px-2 py-1" style={{ color, background: `${color}14`, letterSpacing: '0.08em' }}>
          {dev.level}
        </span>
      </div>

      {expanded && (
        <div className="grid grid-cols-3 gap-2 text-[11px] mt-1">
          <span className="rounded-xl px-2 py-2" style={{ color: 'var(--text-secondary)', background: 'var(--bg-tertiary)' }}>Active: {dev.activeDefects}</span>
          <span className="rounded-xl px-2 py-2" style={{ color: 'var(--text-secondary)', background: 'var(--bg-tertiary)' }}>Due: {dev.dueToday}</span>
          <span className="rounded-xl px-2 py-2" style={{ color: 'var(--text-secondary)', background: 'var(--bg-tertiary)' }}>Blocked: {dev.blocked}</span>
          {isIdle && <span style={{ color: 'var(--warning)' }}>No active defects</span>}
        </div>
      )}
    </button>
  );
}
