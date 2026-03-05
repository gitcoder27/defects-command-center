import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useWorkload } from '@/hooks/useWorkload';
import { DeveloperCard } from './DeveloperCard';

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
      className="border-t overflow-hidden transition-all duration-250"
      style={{
        borderColor: 'var(--border)',
        background: 'var(--bg-secondary)',
        height: expanded ? 200 : 64,
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-2 cursor-pointer"
      >
        <span
          className="text-[11px] font-semibold uppercase"
          style={{ letterSpacing: '0.06em', color: 'var(--text-muted)' }}
        >
          Team Workload
        </span>
        {expanded ? (
          <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
        ) : (
          <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} />
        )}
      </button>

      <div
        className={`px-5 pb-3 grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5`}
      >
        {workload.map((dev) => (
          <DeveloperCard
            key={dev.developer.accountId}
            dev={dev}
            expanded={expanded}
            onClick={() => onDeveloperClick(dev.developer.accountId)}
          />
        ))}
      </div>
    </motion.div>
  );
}
