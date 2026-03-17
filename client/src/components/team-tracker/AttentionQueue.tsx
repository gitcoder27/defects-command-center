import { AlertTriangle } from 'lucide-react';
import type { TrackerAttentionItem } from '@/types';
import { AttentionCard } from './AttentionCard';

interface AttentionQueueProps {
  items: TrackerAttentionItem[];
  onOpenDrawer: (accountId: string) => void;
}

export function AttentionQueue({ items, onOpenDrawer }: AttentionQueueProps) {
  return (
    <section className="mb-4 rounded-[20px] border px-3 py-3" style={{ borderColor: 'var(--border-strong)', background: 'color-mix(in srgb, var(--bg-secondary) 92%, var(--accent-glow) 8%)' }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Needs Attention Now
          </div>
          <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            Ranked follow-ups from the current board state.
          </div>
        </div>
        <div className="rounded-full px-2 py-1 text-[10px] font-semibold" style={{ color: 'var(--accent)', background: 'var(--accent-glow)' }}>
          {items.length} active
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-3 flex items-center gap-2 rounded-2xl border px-3 py-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-tertiary)' }}>
          <AlertTriangle size={14} style={{ color: 'var(--success)' }} />
          <div className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
            Nothing urgent is ranked right now.
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((item, index) => (
            <AttentionCard
              key={item.developer.accountId}
              item={item}
              index={index}
              onOpen={() => onOpenDrawer(item.developer.accountId)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
