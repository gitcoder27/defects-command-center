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
    <aside className="md-glass-panel flex min-h-0 flex-col rounded-[20px]">
      <div className="border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
        <div className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--md-accent)' }}>
          Task Rail
        </div>
        <p className="mt-1 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
          Scan every open item without leaving the page.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {items.length === 0 ? (
          <div className="rounded-[16px] border border-dashed px-4 py-6 text-center text-[12px]" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            No open tasks match the current search or filters.
          </div>
        ) : (
          <div className="space-y-2">
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
      className="w-full rounded-[16px] border px-3 py-3 text-left transition-all"
      style={{
        borderColor: isSelected ? 'var(--md-accent)' : 'var(--border)',
        background: isSelected ? 'var(--md-accent-glow)' : 'var(--bg-secondary)',
        boxShadow: isSelected ? '0 12px 24px rgba(15,23,42,0.08)' : undefined,
      }}
    >
      <div className="flex items-start gap-2">
        <span style={{ color: isOverdue ? 'var(--danger)' : 'var(--md-accent)' }}>
          {item.kind === 'meeting' ? <CalendarCheck size={14} /> : item.status === 'waiting' ? <Clock3 size={14} /> : <CircleDot size={14} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            {item.title}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]">
            <Chip>{item.status.replace(/_/g, ' ')}</Chip>
            <Chip>{item.priority}</Chip>
            {item.assignee && <Chip>{item.assignee.displayName}</Chip>}
            {item.kind === 'meeting' && item.plannedStartAt && <Chip>{new Date(item.plannedStartAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Chip>}
            {isOverdue && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-1" style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--danger)' }}>
                <AlertTriangle size={10} />
                Overdue
              </span>
            )}
          </div>
          {item.nextAction && (
            <div className="mt-2 line-clamp-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              {item.nextAction}
            </div>
          )}
        </div>
        {(item.status === 'done' || item.status === 'cancelled') && <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />}
      </div>
    </button>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full px-2 py-1" style={{ background: 'rgba(15,23,42,0.08)', color: 'var(--text-secondary)' }}>
      {children}
    </span>
  );
}
