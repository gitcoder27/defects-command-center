import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CheckCheck } from 'lucide-react';
import { useAlerts, useDismissAlerts } from '@/hooks/useAlerts';
import { useToast } from '@/context/ToastContext';
import type { Alert } from '@/types';
import { AlertList } from './AlertList';

interface AlertInboxProps {
  enabled?: boolean;
  onAlertClick: (alert: Alert) => void;
}

export function AlertInbox({ enabled = true, onAlertClick }: AlertInboxProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToast();
  const { data: alerts = [] } = useAlerts({ enabled });
  const dismissAlerts = useDismissAlerts();

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleMouseDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const countLabel = useMemo(() => {
    if (alerts.length > 99) {
      return '99+';
    }
    return String(alerts.length);
  }, [alerts.length]);

  if (!enabled) {
    return null;
  }

  const runDismiss = (alertIds: string[]) => {
    dismissAlerts.mutate(
      { alertIds },
      {
        onError: () => {
          addToast({
            type: 'error',
            title: 'Failed to update alerts',
            message: 'The alert list could not be updated. Please try again.',
          });
        },
      },
    );
  };

  const handleClearAll = () => {
    if (alerts.length === 0) {
      return;
    }
    runDismiss(alerts.map((alert) => alert.id));
  };

  return (
    <div ref={containerRef} className="relative z-[320]">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl transition-all"
        style={{
          background: open
            ? 'color-mix(in srgb, var(--warning) 16%, var(--bg-tertiary))'
            : alerts.length > 0
            ? 'color-mix(in srgb, var(--warning) 10%, var(--bg-tertiary))'
            : 'transparent',
          color: alerts.length > 0 || open ? 'var(--warning)' : 'var(--text-secondary)',
        }}
        aria-label={alerts.length > 0 ? `${alerts.length} alerts need review` : 'Alerts inbox'}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={alerts.length > 0 ? `${alerts.length} alerts need review` : 'Alerts inbox'}
      >
        <Bell size={16} />
        {alerts.length > 0 ? (
          <span
            className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold"
            style={{
              background: 'var(--danger)',
              color: '#fff',
              boxShadow: '0 6px 16px rgba(239,68,68,0.28)',
            }}
          >
            {countLabel}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-full z-[320] mt-2 w-[min(420px,calc(100vw-1.5rem))] overflow-hidden rounded-[24px]"
            style={{
              background:
                'linear-gradient(180deg, color-mix(in srgb, var(--bg-secondary) 97%, white 3%) 0%, color-mix(in srgb, var(--bg-primary) 90%, var(--bg-secondary) 10%) 100%)',
              border: '1px solid var(--border)',
              boxShadow: '0 28px 60px rgba(0,0,0,0.26), 0 8px 20px rgba(0,0,0,0.14)',
            }}
          >
            <div className="border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Alerts inbox
                  </div>
                  <div className="mt-0.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    {alerts.length > 0
                      ? `${alerts.length} alert${alerts.length === 1 ? '' : 's'} currently need review`
                      : 'You are caught up for now.'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={alerts.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-semibold transition-all disabled:opacity-40"
                  style={{
                    background: 'color-mix(in srgb, var(--warning) 12%, transparent)',
                    color: 'var(--warning)',
                  }}
                >
                  <CheckCheck size={12} />
                  Clear all
                </button>
              </div>
            </div>

            <div className="max-h-[min(60vh,480px)] overflow-y-auto p-2">
              {alerts.length > 0 ? (
                <AlertList
                  alerts={alerts}
                  onAlertClick={(alert) => {
                    onAlertClick(alert);
                    setOpen(false);
                  }}
                  onDismissAlert={(alert) => runDismiss([alert.id])}
                />
              ) : (
                <div className="px-4 py-8 text-center">
                  <div
                    className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl"
                    style={{ background: 'color-mix(in srgb, var(--success) 16%, transparent)', color: 'var(--success)' }}
                  >
                    <CheckCheck size={18} />
                  </div>
                  <div className="mt-3 text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    No active alerts
                  </div>
                  <div className="mt-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    Cleared alerts will return only if the condition resolves and later reappears.
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
