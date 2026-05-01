import { motion, AnimatePresence } from 'framer-motion';
import { Clock } from 'lucide-react';
import type { TrackerCheckIn } from '@/types';
import { formatRelativeTime } from '@/lib/utils';

interface RecentActivityProps {
  checkIns: TrackerCheckIn[];
}

export function RecentActivity({ checkIns }: RecentActivityProps) {
  if (checkIns.length === 0) {
    return (
      <div className="flex items-center justify-center p-6 rounded-2xl border border-dashed border-[var(--border)]">
        <p className="text-[13px] font-medium" style={{ color: 'var(--text-muted)' }}>
          No recent activity
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0 pl-2">
      <AnimatePresence initial={false}>
        {checkIns.map((ci, idx) => (
          <motion.div
            key={ci.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex gap-4 py-3 relative"
          >
            {/* Timeline connector */}
            <div className="flex flex-col items-center shrink-0 pt-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0 z-10"
                style={{
                  background: idx === 0 ? 'var(--accent)' : 'var(--bg-tertiary)',
                  border: `2px solid ${idx === 0 ? 'var(--bg-canvas)' : 'var(--border)'}`,
                  boxShadow: idx === 0 ? '0 0 12px var(--accent-glow)' : 'none',
                }}
              />
              {idx < checkIns.length - 1 && (
                <div
                  className="w-[2px] flex-1 mt-2 rounded-full"
                  style={{ background: 'var(--border)' }}
                />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 bg-[var(--bg-primary)] p-3 rounded-2xl border border-[var(--border)] shadow-sm">
              <p
                className="text-[13px] leading-relaxed font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                {ci.summary}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Clock size={10} style={{ color: 'var(--text-muted)' }} />
                <span className="text-[12px] tracking-wide font-medium" style={{ color: 'var(--text-muted)' }}>
                  {formatRelativeTime(ci.createdAt)}
                </span>
                {ci.authorType && (
                  <span
                    className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md"
                    style={{
                      color: ci.authorType === 'manager' ? 'var(--warning)' : 'var(--accent)',
                      background:
                        ci.authorType === 'manager'
                          ? 'rgba(245, 158, 11, 0.1)'
                          : 'rgba(6, 182, 212, 0.1)',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {ci.authorType}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
