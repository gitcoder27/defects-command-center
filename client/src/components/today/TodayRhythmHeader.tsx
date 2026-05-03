import { CalendarClock, Loader2, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { todayToneStyles } from './today-design';
import type { TodayResponse } from '@/types';

interface TodayRhythmHeaderProps {
  today: TodayResponse;
  isFetching: boolean;
  onRefresh: () => void;
  onOpenMetric: (metric: NonNullable<TodayResponse['summary'][number]['target']>) => void;
}

export function TodayRhythmHeader({ today, isFetching, onRefresh, onOpenMetric }: TodayRhythmHeaderProps) {
  const formattedDate = format(parseISO(today.date), 'MMM d, yyyy');
  const weekday = format(parseISO(today.date), 'EEE');
  const metrics = today.summary.slice(0, 6);

  return (
    <section className="shrink-0 border-b px-2 py-1.5" style={{ borderColor: 'var(--today-line)' }}>
      <div
        className="grid gap-1.5 border-b border-t py-1.5 lg:grid-cols-[190px_repeat(6,minmax(0,1fr))_126px]"
        style={{
          background: 'linear-gradient(90deg, color-mix(in srgb, var(--bg-secondary) 20%, transparent), color-mix(in srgb, var(--bg-secondary) 8%, transparent))',
          borderColor: 'color-mix(in srgb, var(--border) 24%, transparent)',
        }}
      >
        <div className="flex min-h-[58px] items-center justify-between gap-3 rounded-lg px-3.5 py-2.5" style={{ background: 'color-mix(in srgb, var(--bg-secondary) 14%, transparent)' }}>
          <div className="flex items-center gap-3">
            <CalendarClock size={16} style={{ color: 'var(--text-secondary)' }} />
            <div>
              <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>Today</p>
              <p className="mt-1 text-[12px] leading-5" style={{ color: 'var(--text-secondary)' }}>{formattedDate} / {weekday}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-tertiary)] active:scale-[0.98]"
            aria-label="Refresh today"
            title="Refresh today"
          >
            {isFetching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          </button>
        </div>

        {metrics.map((metric) => {
          const style = todayToneStyles[metric.value > 0 ? metric.severity : 'neutral'];
          const content = (
            <>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[22px] font-semibold leading-none tabular-nums" style={{ color: style.color }}>{metric.value}</span>
                <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{metric.label}</span>
              </div>
              <p className="mt-1.5 truncate text-[12px] leading-5" style={{ color: 'var(--text-secondary)' }}>{metric.detail}</p>
            </>
          );

          if (metric.target) {
            return (
              <button
                key={metric.id}
                type="button"
                onClick={() => onOpenMetric(metric.target!)}
                className="min-h-[58px] rounded-lg px-3.5 py-2.5 text-left transition-colors hover:bg-[var(--today-hover)] active:scale-[0.99]"
              >
                {content}
              </button>
            );
          }

          return (
            <div key={metric.id} className="min-h-[58px] rounded-lg px-3.5 py-2.5">
              {content}
            </div>
          );
        })}

        <div className="hidden min-h-[58px] items-center justify-end px-2 lg:flex">
          <div className="min-w-0 border-l pl-3" style={{ borderColor: 'var(--today-line)' }}>
            <p className="flex min-w-0 items-center gap-1.5 truncate text-[12px] font-medium" style={{ color: 'var(--accent)' }}>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--accent)' }} />
              <span className="truncate">{today.rhythm.label}</span>
            </p>
            <p className="mt-1 truncate text-[11px] leading-4" style={{ color: 'var(--text-muted)' }}>{today.rhythm.detail}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
