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
      className="border-t flex flex-col shrink-0"
      style={{
        borderColor: 'var(--border)',
        background: 'var(--bg-secondary)',
      }}
    >
      {/* Collapsed: single compact strip */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 cursor-pointer shrink-0"
        style={{ height: 32 }}
      >
        <span className="flex items-center gap-1.5 shrink-0">
          <Users size={11} style={{ color: 'var(--text-muted)' }} />
          <span
            className="text-[10px] font-semibold uppercase"
            style={{ letterSpacing: '0.05em', color: 'var(--text-muted)' }}
          >
            Workload
          </span>
        </span>

        {/* Inline developer chips — visible only when collapsed */}
        {!expanded && (
          <div className="flex items-center gap-3 flex-1 min-w-0 overflow-x-auto no-scrollbar">
            {workload.map((dev) => {
              const isIdle = dev.activeDefects === 0;
              const color = isIdle ? 'var(--text-muted)' : workloadColor(dev.level);
              return (
                <span key={dev.developer.accountId} className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
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

        <span className="shrink-0 ml-auto">
          {expanded ? (
            <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} />
          ) : (
            <ChevronUp size={12} style={{ color: 'var(--text-muted)' }} />
          )}
        </span>
      </button>

      {/* Expanded: animated detail grid */}
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
              className="px-4 pb-3 pt-1 overflow-y-auto"
              style={{ maxHeight: 220 }}
            >
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
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
    </motion.div>
  );
}
