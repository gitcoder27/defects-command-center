import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { format, addDays, parseISO } from 'date-fns';
import { ArrowRightFromLine, CalendarDays, CheckSquare, Layers3, Square, X } from 'lucide-react';
import type { ManagerDeskItem } from '@/types/manager-desk';
import { KIND_LABELS } from '@/types/manager-desk';

interface Props {
  items: ManagerDeskItem[];
  fromDate: string;
  isPending: boolean;
  onConfirm: (toDate: string, itemIds?: number[]) => void;
  onClose: () => void;
}

export function CarryForwardDialog({ items, fromDate, isPending, onConfirm, onClose }: Props) {
  const defaultToDate = useMemo(
    () => format(addDays(parseISO(fromDate), 1), 'yyyy-MM-dd'),
    [fromDate],
  );
  const [toDate, setToDate] = useState(defaultToDate);
  const [selected, setSelected] = useState<Set<number>>(() => new Set(items.map(i => i.id)));
  const formattedFromDate = useMemo(() => format(parseISO(fromDate), 'EEE, MMM d'), [fromDate]);
  const formattedToDate = useMemo(() => format(parseISO(toDate), 'EEE, MMM d'), [toDate]);
  const isFutureDate = toDate > fromDate;

  useEffect(() => {
    setToDate(defaultToDate);
  }, [defaultToDate]);

  useEffect(() => {
    setSelected(new Set(items.map(i => i.id)));
  }, [items]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const toggle = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map(i => i.id)));
    }
  };

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0"
        style={{ background: 'rgba(6, 10, 15, 0.62)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex max-h-[min(88vh,760px)] w-full max-w-[720px] flex-col overflow-hidden rounded-[28px]"
        style={{
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--bg-primary) 95%, rgba(217,169,78,0.04)) 0%, var(--bg-secondary) 100%)',
          border: '1px solid color-mix(in srgb, var(--md-accent) 18%, var(--border-strong) 82%)',
          boxShadow: '0 32px 88px rgba(0,0,0,0.42)',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="manager-desk-carry-forward-title"
        onClick={(event) => event.stopPropagation()}
      >
          <div
            className="shrink-0 border-b px-4 py-4 sm:px-5"
            style={{
              borderColor: 'color-mix(in srgb, var(--md-accent) 14%, var(--border) 86%)',
              background:
                'linear-gradient(135deg, color-mix(in srgb, var(--md-accent-glow) 78%, transparent) 0%, transparent 70%)',
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-2xl"
                    style={{
                      background: 'var(--md-accent-glow)',
                      color: 'var(--md-accent)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)',
                    }}
                  >
                    <ArrowRightFromLine size={18} />
                  </div>
                  <div>
                    <div
                      id="manager-desk-carry-forward-title"
                      className="text-[16px] font-semibold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      Carry Forward
                    </div>
                    <div className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                      Move unfinished work from {formattedFromDate} into a future desk view.
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <div
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium"
                    style={{
                      background: 'rgba(217,169,78,0.12)',
                      color: 'var(--md-accent)',
                      border: '1px solid rgba(217,169,78,0.22)',
                    }}
                  >
                    <Layers3 size={12} />
                    {selected.size} of {items.length} selected
                  </div>
                  <div
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium"
                    style={{
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <CalendarDays size={12} />
                    Target: {formattedToDate}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                aria-label="Close carry forward dialog"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-5">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <div>
                  <label
                    className="mb-1.5 block text-[11px] font-semibold uppercase"
                    style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}
                  >
                    Carry to date
                  </label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={e => setToDate(e.target.value)}
                    min={defaultToDate}
                    className="w-full rounded-xl px-3 py-2 text-[13px] outline-none"
                    style={{
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border)',
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={toggleAll}
                  className="rounded-xl px-3 py-2 text-[11px] font-semibold transition-colors"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--md-accent)',
                    border: '1px solid color-mix(in srgb, var(--md-accent) 18%, var(--border) 82%)',
                  }}
                >
                  {selected.size === items.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label
                    className="text-[11px] font-semibold uppercase"
                    style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}
                  >
                    Unfinished items
                  </label>
                  <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    Choose exactly what should appear on {formattedToDate}.
                  </span>
                </div>
                {!isFutureDate && (
                  <p className="mb-2 text-[11px]" style={{ color: 'var(--danger)' }}>
                    Carry forward only supports dates after {formattedFromDate}.
                  </p>
                )}

                <div
                  className="space-y-1 rounded-[18px] p-2"
                  style={{ background: 'color-mix(in srgb, var(--bg-secondary) 88%, transparent)' }}
                >
                  {items.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggle(item.id)}
                      className="w-full rounded-2xl px-3 py-3 text-left transition-colors"
                      style={{
                        background: selected.has(item.id)
                          ? 'color-mix(in srgb, var(--md-accent-glow) 54%, var(--bg-tertiary) 46%)'
                          : 'transparent',
                        border: selected.has(item.id)
                          ? '1px solid color-mix(in srgb, var(--md-accent) 22%, transparent)'
                          : '1px solid transparent',
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="pt-0.5">
                          {selected.has(item.id) ? (
                            <CheckSquare size={15} style={{ color: 'var(--md-accent)' }} />
                          ) : (
                            <Square size={15} style={{ color: 'var(--text-muted)' }} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                            {item.title}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                              style={{
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-muted)',
                                border: '1px solid var(--border)',
                              }}
                            >
                              {KIND_LABELS[item.kind]}
                            </span>
                            <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                              {item.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div
            className="shrink-0 border-t px-4 py-4 sm:px-5"
            style={{
              borderColor: 'color-mix(in srgb, var(--md-accent) 14%, var(--border) 86%)',
              background: 'color-mix(in srgb, var(--bg-primary) 90%, transparent)',
            }}
          >
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-3 py-2 text-[12px] font-medium transition-colors"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => onConfirm(toDate, selected.size === items.length ? undefined : Array.from(selected))}
                disabled={selected.size === 0 || isPending || !isFutureDate}
                className="rounded-xl px-4 py-2 text-[12px] font-bold uppercase tracking-wide transition-all disabled:opacity-40"
                style={{
                  background: 'var(--md-accent)',
                  color: '#000',
                }}
              >
                {isPending ? 'Carrying…' : `Carry ${selected.size} item${selected.size !== 1 ? 's' : ''} forward`}
              </button>
            </div>
          </div>
      </motion.div>
    </div>,
    document.body,
  );
}
