import { motion } from 'framer-motion';
import { Target, ListTodo, Activity } from 'lucide-react';
import type { TrackerDeveloperStatus, TrackerWorkItem, TrackerCheckIn } from '@/types';
import { MyDayDateControl } from './MyDayDateControl';
import { PlannedQueue } from './PlannedQueue';
import { AddTaskForm } from './AddTaskForm';
import { RecentActivity } from './RecentActivity';

interface MyDayRightColumnProps {
  date: string;
  setDate: (date: string | ((d: string) => string)) => void;
  day: any;
  handleSetCurrent: (id: number) => void;
  handleMarkDone: (id: number) => void;
  handleDrop: (id: number) => void;
  handleReorder: (id: number, pos: number) => void;
  handleUpdateItemNote: (id: number, note?: string) => void;
  handleUpdateItemTitle: (id: number, title: string) => void;
  handleAddItem: (params: any) => void;
  addItemPending: boolean;
  completedCount: number;
  totalTasks: number;
  readOnly?: boolean;
}

const sectionVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

export function MyDayRightColumn({
  date,
  setDate,
  day,
  handleSetCurrent,
  handleMarkDone,
  handleDrop,
  handleReorder,
  handleUpdateItemNote,
  handleUpdateItemTitle,
  handleAddItem,
  addItemPending,
  completedCount,
  totalTasks,
  readOnly,
}: MyDayRightColumnProps) {
  return (
    <div className="flex flex-col gap-6">
      <MyDayDateControl
        date={date}
        setDate={setDate}
        completedCount={completedCount}
        totalTasks={totalTasks}
      />

      <motion.section variants={sectionVariants} className={readOnly ? 'pointer-events-none opacity-60' : undefined}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ListTodo size={14} style={{ color: 'var(--text-muted)' }} />
            <h2 className="text-[12px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Up Next
            </h2>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
            {day?.plannedItems.length ?? 0} TASKS
          </span>
        </div>
        <PlannedQueue
          items={day?.plannedItems ?? []}
          onSetCurrent={handleSetCurrent}
          onMarkDone={handleMarkDone}
          onDrop={handleDrop}
          onReorder={handleReorder}
          onUpdateNote={handleUpdateItemNote}
          onUpdateTitle={handleUpdateItemTitle}
        />
        <div className="mt-2">
          <AddTaskForm onAdd={handleAddItem} isPending={addItemPending} />
        </div>
      </motion.section>

      <motion.section variants={sectionVariants} className="mt-4">
        <div className="flex items-center gap-2 mb-4 pl-2">
          <Activity size={14} className="text-[var(--accent)]" />
          <h2 className="text-[12px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Recent Activity
          </h2>
        </div>
        <div className="bg-[var(--bg-canvas)] rounded-3xl p-4 shadow-inner border border-[var(--border)]">
          <RecentActivity checkIns={day?.checkIns ?? []} />
        </div>
      </motion.section>
    </div>
  );
}
