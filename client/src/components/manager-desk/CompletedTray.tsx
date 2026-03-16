import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ManagerDeskItem, ManagerDeskStatus } from '@/types/manager-desk';
import { DeskItemCard } from './DeskItemCard';

interface Props {
  items: ManagerDeskItem[];
  onSelect: (item: ManagerDeskItem) => void;
  onStatusChange: (itemId: number, status: ManagerDeskStatus) => void;
}

export function CompletedTray({ items, onSelect, onStatusChange }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <section className="md-glass-panel rounded-[20px]">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--success)' }}>
            Completed
          </div>
          <p className="mt-1 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
            Keep done work accessible without stretching the main workspace.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--success)' }}>
            {items.length}
          </span>
          <ChevronDown
            size={16}
            style={{ color: 'var(--text-muted)', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s ease' }}
          />
        </div>
      </button>

      {open && (
        <div className="border-t p-2" style={{ borderColor: 'var(--border)' }}>
          {items.length === 0 ? (
            <div className="rounded-[16px] border border-dashed px-4 py-5 text-[12px]" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              Nothing completed yet.
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <DeskItemCard
                  key={item.id}
                  item={item}
                  onSelect={() => onSelect(item)}
                  onStatusChange={(status) => onStatusChange(item.id, status)}
                  variant="completed"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
