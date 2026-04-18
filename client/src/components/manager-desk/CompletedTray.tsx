import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ManagerDeskItem, ManagerDeskStatus } from '@/types/manager-desk';
import { DeskItemCard } from './DeskItemCard';

interface Props {
  items: ManagerDeskItem[];
  onSelect: (item: ManagerDeskItem) => void;
  onStatusChange?: (itemId: number, status: ManagerDeskStatus) => void;
  readOnly?: boolean;
}

export function CompletedTray({ items, onSelect, onStatusChange, readOnly = false }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <section className="md-glass-panel rounded-xl">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--success)' }}>
            Completed
          </span>
          <span className="rounded-md px-1.5 py-0.5 text-[9px] font-bold tabular-nums" style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--success)' }}>
            {items.length}
          </span>
        </div>

        <ChevronDown
          size={13}
          style={{ color: 'var(--text-muted)', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s ease' }}
        />
      </button>

      {open && (
        <div className="border-t p-1.5" style={{ borderColor: 'var(--border)' }}>
          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed px-3 py-3 text-[11px]" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              Nothing completed yet.
            </div>
          ) : (
            <div className="space-y-1">
              {items.map((item) => (
                <DeskItemCard
                  key={item.id}
                  item={item}
                  onSelect={() => onSelect(item)}
                  onStatusChange={onStatusChange ? (status) => onStatusChange(item.id, status) : undefined}
                  variant="completed"
                  readOnly={readOnly}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
