import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, Users } from 'lucide-react';
import { useWorkload } from '@/hooks/useWorkload';
import { DeveloperCard } from './DeveloperCard';
import { workloadColor } from '@/lib/utils';

interface WorkloadBarProps {
  onDeveloperClick: (accountId: string) => void;
}

export function WorkloadBar({ onDeveloperClick }: WorkloadBarProps) {
  const { data: workload, isLoading } = useWorkload();
  const [expanded, setExpanded] = useState(false);

  if (isLoading || !workload?.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.6 }}
      className="flex flex-col shrink-0 px-2 pb-1.5 pt-1 md:px-2.5 md:pb-2"
    >
      <div className="dashboard-panel rounded-[16px] overflow-hidden" style={{ borderColor: 'var(--border-strong)' }}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 cursor-pointer shrink-0"
        >
          <span className="h-7 w-7 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
            <Users size={16} />
          </span>
          <span className="min-w-0 text-left">
            <span
              className="text-[11px] font-semibold uppercase block"
              style={{ letterSpacing: '0.08em', color: 'var(--text-muted)' }}
            >
              Workload
            </span>
            <span className="text-[15px] font-medium block" style={{ color: 'var(--text-primary)' }}>
              Team capacity radar
            </span>
          </span>

          {!expanded && (
            <div className="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto no-scrollbar">
              {workload.map((dev) => {
                const isIdle = dev.activeDefects === 0;
                const color = isIdle ? 'var(--text-muted)' : workloadColor(dev.level);
                return (
                  <span
                    key={dev.developer.accountId}
                    className="flex items-center gap-2 shrink-0 rounded-full px-2.5 py-1.5"
                    style={{ background: 'var(--bg-tertiary)' }}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: color }}
                    />
                    <span
                      className="text-[11px] truncate"
                      style={{ color: 'var(--text-secondary)', maxWidth: 100 }}
                    >
                      {dev.developer.displayName.split(' ')[0]}
                    </span>
                    <span className="font-mono text-[11px] font-semibold tabular-nums" style={{ color }}>
                      {dev.score}
                    </span>
                  </span>
                );
              })}
            </div>
          )}

          <span className="shrink-0 ml-auto h-7 w-7 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>
            {expanded ? (
              <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
            ) : (
              <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} />
            )}
          </span>
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div
                className="px-3 pb-3 pt-1 overflow-y-auto"
                style={{ maxHeight: 240 }}
              >
                <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                  {workload.map((dev) => (
                    <DeveloperCard
                      key={dev.developer.accountId}
                      dev={dev}
                      expanded={true}
                      onClick={() => onDeveloperClick(dev.developer.accountId)}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
