import { AlertTriangle } from 'lucide-react';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { useOverview } from '@/hooks/useOverview';
import { AnimatePresence, motion } from 'framer-motion';

export function ErrorBanner() {
  const { error: overviewError } = useOverview();
  const { data: syncStatus } = useSyncStatus();

  const isApiDown = !!overviewError;
  const isSyncError = syncStatus?.status === 'error';
  const isRateLimited = syncStatus?.errorMessage?.toLowerCase().includes('rate limit');

  const message = isRateLimited
    ? 'Jira rate limit hit. Auto-retrying shortly.'
    : isApiDown
    ? 'Cannot reach server. Showing last known data.'
    : isSyncError
    ? `Sync error: ${syncStatus.errorMessage}`
    : null;

  if (!message) return null;

  const isWarning = isRateLimited || isApiDown;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="px-5 py-2 flex items-center gap-2 text-[12px] font-medium"
        style={{
          background: isWarning
            ? 'rgba(245,158,11,0.1)'
            : 'rgba(239,68,68,0.1)',
          borderBottom: `1px solid ${isWarning ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'}`,
          color: isWarning ? 'var(--warning)' : 'var(--danger)',
        }}
      >
        <AlertTriangle size={14} />
        {message}
      </motion.div>
    </AnimatePresence>
  );
}
