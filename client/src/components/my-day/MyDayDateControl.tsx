import { Calendar, ChevronLeft, ChevronRight, CheckCircle2, Target } from 'lucide-react';
import { format, subDays, addDays, isToday } from 'date-fns';

interface MyDayDateControlProps {
  date: string;
  setDate: (date: string | ((d: string) => string)) => void;
  completedCount: number;
  totalTasks: number;
}

export function MyDayDateControl({
  date,
  setDate,
  completedCount,
  totalTasks,
}: MyDayDateControlProps) {
  const goToday = () => setDate(format(new Date(), 'yyyy-MM-dd'));
  const goPrev = () => setDate((d) => format(subDays(new Date(d), 1), 'yyyy-MM-dd'));
  const goNext = () => setDate((d) => format(addDays(new Date(d), 1), 'yyyy-MM-dd'));

  const todayStr = isToday(new Date(date));
  const displayDate = todayStr ? 'Today' : format(new Date(date), 'MMM d, yyyy');

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <button
          onClick={goPrev}
          className="h-8 w-8 rounded-xl flex items-center justify-center transition-colors hover:bg-black/5 dark:hover:bg-white/5"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ChevronLeft size={16} />
        </button>
        <span
          className="text-[15px] font-semibold tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          {displayDate}
        </span>
        <button
          onClick={goNext}
          className="h-8 w-8 rounded-xl flex items-center justify-center transition-colors hover:bg-black/5 dark:hover:bg-white/5"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ChevronRight size={16} />
        </button>
        {!todayStr && (
          <button
            onClick={goToday}
            className="rounded-lg px-2.5 py-1 text-[12px] font-semibold transition-colors uppercase tracking-wider"
            style={{
              color: 'var(--accent)',
              background: 'var(--accent-glow)',
            }}
          >
            Today
          </button>
        )}
      </div>

      {totalTasks > 0 && (
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[13px] font-medium" style={{ color: 'var(--success)' }}>
            <CheckCircle2 size={14} />
            {completedCount}
          </span>
          <span className="flex items-center gap-1.5 text-[13px] font-medium" style={{ color: 'var(--text-muted)' }}>
            <Target size={14} />
            {totalTasks}
          </span>
        </div>
      )}
    </div>
  );
}
