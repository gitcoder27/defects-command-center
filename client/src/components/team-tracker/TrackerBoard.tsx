import type { TrackerDeveloperDay, Issue } from '@/types';
import { DeveloperTrackerCard } from './DeveloperTrackerCard';
import type { SummaryFilter } from './TrackerSummaryStrip';

interface TrackerBoardProps {
  developers: TrackerDeveloperDay[];
  filter: SummaryFilter;
  onOpenDrawer: (accountId: string) => void;
  onMarkInactive: (day: TrackerDeveloperDay) => void;
  onSetCurrent: (itemId: number) => void;
  onMarkDone: (itemId: number) => void;
  onQuickAdd: (params: { accountId: string; title: string; jiraKey?: string; note?: string }) => void;
  issues?: Issue[];
  isQuickAddPending?: boolean;
}

function applyFilter(days: TrackerDeveloperDay[], filter: SummaryFilter): TrackerDeveloperDay[] {
  switch (filter) {
    case 'stale':
      return days.filter((d) => d.signals.freshness.staleByTime);
    case 'blocked':
      return days.filter((d) => d.status === 'blocked');
    case 'at_risk':
      return days.filter((d) => d.status === 'at_risk');
    case 'waiting':
      return days.filter((d) => d.status === 'waiting');
    case 'overdue_linked':
      return days.filter((d) => d.signals.risk.overdueLinkedWork);
    case 'over_capacity':
      return days.filter((d) => d.signals.risk.overCapacity);
    case 'status_follow_up':
      return days.filter((d) => d.signals.freshness.statusChangeWithoutFollowUp);
    case 'no_current':
      return days.filter((d) => !d.currentItem && d.status !== 'done_for_today');
    case 'done_for_today':
      return days.filter((d) => d.status === 'done_for_today');
    default:
      return days;
  }
}

export function TrackerBoard({
  developers,
  filter,
  onOpenDrawer,
  onMarkInactive,
  onSetCurrent,
  onMarkDone,
  onQuickAdd,
  issues,
  isQuickAddPending,
}: TrackerBoardProps) {
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
          onMarkInactive={onMarkInactive}
          onSetCurrent={onSetCurrent}
          onMarkDone={onMarkDone}
          onQuickAdd={onQuickAdd}
          issues={issues}
          isQuickAddPending={isQuickAddPending}
        />
      ))}
    </div>
  );
}
