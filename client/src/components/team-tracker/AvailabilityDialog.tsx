import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarX, X } from 'lucide-react';

interface AvailabilityDialogProps {
  open: boolean;
  developerName?: string;
  date: string;
  isPending?: boolean;
  onClose: () => void;
  onConfirm: (note?: string) => void;
}

export function AvailabilityDialog({
  open,
  developerName,
  date,
  isPending,
  onClose,
  onConfirm,
}: AvailabilityDialogProps) {
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) {
      setNote('');
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && developerName && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70]"
            style={{ background: 'rgba(2, 6, 23, 0.5)', backdropFilter: 'blur(3px)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-x-4 top-[18vh] z-[71] mx-auto w-full max-w-[420px] rounded-[24px] border p-4 shadow-2xl"
            style={{ borderColor: 'var(--border-strong)', background: 'var(--bg-secondary)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-2xl"
                  style={{ background: 'rgba(245, 158, 11, 0.12)', color: 'var(--warning)' }}
                >
                  <CalendarX size={18} />
                </div>
                <div>
                  <div className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Mark {developerName} inactive
                  </div>
                  <div className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                    Hidden from {date} onward until reactivated.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-xl"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
                aria-label="Close inactive dialog"
              >
                <X size={14} />
              </button>
            </div>

            <label className="mt-4 block text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Optional note
            </label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="PTO today, holiday, training, or another note..."
              rows={3}
              className="mt-1 w-full rounded-2xl border px-3 py-2 text-[13px] outline-none"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
              }}
            />

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-3 py-2 text-[12px] font-semibold"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onConfirm(note.trim() || undefined)}
                disabled={isPending}
                className="rounded-xl px-3 py-2 text-[12px] font-semibold disabled:opacity-50"
                style={{
                  background: 'rgba(245, 158, 11, 0.12)',
                  color: 'var(--warning)',
                  border: '1px solid rgba(245, 158, 11, 0.22)',
                }}
              >
                {isPending ? 'Saving…' : 'Mark inactive'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
