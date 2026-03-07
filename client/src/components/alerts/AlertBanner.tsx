import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { useAlerts } from '@/hooks/useAlerts';
import { AlertList } from './AlertList';
import type { Alert } from '@/types';

interface AlertBannerProps {
  onAlertClick: (alert: Alert) => void;
}

export function AlertBanner({ onAlertClick }: AlertBannerProps) {
  const { data: alerts } = useAlerts();
  const [showList, setShowList] = useState(false);

  if (!alerts?.length) return null;

  const summary = summarizeAlerts(alerts);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.25, delay: 0.3 }}
        className="mx-2 mt-2 relative overflow-visible rounded-[20px] px-3 py-2.5 md:mx-3 md:mt-3"
        style={{
          background: 'linear-gradient(180deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.07) 100%)',
          border: '1px solid rgba(245,158,11,0.22)',
          boxShadow: 'var(--soft-shadow)',
        }}
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-2.5">
            <span className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(245,158,11,0.16)', color: 'var(--warning)' }}>
              <AlertTriangle size={14} />
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                {alerts.length} alert{alerts.length !== 1 ? 's' : ''} need review
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {summary}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowList(!showList)}
            className="flex items-center gap-1 text-[11px] font-medium transition-colors hover:opacity-80 self-start md:self-auto rounded-xl px-3 py-1.5"
            style={{ color: 'var(--warning)', background: 'rgba(245,158,11,0.1)' }}
          >
            {showList ? 'Hide Alerts' : 'View All'} <ChevronRight size={12} style={{ transform: showList ? 'rotate(90deg)' : 'none' }} />
          </button>
        </div>

        {showList && (
          <AlertList alerts={alerts} onAlertClick={(a) => { onAlertClick(a); setShowList(false); }} />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function summarizeAlerts(alerts: Alert[]): string {
  const counts: Record<string, number> = {};
  for (const a of alerts) {
    const label = a.type.replace(/_/g, ' ');
    counts[label] = (counts[label] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([type, count]) => `${count} ${type}`)
    .join(' · ');
}
