import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, addDays, parseISO } from 'date-fns';
import { ArrowRightFromLine, X, CheckSquare, Square } from 'lucide-react';
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

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}
        onClick={onClose}
      />

      {/* Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <ArrowRightFromLine size={14} style={{ color: 'var(--md-accent)' }} />
            <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              Carry Forward
            </span>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Target date */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest block mb-1" style={{ color: 'var(--text-muted)' }}>
              Carry to date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="w-full rounded-lg px-2.5 py-1.5 text-[12px] outline-none"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                colorScheme: 'dark',
              }}
            />
          </div>

          {/* Item list */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Items to carry ({selected.size}/{items.length})
              </label>
              <button
                onClick={toggleAll}
                className="text-[10px] font-medium"
                style={{ color: 'var(--md-accent)' }}
              >
                {selected.size === items.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>

            <div
              className="max-h-52 overflow-y-auto space-y-0.5 rounded-lg p-1"
              style={{ background: 'var(--bg-secondary)' }}
            >
              {items.map(item => (
                <button
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors"
                  style={{
                    background: selected.has(item.id) ? 'var(--bg-tertiary)' : 'transparent',
                  }}
                >
                  {selected.has(item.id) ? (
                    <CheckSquare size={13} style={{ color: 'var(--md-accent)' }} />
                  ) : (
                    <Square size={13} style={{ color: 'var(--text-muted)' }} />
                  )}
                  <span className="text-[12px] flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
                    {item.title}
                  </span>
                  <span className="text-[9px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>
                    {KIND_LABELS[item.kind]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => onConfirm(toDate, selected.size === items.length ? undefined : Array.from(selected))}
            disabled={selected.size === 0 || isPending}
            className="w-full rounded-xl py-2 text-[12px] font-bold uppercase tracking-wide transition-all disabled:opacity-40"
            style={{
              background: 'var(--md-accent)',
              color: '#000',
            }}
          >
            {isPending ? 'Carrying…' : `Carry ${selected.size} item${selected.size !== 1 ? 's' : ''} forward`}
          </button>
        </div>
      </motion.div>
    </>
  );
}
