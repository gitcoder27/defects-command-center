import { motion } from 'framer-motion';
import type { TrackerDeveloperStatus } from '@/types';
import {
  Zap,
  AlertTriangle,
  ShieldAlert,
  Pause,
  CheckCircle2,
} from 'lucide-react';

const statusConfig: Record<
  TrackerDeveloperStatus,
  { label: string; color: string; bg: string; icon: typeof Zap }
> = {
  on_track: { label: 'On Track', color: 'var(--success)', bg: 'rgba(16, 185, 129, 0.12)', icon: Zap },
  at_risk: { label: 'At Risk', color: 'var(--warning)', bg: 'rgba(245, 158, 11, 0.12)', icon: AlertTriangle },
  blocked: { label: 'Blocked', color: 'var(--danger)', bg: 'rgba(239, 68, 68, 0.12)', icon: ShieldAlert },
  waiting: { label: 'Waiting', color: 'var(--info)', bg: 'rgba(139, 92, 246, 0.12)', icon: Pause },
  done_for_today: { label: 'Done for Today', color: 'var(--accent)', bg: 'rgba(6, 182, 212, 0.12)', icon: CheckCircle2 },
};

interface StatusSelectorProps {
  current: TrackerDeveloperStatus;
  onUpdate: (status: TrackerDeveloperStatus) => void;
  isPending?: boolean;
}

export function StatusSelector({ current, onUpdate, isPending }: StatusSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.entries(statusConfig) as [TrackerDeveloperStatus, typeof statusConfig[TrackerDeveloperStatus]][]).map(
        ([key, cfg]) => {
          const isActive = current === key;
          const Icon = cfg.icon;
          return (
            <motion.button
              key={key}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                if (!isActive && !isPending) onUpdate(key);
              }}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-semibold transition-all disabled:opacity-60"
              style={{
                background: isActive ? cfg.bg : 'var(--bg-tertiary)',
                color: isActive ? cfg.color : 'var(--text-muted)',
                border: `1px solid ${isActive ? cfg.color : 'var(--border)'}`,
                borderColor: isActive
                  ? `color-mix(in srgb, ${cfg.color} 40%, transparent)`
                  : 'var(--border)',
                boxShadow: isActive ? `0 0 20px ${cfg.bg}` : 'none',
              }}
            >
              <Icon size={13} />
              {cfg.label}
            </motion.button>
          );
        }
      )}
    </div>
  );
}

export function getStatusInfo(status: TrackerDeveloperStatus) {
  return statusConfig[status];
}
