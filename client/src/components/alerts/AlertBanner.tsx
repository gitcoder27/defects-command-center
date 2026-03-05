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
        className="mx-5 my-1 rounded-lg px-4 py-2.5 flex items-center justify-between relative"
        style={{
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.2)',
        }}
      >
        <div className="flex items-center gap-2 text-[13px] font-medium" style={{ color: 'var(--warning)' }}>
          <AlertTriangle size={14} />
          <span>
            {alerts.length} alert{alerts.length !== 1 ? 's' : ''}: {summary}
          </span>
        </div>
        <button
          onClick={() => setShowList(!showList)}
          className="flex items-center gap-1 text-[12px] font-medium transition-colors hover:opacity-80"
          style={{ color: 'var(--warning)' }}
        >
          View All <ChevronRight size={12} />
        </button>

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
