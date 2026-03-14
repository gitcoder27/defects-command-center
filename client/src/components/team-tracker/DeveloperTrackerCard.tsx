import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, MessageSquare, AlertTriangle, Plus, UserMinus } from 'lucide-react';
import type { TrackerDeveloperDay, Issue } from '@/types';
import { TrackerStatusPill } from './TrackerStatusPill';
import { TrackerItemRow } from './TrackerItemRow';
import { QuickAddTaskModal } from './QuickAddTaskModal';
import { TrackerSignalBadges } from './TrackerSignalBadges';
import { formatRelativeTime } from '@/lib/utils';

interface DeveloperTrackerCardProps {
  day: TrackerDeveloperDay;
  index: number;
  onOpenDrawer: (accountId: string) => void;
  onMarkInactive: (day: TrackerDeveloperDay) => void;
  onSetCurrent: (itemId: number) => void;
  onMarkDone: (itemId: number) => void;
  onQuickAdd: (params: { accountId: string; title: string; jiraKey?: string; note?: string }) => void;
  issues?: Issue[];
  isQuickAddPending?: boolean;
}

export function DeveloperTrackerCard({
  day,
  index,
  onOpenDrawer,
  onMarkInactive,
  onSetCurrent,
  onMarkDone,
  onQuickAdd,
  issues,
  isQuickAddPending,
}: DeveloperTrackerCardProps) {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const assignedTodayCount = (day.currentItem ? 1 : 0) + day.plannedItems.length;
  const loadLabel = day.capacityUnits ? `${assignedTodayCount}/${day.capacityUnits}` : `${assignedTodayCount}`;
  const initials = day.developer.displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const isAlert =
    day.status === 'blocked' ||
    day.signals.risk.overdueLinkedWork ||
    day.signals.freshness.staleWithOpenRisk;
  const borderColor = day.status === 'blocked'
    ? 'var(--danger)'
    : day.signals.risk.overdueLinkedWork
    ? 'rgba(239, 68, 68, 0.45)'
    : day.signals.freshness.staleWithOpenRisk || day.status === 'at_risk' || day.signals.risk.overCapacity
    ? 'rgba(245, 158, 11, 0.45)'
    : day.signals.freshness.staleByTime
    ? 'rgba(245, 158, 11, 0.28)'
    : 'var(--border)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      className="dashboard-panel-soft rounded-2xl p-3 cursor-pointer transition-all hover:shadow-lg relative overflow-hidden"
      style={{
        border: `1px solid ${borderColor}`,
        boxShadow: isAlert ? `0 0 20px ${borderColor}33` : undefined,
      }}
      onClick={() => onOpenDrawer(day.developer.accountId)}
    >
      {/* Stale pulse */}
      {day.signals.freshness.staleByTime && !isAlert && (
        <div
          className="absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse"
          style={{ background: 'var(--warning)', boxShadow: '0 0 8px var(--warning)' }}
          title="Freshness follow-up stale"
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-2.5 mb-2.5">
        <div
          className="h-8 w-8 rounded-xl flex items-center justify-center text-[11px] font-bold shrink-0"
          style={{
            background: `linear-gradient(135deg, var(--accent-glow), var(--bg-tertiary))`,
            color: 'var(--accent)',
            border: '1px solid var(--border)',
          }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {day.developer.displayName}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <TrackerStatusPill status={day.status} />
            <span className="text-[10px] font-mono" style={{ color: day.capacityUnits && assignedTodayCount > day.capacityUnits ? 'var(--danger)' : 'var(--text-muted)' }}>
              {loadLabel} load
            </span>
            {day.completedItems.length > 0 && (
              <span className="text-[10px] font-mono" style={{ color: 'var(--success)' }}>
                {day.completedItems.length} done
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Current item */}
      {day.currentItem ? (
        <div className="mb-2">
          <div className="text-[9px] font-semibold uppercase mb-0.5" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
            Working on
          </div>
          <TrackerItemRow item={day.currentItem} compact onSetCurrent={onSetCurrent} onMarkDone={onMarkDone} />
        </div>
      ) : (
        <div
          className="mb-2 px-2 py-1.5 rounded-lg flex items-center gap-1.5"
          style={{ background: 'rgba(245, 158, 11, 0.06)' }}
        >
          <AlertTriangle size={10} style={{ color: 'var(--warning)' }} />
          <span className="text-[11px]" style={{ color: 'var(--warning)' }}>No current item</span>
        </div>
      )}

      {/* Next planned items */}
      {day.plannedItems.length > 0 && (
        <div className="mb-2">
          <div className="text-[9px] font-semibold uppercase mb-0.5" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
            Next up ({day.plannedItems.length})
          </div>
          <div className="space-y-0.5">
            {day.plannedItems.slice(0, 3).map((item) => (
              <TrackerItemRow
                key={item.id}
                item={item}
                compact
                onSetCurrent={onSetCurrent}
                onMarkDone={onMarkDone}
              />
            ))}
            {day.plannedItems.length > 3 && (
              <span className="text-[10px] pl-2" style={{ color: 'var(--text-muted)' }}>
                +{day.plannedItems.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      <div className="mb-2">
        <TrackerSignalBadges day={day} compact maxItems={3} />
      </div>

      {/* Footer */}
      <div
        className="flex items-center gap-2 pt-2 mt-auto"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-1 shrink-0">
          <Clock size={10} style={{ color: 'var(--text-muted)' }} />
          <span className="text-[10px]" style={{ color: day.signals.freshness.staleByTime ? 'var(--warning)' : 'var(--text-muted)' }}>
            {day.lastCheckInAt ? formatRelativeTime(day.lastCheckInAt) : 'No check-in'}
          </span>
        </div>
        {day.checkIns.length > 0 && (
          <div className="flex items-center gap-1 shrink-0">
            <MessageSquare size={10} style={{ color: 'var(--text-muted)' }} />
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {day.checkIns.length}
            </span>
          </div>
        )}
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          {day.managerNotes && (
            <span className="text-[10px] truncate" style={{ color: 'var(--text-muted)', maxWidth: 80 }}>
              {day.managerNotes}
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMarkInactive(day);
            }}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium transition-all hover:brightness-125"
            style={{
              background: 'rgba(245, 158, 11, 0.1)',
              color: 'var(--warning)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
            }}
            title="Mark developer inactive"
          >
            <UserMinus size={9} />
            Inactive
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setQuickAddOpen(true);
            }}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium transition-all hover:brightness-125"
            style={{
              background: 'var(--accent-glow)',
              color: 'var(--accent)',
              border: '1px solid color-mix(in srgb, var(--accent) 28%, transparent)',
            }}
            title="Quick add a task"
          >
            <Plus size={9} />
            Add task
          </button>
        </div>
      </div>

      {/* Quick-add modal (portal) */}
      <QuickAddTaskModal
        open={quickAddOpen}
        developerName={day.developer.displayName}
        developerAccountId={day.developer.accountId}
        issues={issues}
        isPending={isQuickAddPending}
        onAdd={(params) => {
          onQuickAdd(params);
          setQuickAddOpen(false);
        }}
        onClose={() => setQuickAddOpen(false)}
      />
    </motion.div>
  );
}
