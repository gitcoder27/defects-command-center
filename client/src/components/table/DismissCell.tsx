import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle, Check, X } from 'lucide-react';

interface DismissCellProps {
  issueKey: string;
  onConfirm: (issueKey: string, e: React.MouseEvent) => void;
}

const AUTO_REVERT_MS = 3000;

export function DismissCell({ issueKey, onConfirm }: DismissCellProps) {
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const startConfirm = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setConfirming(true);
    },
    []
  );

  const cancel = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setConfirming(false);
    },
    []
  );

  const confirm = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setConfirming(false);
      onConfirm(issueKey, e);
    },
    [issueKey, onConfirm]
  );

  // Auto-revert after timeout
  useEffect(() => {
    if (!confirming) return;
    timerRef.current = setTimeout(() => setConfirming(false), AUTO_REVERT_MS);
    return () => clearTimeout(timerRef.current);
  }, [confirming]);

  return (
    <div
      className="flex items-center justify-center"
      style={{ minWidth: 28, height: 28 }}
      data-dismiss-cell
    >
      <AnimatePresence mode="wait" initial={false}>
        {!confirming ? (
          <motion.button
            key="dismiss"
            type="button"
            onClick={startConfirm}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.15 }}
            className="h-7 w-7 rounded-md flex items-center justify-center transition-colors opacity-0 group-hover/row:opacity-50 hover:!opacity-100 hover:bg-[var(--bg-tertiary)]"
            style={{ color: 'var(--text-muted)' }}
            title="Dismiss — stop tracking this defect"
            aria-label={`Dismiss ${issueKey}`}
          >
            <XCircle size={15} />
          </motion.button>
        ) : (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-0.5"
          >
            <button
              type="button"
              onClick={confirm}
              className="h-6 w-6 rounded-md flex items-center justify-center transition-all hover:scale-110"
              style={{
                color: '#fff',
                background: 'var(--success)',
                boxShadow: '0 0 0 1px rgba(16,185,129,0.3), 0 1px 3px rgba(0,0,0,0.15)',
              }}
              title="Confirm dismiss"
              aria-label={`Confirm dismiss ${issueKey}`}
            >
              <Check size={13} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={cancel}
              className="h-6 w-6 rounded-md flex items-center justify-center transition-all hover:scale-110"
              style={{
                color: 'var(--text-muted)',
                background: 'var(--bg-tertiary)',
                boxShadow: '0 0 0 1px var(--border)',
              }}
              title="Cancel"
              aria-label="Cancel dismiss"
            >
              <X size={12} strokeWidth={2.5} />
            </button>
            {/* Countdown ring */}
            <svg
              width="6"
              height="28"
              viewBox="0 0 6 28"
              className="absolute -right-1.5 top-0"
              style={{ opacity: 0.3 }}
            >
              <motion.line
                x1="3"
                y1="2"
                x2="3"
                y2="26"
                stroke="var(--text-muted)"
                strokeWidth="2"
                strokeLinecap="round"
                initial={{ pathLength: 1 }}
                animate={{ pathLength: 0 }}
                transition={{ duration: AUTO_REVERT_MS / 1000, ease: 'linear' }}
              />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
