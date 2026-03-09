import { motion } from 'framer-motion';
import { Clock, MessageSquare, AlertTriangle } from 'lucide-react';
import type { TrackerDeveloperDay } from '@/types';
import { TrackerStatusPill } from './TrackerStatusPill';
import { TrackerItemRow } from './TrackerItemRow';
import { formatRelativeTime } from '@/lib/utils';

interface DeveloperTrackerCardProps {
  day: TrackerDeveloperDay;
  index: number;
  onOpenDrawer: (accountId: string) => void;
  onSetCurrent: (itemId: number) => void;
  onMarkDone: (itemId: number) => void;
}

export function DeveloperTrackerCard({
  day,
  index,
  onOpenDrawer,
  onSetCurrent,
  onMarkDone,
}: DeveloperTrackerCardProps) {
  const assignedTodayCount = (day.currentItem ? 1 : 0) + day.plannedItems.length;
  const loadLabel = day.capacityUnits ? `${assignedTodayCount}/${day.capacityUnits}` : `${assignedTodayCount}`;
  const initials = day.developer.displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const isAlert = day.status === 'blocked' || day.status === 'at_risk';
  const borderColor = isAlert
    ? day.status === 'blocked'
      ? 'var(--danger)'
      : 'var(--warning)'
    : day.isStale
    ? 'rgba(245, 158, 11, 0.4)'
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
      {day.isStale && !isAlert && (
        <div
          className="absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse"
          style={{ background: 'var(--warning)', boxShadow: '0 0 8px var(--warning)' }}
          title="Follow-up stale"
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

      {/* Footer */}
      <div
        className="flex items-center gap-3 pt-2 mt-auto"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-1">
          <Clock size={10} style={{ color: 'var(--text-muted)' }} />
          <span className="text-[10px]" style={{ color: day.isStale ? 'var(--warning)' : 'var(--text-muted)' }}>
            {day.lastCheckInAt ? formatRelativeTime(day.lastCheckInAt) : 'No check-in'}
          </span>
        </div>
        {day.checkIns.length > 0 && (
          <div className="flex items-center gap-1">
            <MessageSquare size={10} style={{ color: 'var(--text-muted)' }} />
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {day.checkIns.length}
            </span>
          </div>
        )}
        {day.managerNotes && (
          <span className="text-[10px] truncate ml-auto" style={{ color: 'var(--text-muted)', maxWidth: 100 }}>
            {day.managerNotes}
          </span>
        )}
      </div>
    </motion.div>
  );
}
