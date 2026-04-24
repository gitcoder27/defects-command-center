import { CheckCircle2 } from 'lucide-react';
import type { TrackerAttentionItem } from '@/types';
import { AttentionCard } from './AttentionCard';

interface AttentionQueueProps {
  items: TrackerAttentionItem[];
  date: string;
  onOpenDrawer: (accountId: string) => void;
  onMarkInactive: (accountId: string) => void;
  onCaptureFollowUp: (item: TrackerAttentionItem) => void;
  onSetCurrent?: (itemId: number) => void;
}

export function AttentionQueue({
  items,
  date,
  onOpenDrawer,
  onMarkInactive,
  onCaptureFollowUp,
  onSetCurrent,
}: AttentionQueueProps) {
  return (
    <section className="rounded-xl border" style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--bg-secondary) 72%, transparent)' }}>
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
        <div>
          <div className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Needs attention
          </div>
          <div className="mt-0.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
            Sorted by the current risk and freshness signals.
          </div>
        </div>
        <div className="rounded-md px-2 py-1 text-[11px] font-semibold tabular-nums" style={{ color: 'var(--accent)', background: 'var(--accent-glow)' }}>
          {items.length}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex items-center gap-2 px-4 py-8">
          <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
          <div>
            <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              No one needs attention right now.
            </div>
            <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              Switch to Team when you want the full roster.
            </div>
          </div>
        </div>
      ) : (
        <div>
          {items.map((item, index) => (
            <AttentionCard
              key={item.developer.accountId}
              item={item}
              index={index}
              date={date}
              onOpen={() => onOpenDrawer(item.developer.accountId)}
              onMarkInactive={() => onMarkInactive(item.developer.accountId)}
              onCaptureFollowUp={() => onCaptureFollowUp(item)}
              onSetCurrent={onSetCurrent}
            />
          ))}
        </div>
      )}
    </section>
  );
}
