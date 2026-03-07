import type { TrackerDeveloperDay } from '@/types';
import { DeveloperTrackerCard } from './DeveloperTrackerCard';
import type { SummaryFilter } from './TrackerSummaryStrip';

interface TrackerBoardProps {
  developers: TrackerDeveloperDay[];
  filter: SummaryFilter;
  onOpenDrawer: (accountId: string) => void;
  onSetCurrent: (itemId: number) => void;
  onMarkDone: (itemId: number) => void;
}

function applyFilter(days: TrackerDeveloperDay[], filter: SummaryFilter): TrackerDeveloperDay[] {
  switch (filter) {
    case 'stale':
      return days.filter((d) => d.isStale);
    case 'blocked':
      return days.filter((d) => d.status === 'blocked');
    case 'at_risk':
      return days.filter((d) => d.status === 'at_risk');
    case 'waiting':
      return days.filter((d) => d.status === 'waiting');
    case 'no_current':
      return days.filter((d) => !d.currentItem);
    case 'done_for_today':
      return days.filter((d) => d.status === 'done_for_today');
    default:
      return days;
  }
}

export function TrackerBoard({ developers, filter, onOpenDrawer, onSetCurrent, onMarkDone }: TrackerBoardProps) {
  const filtered = applyFilter(developers, filter);

  if (filtered.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center py-16">
        <div className="text-center">
          <div className="text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            No developers match this filter
          </div>
          <div className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>
            Try a different filter or add new team members
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {filtered.map((day, i) => (
        <DeveloperTrackerCard
          key={day.developer.accountId}
          day={day}
          index={i}
          onOpenDrawer={onOpenDrawer}
          onSetCurrent={onSetCurrent}
          onMarkDone={onMarkDone}
        />
      ))}
    </div>
  );
}
