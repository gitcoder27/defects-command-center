import { MoreHorizontal } from 'lucide-react';
import type { TodayActionCommand } from '@/types';

interface TodayActionMenuProps {
  actions: TodayActionCommand[];
  onRunAction: (command: TodayActionCommand, preset?: 'later_today' | 'tomorrow' | 'next_week') => void;
}

export function TodayActionMenu({ actions, onRunAction }: TodayActionMenuProps) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <details className="relative" onClick={(event) => event.stopPropagation()}>
      <summary
        className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-tertiary)] [&::-webkit-details-marker]:hidden"
        aria-label="More actions"
      >
        <MoreHorizontal size={15} />
      </summary>
      <div
        className="absolute right-0 top-9 z-20 min-w-[150px] overflow-hidden rounded-lg border py-1"
        style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-strong)', boxShadow: 'var(--shadow-lg)' }}
      >
        {actions.map((action) => (
          action.kind === 'snooze' ? (
            <SnoozeGroup key={`${action.kind}-${action.label}`} action={action} onRunAction={onRunAction} />
          ) : (
            <button
              key={`${action.kind}-${action.label}`}
              type="button"
              onClick={() => onRunAction(action)}
              className="block w-full px-3 py-2 text-left text-[12px] font-medium transition-colors hover:bg-[var(--bg-tertiary)]"
              style={{ color: 'var(--text-secondary)' }}
            >
              {action.label}
            </button>
          )
        ))}
      </div>
    </details>
  );
}

function SnoozeGroup({
  action,
  onRunAction,
}: {
  action: TodayActionCommand;
  onRunAction: TodayActionMenuProps['onRunAction'];
}) {
  return (
    <div className="border-y py-1" style={{ borderColor: 'var(--border)' }}>
      <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
        Snooze
      </p>
      {[
        ['later_today', 'Later today'],
        ['tomorrow', 'Tomorrow'],
        ['next_week', 'Next week'],
      ].map(([preset, label]) => (
        <button
          key={preset}
          type="button"
          onClick={() => onRunAction(action, preset as 'later_today' | 'tomorrow' | 'next_week')}
          className="block w-full px-3 py-1.5 text-left text-[12px] font-medium transition-colors hover:bg-[var(--bg-tertiary)]"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
