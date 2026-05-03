import { useState } from 'react';
import { Bell, CalendarDays, CheckCircle2, Zap } from 'lucide-react';
import { todayToneStyles } from './today-design';
import type {
  TodayActionCommand,
  TodayMeetingPrompt,
  TodayPromiseItem,
  TodayStandupPrompt,
} from '@/types';

type RhythmTab = 'promises' | 'standup' | 'meetings';

interface TodayRhythmRailProps {
  promises: TodayPromiseItem[];
  standupPrompts: TodayStandupPrompt[];
  meetingPrompts: TodayMeetingPrompt[];
  onRunCommand: (command: TodayActionCommand, preset?: 'later_today' | 'tomorrow' | 'next_week') => void;
}

export function TodayRhythmRail({ promises, standupPrompts, meetingPrompts, onRunCommand }: TodayRhythmRailProps) {
  const [tab, setTab] = useState<RhythmTab>('promises');
  const counts = {
    promises: promises.length,
    standup: standupPrompts.length,
    meetings: meetingPrompts.length,
  };

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={16} style={{ color: 'var(--accent)' }} />
          <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Rhythm</h2>
        </div>
        <div className="flex rounded-lg border p-0.5" style={{ borderColor: 'var(--today-line)', background: 'var(--today-muted-panel)' }}>
          {(['promises', 'standup', 'meetings'] as RhythmTab[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className="rounded-md px-2 py-1 text-[11px] font-medium capitalize transition-colors"
              style={{
                color: tab === item ? 'var(--accent)' : 'var(--text-muted)',
                background: tab === item ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
              }}
            >
              {item} {counts[item] > 0 ? counts[item] : ''}
            </button>
          ))}
        </div>
      </div>

      {tab === 'promises' && (
        <MiniList
          empty="No follow-ups due"
          items={promises.slice(0, 3).map((item) => ({
            id: item.id,
            title: item.title,
            detail: item.detail,
            severity: item.severity,
            primaryAction: item.primaryAction,
            secondaryAction: item.secondaryActions.find((action) => action.kind === 'snooze'),
          }))}
          onRunCommand={onRunCommand}
        />
      )}
      {tab === 'standup' && (
        <MiniList
          empty="Standup is clear"
          items={standupPrompts.slice(0, 3).map((item) => ({
            id: item.id,
            title: item.title,
            detail: item.detail,
            severity: item.severity,
            primaryAction: item.primaryAction,
          }))}
          onRunCommand={onRunCommand}
        />
      )}
      {tab === 'meetings' && (
        <MiniList
          empty="No meeting outcomes due"
          items={meetingPrompts.slice(0, 3).map((item) => ({
            id: item.id,
            title: item.title,
            detail: item.detail,
            severity: item.severity,
            primaryAction: item.primaryAction,
            secondaryAction: item.secondaryActions[0],
          }))}
          onRunCommand={onRunCommand}
        />
      )}
    </section>
  );
}

function MiniList({
  empty,
  items,
  onRunCommand,
}: {
  empty: string;
  items: Array<{
    id: string;
    title: string;
    detail: string;
    severity: 'critical' | 'warning' | 'info' | 'neutral' | 'success';
    primaryAction: TodayActionCommand;
    secondaryAction?: TodayActionCommand;
  }>;
  onRunCommand: TodayRhythmRailProps['onRunCommand'];
}) {
  if (items.length === 0) {
    return (
      <div className="py-5 text-center">
        <CheckCircle2 size={18} className="mx-auto" style={{ color: 'var(--success)' }} />
        <p className="mt-2 text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{empty}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {items.map((item) => {
        const style = todayToneStyles[item.severity];
        const Icon = item.primaryAction.target.type === 'meeting' ? CalendarDays : Bell;
        return (
          <div key={item.id} className="grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-3 px-1 py-3" style={{ borderBottom: '1px solid var(--today-line)' }}>
            <Icon size={14} style={{ color: style.color }} />
            <button type="button" onClick={() => onRunCommand({ kind: 'open', label: 'Open', target: item.primaryAction.target })} className="min-w-0 text-left">
              <span className="block truncate text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{item.title}</span>
              <span className="mt-0.5 block truncate text-[12px] leading-5" style={{ color: 'var(--text-secondary)' }}>{item.detail}</span>
            </button>
            <div className="flex items-center gap-1">
              {item.secondaryAction ? (
                <button
                  type="button"
                  onClick={() => onRunCommand(item.secondaryAction!, item.secondaryAction!.kind === 'snooze' ? 'tomorrow' : undefined)}
                  className="rounded-md px-2 py-1 text-[11px] font-medium transition-colors hover:bg-[var(--bg-tertiary)]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {item.secondaryAction.label}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => onRunCommand(item.primaryAction)}
                className="rounded-md px-2 py-1 text-[11px] font-medium transition-colors hover:bg-[var(--bg-tertiary)]"
                style={{ color: 'var(--accent)' }}
              >
                {item.primaryAction.label}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
