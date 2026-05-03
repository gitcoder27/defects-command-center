import { Target } from 'lucide-react';
import { TodayActionRow } from './TodayActionRow';
import type { TodayActionCommand, TodayActionItem } from '@/types';

interface TodayActionQueueProps {
  isLoading: boolean;
  items: TodayActionItem[];
  pendingTargetKey?: string;
  onRunCommand: (command: TodayActionCommand, preset?: 'later_today' | 'tomorrow' | 'next_week') => void;
}

export function TodayActionQueue({ isLoading, items, pendingTargetKey, onRunCommand }: TodayActionQueueProps) {
  const visibleItems = items.slice(0, 8);
  const hiddenCount = Math.max(items.length - visibleItems.length, 0);

  return (
    <section className="min-h-0 overflow-auto border-b px-5 py-5 lg:border-b-0 lg:border-r xl:px-8" style={{ borderColor: 'var(--today-line-strong)' }}>
      <div className="flex items-start gap-3">
        <Target size={18} className="mt-0.5" style={{ color: 'var(--accent)' }} />
        <div>
          <h1 className="text-[17px] font-semibold leading-6" style={{ color: 'var(--text-primary)' }}>Action queue</h1>
          <p className="mt-1 text-[13px] leading-5" style={{ color: 'var(--text-secondary)' }}>Exact targets, ranked for today</p>
        </div>
      </div>

      <div className="mt-5">
        {isLoading ? (
          <TodayQueueSkeleton />
        ) : (
          <div className="space-y-1.5">
            {visibleItems.map((item, index) => (
              <TodayActionRow
                key={item.id}
                item={item}
                featured={index === 0 && item.type !== 'calm'}
                isPending={pendingTargetKey === targetKey(item)}
                onRunCommand={onRunCommand}
              />
            ))}
            {hiddenCount > 0 ? (
              <div className="px-3.5 py-3 text-[12px]" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--today-line)' }}>
                +{hiddenCount} more in the source workflows
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

function targetKey(item: TodayActionItem): string {
  return [
    item.target.type,
    item.target.issueKey,
    item.target.developerAccountId,
    item.target.managerDeskItemId,
    item.target.trackerItemId,
  ].filter(Boolean).join(':');
}

function TodayQueueSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3, 4].map((row) => (
        <div key={row} className="grid grid-cols-[30px_minmax(0,1fr)] gap-4 px-1 py-3 md:grid-cols-[30px_minmax(0,1.15fr)_minmax(130px,0.65fr)_112px_154px_34px]" style={{ borderBottom: '1px solid var(--today-line)' }}>
          <div className="h-6 w-6 animate-pulse rounded-md" style={{ background: 'var(--bg-tertiary)' }} />
          <div className="h-4 animate-pulse rounded-sm" style={{ background: 'var(--bg-tertiary)' }} />
          <div className="hidden h-4 animate-pulse rounded-sm md:block" style={{ background: 'var(--bg-tertiary)' }} />
          <div className="hidden h-6 animate-pulse rounded-md md:block" style={{ background: 'var(--bg-tertiary)' }} />
          <div className="hidden h-6 animate-pulse rounded-md md:block" style={{ background: 'var(--bg-tertiary)' }} />
          <div className="hidden h-6 animate-pulse rounded-md md:block" style={{ background: 'var(--bg-tertiary)' }} />
        </div>
      ))}
    </div>
  );
}
