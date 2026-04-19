import { motion } from 'framer-motion';
import type { TrackerDeveloperDay, TrackerDeveloperGroup, Issue } from '@/types';
import { DeveloperTrackerCard } from './DeveloperTrackerCard';

interface TrackerBoardProps {
  date: string;
  developers: TrackerDeveloperDay[];
  groups: TrackerDeveloperGroup[];
  isGrouped: boolean;
  searchActive: boolean;
  onOpenDrawer: (accountId: string) => void;
  onOpenTaskDetail?: (itemId: number, managerDeskItemId?: number) => void;
  onMarkInactive: (day: TrackerDeveloperDay) => void;
  onSetCurrent: (itemId: number) => void;
  onMarkDone: (itemId: number) => void;
  onQuickAdd: (params: { accountId: string; title: string; jiraKey?: string; note?: string }) => void;
  issues?: Issue[];
  isQuickAddPending?: boolean;
  readOnly?: boolean;
}

const groupColors: Record<string, string> = {
  blocked: 'var(--danger)',
  at_risk: 'var(--warning)',
  waiting: 'var(--info)',
  on_track: 'var(--success)',
  done_for_today: 'var(--success)',
  needs_attention: 'var(--warning)',
  stable: 'var(--accent)',
  all: 'var(--accent)',
};

function CardGrid({
  developers,
  date,
  indexOffset,
  onOpenDrawer,
  onOpenTaskDetail,
  onMarkInactive,
  onSetCurrent,
  onMarkDone,
  onQuickAdd,
  issues,
  isQuickAddPending,
  readOnly,
}: {
  developers: TrackerDeveloperDay[];
  date: string;
  indexOffset: number;
  onOpenDrawer: (accountId: string) => void;
  onOpenTaskDetail?: (itemId: number, managerDeskItemId?: number) => void;
  onMarkInactive: (day: TrackerDeveloperDay) => void;
  onSetCurrent: (itemId: number) => void;
  onMarkDone: (itemId: number) => void;
  onQuickAdd: (params: { accountId: string; title: string; jiraKey?: string; note?: string }) => void;
  issues?: Issue[];
  isQuickAddPending?: boolean;
  readOnly?: boolean;
}) {
  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {developers.map((day, i) => (
        <DeveloperTrackerCard
          key={day.developer.accountId}
          day={day}
          date={date}
          index={indexOffset + i}
          onOpenDrawer={onOpenDrawer}
          onOpenTaskDetail={onOpenTaskDetail}
          onMarkInactive={onMarkInactive}
          onSetCurrent={onSetCurrent}
          onMarkDone={onMarkDone}
          onQuickAdd={onQuickAdd}
          issues={issues}
          isQuickAddPending={isQuickAddPending}
          readOnly={readOnly}
        />
      ))}
    </div>
  );
}

export function TrackerBoard({
  date,
  developers,
  groups,
  isGrouped,
  searchActive,
  onOpenDrawer,
  onOpenTaskDetail,
  onMarkInactive,
  onSetCurrent,
  onMarkDone,
  onQuickAdd,
  issues,
  isQuickAddPending,
  readOnly = false,
}: TrackerBoardProps) {
  const visibleCount = isGrouped
    ? groups.reduce((sum, g) => sum + g.developers.length, 0)
    : developers.length;

  if (visibleCount === 0) {
    return (
      <div className="flex-1 flex items-center justify-center py-16">
        <div className="text-center">
          <div className="text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            {searchActive ? 'No developers match your search' : 'No developers match this filter'}
          </div>
          <div className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {searchActive ? 'Try different search terms or clear the search' : 'Try a different filter or add new team members'}
          </div>
        </div>
      </div>
    );
  }

  const sharedProps = {
    date,
    onOpenDrawer,
    onOpenTaskDetail,
    onMarkInactive,
    onSetCurrent,
    onMarkDone,
    onQuickAdd,
    issues,
    isQuickAddPending,
    readOnly,
  };

  if (!isGrouped) {
    return <CardGrid developers={developers} indexOffset={0} {...sharedProps} />;
  }

  let runningOffset = 0;
  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const offset = runningOffset;
        runningOffset += group.developers.length;
        const color = groupColors[group.key] ?? 'var(--accent)';
        return (
          <motion.div
            key={group.key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-2.5 mb-2.5 px-0.5">
              <div
                className="h-2 w-2 rounded-full shrink-0"
                style={{ background: color }}
              />
              <span
                className="text-[12px] font-semibold uppercase tracking-wider"
                style={{ color }}
              >
                {group.label}
              </span>
              <span
                className="text-[10px] font-mono font-semibold rounded-full px-1.5 py-0.5"
                style={{
                  background: `color-mix(in srgb, ${color} 12%, transparent)`,
                  color,
                }}
              >
                {group.count}
              </span>
              <div
                className="flex-1 h-px"
                style={{ background: `color-mix(in srgb, ${color} 20%, transparent)` }}
              />
            </div>
            <CardGrid developers={group.developers} indexOffset={offset} {...sharedProps} />
          </motion.div>
        );
      })}
    </div>
  );
}
