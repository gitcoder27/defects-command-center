import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LogOut,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  ListTodo,
  MessageSquare,
  Target,
  Clock,
  Zap,
  Sun,
  Moon,
} from 'lucide-react';
import { format, addDays, subDays, isToday } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import {
  useMyDay,
  useUpdateMyDayStatus,
  useAddMyDayItem,
  useUpdateMyDayItem,
  useSetMyDayCurrent,
  useAddMyDayCheckIn,
} from '@/hooks/useMyDay';
import { formatRelativeTime } from '@/lib/utils';
import { StatusSelector, getStatusInfo } from './StatusSelector';
import { CurrentTask } from './CurrentTask';
import { PlannedQueue } from './PlannedQueue';
import { CompletedWork } from './CompletedWork';
import { DroppedWork } from './DroppedWork';
import { CheckInFeed } from './CheckInFeed';
import { AddTaskForm } from './AddTaskForm';
import type { TrackerDeveloperStatus } from '@/types';

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } },
};

export function MyDayPage() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { addToast } = useToast();
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  const { data: day, isLoading, error, refetch } = useMyDay(date);
  const updateStatus = useUpdateMyDayStatus(date);
  const addItem = useAddMyDayItem(date);
  const updateItem = useUpdateMyDayItem(date);
  const setCurrent = useSetMyDayCurrent(date);
  const addCheckIn = useAddMyDayCheckIn(date);

  const goToday = () => setDate(format(new Date(), 'yyyy-MM-dd'));
  const goPrev = () => setDate((d) => format(subDays(new Date(d), 1), 'yyyy-MM-dd'));
  const goNext = () => setDate((d) => format(addDays(new Date(d), 1), 'yyyy-MM-dd'));

  const handleStatusUpdate = (status: TrackerDeveloperStatus) => {
    updateStatus.mutate(status, {
      onSuccess: () => addToast('Status updated', 'success'),
      onError: (err) => addToast(err.message, 'error'),
    });
  };

  const handleMarkDone = (itemId: number) => {
    updateItem.mutate(
      { itemId, state: 'done' },
      {
        onSuccess: () => addToast('Task completed!', 'success'),
        onError: (err) => addToast(err.message, 'error'),
      }
    );
  };

  const handleDrop = (itemId: number) => {
    updateItem.mutate(
      { itemId, state: 'dropped' },
      {
        onError: (err) => addToast(err.message, 'error'),
      }
    );
  };

  const handleSetCurrent = (itemId: number) => {
    setCurrent.mutate(itemId, {
      onError: (err) => addToast(err.message, 'error'),
    });
  };

  const handleReorder = (itemId: number, newPosition: number) => {
    updateItem.mutate(
      { itemId, position: newPosition },
      { onError: (err) => addToast(err.message, 'error') }
    );
  };

  const handleAddItem = (params: { itemType: 'jira' | 'custom'; title: string; jiraKey?: string; note?: string }) => {
    addItem.mutate(params, {
      onSuccess: () => addToast('Task added', 'success'),
      onError: (err) => addToast(err.message, 'error'),
    });
  };

  const handleAddCheckIn = (summary: string, status?: TrackerDeveloperStatus) => {
    addCheckIn.mutate(
      { summary, status },
      {
        onSuccess: () => addToast('Update posted', 'success'),
        onError: (err) => addToast(err.message, 'error'),
      }
    );
  };

  const todayStr = isToday(new Date(date));
  const displayDate = todayStr
    ? 'Today'
    : format(new Date(date), 'EEEE, MMM d');

  const statusInfo = day ? getStatusInfo(day.status) : null;

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
          />
          <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            Loading your day…
          </span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center max-w-sm">
          <div
            className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(239, 68, 68, 0.12)', color: 'var(--danger)' }}
          >
            <XCircle size={22} />
          </div>
          <h2 className="text-[15px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            Failed to load
          </h2>
          <p className="text-[12px] mb-4" style={{ color: 'var(--text-secondary)' }}>
            {error.message}
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => refetch()}
              className="rounded-xl px-4 py-2 text-[12px] font-semibold"
              style={{
                background: 'var(--accent-glow)',
                color: 'var(--accent)',
                border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
              }}
            >
              Retry
            </button>
            <button
              onClick={() => { window.history.pushState(null, '', '/'); window.location.reload(); }}
              className="rounded-xl px-4 py-2 text-[12px] font-semibold"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              Dashboard
            </button>
            <button
              onClick={async () => { await logout(); window.location.reload(); }}
              className="rounded-xl px-4 py-2 text-[12px] font-semibold flex items-center gap-1.5"
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                color: 'var(--danger)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}
            >
              <LogOut size={12} />
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  const completedCount = day?.completedItems.length ?? 0;
  const plannedCount = day?.plannedItems.length ?? 0;
  const totalTasks = completedCount + plannedCount + (day?.currentItem ? 1 : 0);

  return (
    <div
      className="h-full overflow-y-auto"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <div className="max-w-2xl mx-auto px-4 py-4 md:px-6 md:py-6">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="space-y-5"
        >
          {/* ─── Header ─── */}
          <motion.header variants={fadeUp}>
            <div
              className="dashboard-panel rounded-2xl px-4 py-3 md:px-5 md:py-4"
              style={{ borderColor: 'var(--border-strong)' }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar */}
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-[14px] font-bold"
                    style={{
                      background: statusInfo
                        ? statusInfo.bg
                        : 'var(--accent-glow)',
                      color: statusInfo ? statusInfo.color : 'var(--accent)',
                      border: `1px solid ${statusInfo ? `color-mix(in srgb, ${statusInfo.color} 30%, transparent)` : 'color-mix(in srgb, var(--accent) 30%, transparent)'}`,
                    }}
                  >
                    {user?.displayName
                      ?.split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase() ?? '?'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h1
                        className="text-[17px] font-semibold truncate"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        My Day
                      </h1>
                      {day && (
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                          style={{
                            color: statusInfo?.color,
                            background: statusInfo?.bg,
                            letterSpacing: '0.06em',
                          }}
                        >
                          {statusInfo?.label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                        {user?.displayName}
                      </span>
                      {day?.lastCheckInAt && (
                        <>
                          <span style={{ color: 'var(--text-muted)' }}>·</span>
                          <span className="text-[11px] flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                            <Clock size={9} />
                            {formatRelativeTime(day.lastCheckInAt)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Header actions */}
                <div
                  className="flex items-center rounded-xl p-0.5 gap-0.5 shrink-0"
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
                >
                  <button
                    onClick={toggleTheme}
                    className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors"
                    title="Toggle theme"
                  >
                    {theme === 'dark' ? (
                      <Sun size={14} style={{ color: 'var(--text-secondary)' }} />
                    ) : (
                      <Moon size={14} style={{ color: 'var(--text-secondary)' }} />
                    )}
                  </button>
                  <button
                    onClick={logout}
                    className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors"
                    title="Sign out"
                  >
                    <LogOut size={14} style={{ color: 'var(--text-secondary)' }} />
                  </button>
                </div>
              </div>

              {/* Date navigation */}
              <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                <button
                  onClick={goPrev}
                  className="h-6 w-6 rounded-lg flex items-center justify-center transition-colors"
                  style={{ color: 'var(--text-muted)', background: 'var(--bg-tertiary)' }}
                >
                  <ChevronLeft size={13} />
                </button>
                <span
                  className="text-[13px] font-semibold tabular-nums"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {displayDate}
                </span>
                <button
                  onClick={goNext}
                  className="h-6 w-6 rounded-lg flex items-center justify-center transition-colors"
                  style={{ color: 'var(--text-muted)', background: 'var(--bg-tertiary)' }}
                >
                  <ChevronRight size={13} />
                </button>
                {!todayStr && (
                  <button
                    onClick={goToday}
                    className="rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors"
                    style={{
                      color: 'var(--accent)',
                      background: 'var(--accent-glow)',
                    }}
                  >
                    Today
                  </button>
                )}
                <div className="flex-1" />
                {/* Quick stats */}
                {totalTasks > 0 && (
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--success)' }}>
                      <CheckCircle2 size={11} />
                      {completedCount}
                    </span>
                    <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      <Target size={11} />
                      {totalTasks}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.header>

          {/* ─── Status ─── */}
          <motion.section variants={fadeUp}>
            <SectionLabel icon={Zap} label="Status" />
            <StatusSelector
              current={day?.status ?? 'on_track'}
              onUpdate={handleStatusUpdate}
              isPending={updateStatus.isPending}
            />
          </motion.section>

          {/* ─── Current Task ─── */}
          <motion.section variants={fadeUp}>
            <SectionLabel icon={Target} label="Current Task" />
            <CurrentTask
              item={day?.currentItem}
              onMarkDone={handleMarkDone}
              onDrop={handleDrop}
              hasPlannedItems={(day?.plannedItems.length ?? 0) > 0}
            />
          </motion.section>

          {/* ─── Planned Queue ─── */}
          <motion.section variants={fadeUp}>
            <SectionLabel
              icon={ListTodo}
              label="Up Next"
              count={day?.plannedItems.length}
            />
            <PlannedQueue
              items={day?.plannedItems ?? []}
              onSetCurrent={handleSetCurrent}
              onMarkDone={handleMarkDone}
              onDrop={handleDrop}
              onReorder={handleReorder}
            />
          </motion.section>

          {/* ─── Add Task ─── */}
          <motion.section variants={fadeUp}>
            <AddTaskForm onAdd={handleAddItem} isPending={addItem.isPending} />
          </motion.section>

          {/* ─── Check-ins / Updates ─── */}
          <motion.section variants={fadeUp}>
            <SectionLabel
              icon={MessageSquare}
              label="Updates"
              count={day?.checkIns.length}
            />
            <CheckInFeed
              checkIns={day?.checkIns ?? []}
              onAddCheckIn={handleAddCheckIn}
              isPending={addCheckIn.isPending}
            />
          </motion.section>

          {/* ─── Completed Work ─── */}
          {(day?.completedItems.length ?? 0) > 0 && (
            <motion.section variants={fadeUp}>
              <SectionLabel
                icon={CheckCircle2}
                label="Completed"
                count={day?.completedItems.length}
              />
              <CompletedWork items={day?.completedItems ?? []} />
            </motion.section>
          )}

          {/* ─── Dropped Work ─── */}
          {(day?.droppedItems.length ?? 0) > 0 && (
            <motion.section variants={fadeUp}>
              <SectionLabel
                icon={XCircle}
                label="Dropped"
                count={day?.droppedItems.length}
              />
              <DroppedWork items={day?.droppedItems ?? []} />
            </motion.section>
          )}

          {/* Bottom spacer for mobile scrolling */}
          <div className="h-8" />
        </motion.div>
      </div>
    </div>
  );
}

/* ─── Section Label helper ─── */
function SectionLabel({
  icon: Icon,
  label,
  count,
}: {
  icon: typeof Zap;
  label: string;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <Icon size={13} style={{ color: 'var(--text-muted)' }} />
      <span
        className="text-[11px] font-bold uppercase"
        style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}
      >
        {label}
      </span>
      {count !== undefined && count > 0 && (
        <span
          className="text-[10px] font-mono rounded-md px-1.5 py-0.5"
          style={{ color: 'var(--text-muted)', background: 'var(--bg-tertiary)' }}
        >
          {count}
        </span>
      )}
    </div>
  );
}
