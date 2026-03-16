import type { ReactNode } from 'react';
import { AlertTriangle, CalendarCheck, CheckCircle2, CircleDot, Clock3 } from 'lucide-react';
import type { ManagerDeskItem } from '@/types/manager-desk';

interface Props {
  items: ManagerDeskItem[];
  selectedItemId: number | null;
  onSelect: (item: ManagerDeskItem) => void;
}

export function TaskRail({ items, selectedItemId, onSelect }: Props) {
  return (
    <aside className="md-glass-panel flex min-h-0 flex-col rounded-xl">
      <div className="border-b px-3 py-1.5" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--md-accent)' }}>
            Rail
          </span>
          <span className="text-[9px] font-mono tabular-nums" style={{ color: 'var(--text-muted)' }}>
            {items.length}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1">
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed px-3 py-4 text-center text-[10px]" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            No open tasks.
          </div>
        ) : (
          <div className="space-y-0.5">
            {items.map((item) => (
              <TaskRailRow
                key={item.id}
                item={item}
                isSelected={item.id === selectedItemId}
                onSelect={() => onSelect(item)}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

function TaskRailRow({
  item,
  isSelected,
  onSelect,
}: {
  item: ManagerDeskItem;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isOverdue = Boolean(item.followUpAt && item.status !== 'done' && item.status !== 'cancelled' && new Date(item.followUpAt).getTime() < Date.now());

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full rounded-lg border px-2 py-1.5 text-left transition-all"
      style={{
        borderColor: isSelected ? 'var(--md-accent)' : 'var(--border)',
        background: isSelected ? 'var(--md-accent-glow)' : 'var(--bg-secondary)',
        boxShadow: isSelected ? '0 4px 12px rgba(15,23,42,0.06)' : undefined,
      }}
    >
      <div className="flex items-center gap-1.5">
        <span className="flex-shrink-0" style={{ color: isOverdue ? 'var(--danger)' : 'var(--md-accent)' }}>
          {item.kind === 'meeting' ? <CalendarCheck size={11} /> : item.status === 'waiting' ? <Clock3 size={11} /> : <CircleDot size={11} />}
        </span>
        <span className="min-w-0 flex-1 truncate text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>
          {item.title}
        </span>
        {isOverdue && <AlertTriangle size={9} style={{ color: 'var(--danger)' }} />}
        {(item.status === 'done' || item.status === 'cancelled') && <CheckCircle2 size={10} style={{ color: 'var(--success)' }} />}
      </div>
      <div className="mt-0.5 flex items-center gap-1 pl-5">
        <Chip>{item.status.replace(/_/g, ' ')}</Chip>
        {item.priority !== 'low' && <Chip>{item.priority}</Chip>}
        {item.assignee && <Chip>{item.assignee.displayName.split(' ')[0]}</Chip>}
      </div>
    </button>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em]" style={{ background: 'rgba(15,23,42,0.08)', color: 'var(--text-secondary)' }}>
      {children}
    </span>
  );
}
