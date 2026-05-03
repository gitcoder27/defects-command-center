import { CheckCircle2, MessageSquare, Users } from 'lucide-react';
import { todayToneStyles } from './today-design';
import type { TodayActionCommand, TodayTeamPulseItem } from '@/types';

interface TodayPeoplePulseProps {
  people: TodayTeamPulseItem[];
  onRunCommand: (command: TodayActionCommand) => void;
  onViewAll: () => void;
}

export function TodayPeoplePulse({ people, onRunCommand, onViewAll }: TodayPeoplePulseProps) {
  const visiblePeople = people.slice(0, 6);
  const hiddenCount = Math.max(people.length - visiblePeople.length, 0);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={16} style={{ color: 'var(--accent)' }} />
          <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>People pulse</h2>
        </div>
        <button type="button" onClick={onViewAll} className="text-[12px] font-medium" style={{ color: 'var(--accent)' }}>
          View team
        </button>
      </div>

      <div className="space-y-1">
        {visiblePeople.length > 0 ? (
          visiblePeople.map((person) => (
            <PeoplePulseRow key={person.accountId} person={person} onRunCommand={onRunCommand} />
          ))
        ) : (
          <div className="py-5 text-center">
            <CheckCircle2 size={18} className="mx-auto" style={{ color: 'var(--success)' }} />
            <p className="mt-2 text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>Team is calm</p>
          </div>
        )}
        {hiddenCount > 0 ? (
          <button
            type="button"
            onClick={onViewAll}
            className="w-full px-1 py-2.5 text-left text-[13px] font-medium transition-colors hover:bg-[var(--today-hover)]"
            style={{ color: 'var(--accent)', borderBottom: '1px solid var(--today-line)' }}
          >
            +{hiddenCount} more people signals
          </button>
        ) : null}
      </div>
    </section>
  );
}

function PeoplePulseRow({
  person,
  onRunCommand,
}: {
  person: TodayTeamPulseItem;
  onRunCommand: (command: TodayActionCommand) => void;
}) {
  const style = todayToneStyles[person.tone];

  return (
    <div
      className="grid w-full grid-cols-[34px_minmax(0,1fr)_86px] gap-3 px-1 py-3 text-left md:grid-cols-[38px_minmax(118px,0.75fr)_82px_minmax(0,1fr)_82px]"
      style={{ borderBottom: '1px solid var(--today-line)' }}
    >
      <button
        type="button"
        onClick={() => onRunCommand({ kind: 'open', label: 'Open', target: person.target })}
        className="relative mt-0.5 flex h-8 w-8 items-center justify-center rounded-md text-[11px] font-medium"
        style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}
        aria-label={`Open ${person.displayName}`}
      >
        {person.initials}
        <span className="absolute -left-1 top-1.5 h-1.5 w-1.5 rounded-full" style={{ background: style.color }} />
      </button>
      <button type="button" onClick={() => onRunCommand({ kind: 'open', label: 'Open', target: person.target })} className="min-w-0 text-left">
        <span className="block truncate text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{person.displayName}</span>
        <span className="mt-0.5 block truncate text-[12px] leading-5 md:hidden" style={{ color: 'var(--text-secondary)' }}>{person.currentWork}</span>
      </button>
      <span className="justify-self-start rounded-md px-2 py-1 text-[11px] font-medium" style={{ background: style.bg, color: style.color }}>
        {person.status}
      </span>
      <span className="hidden min-w-0 md:block">
        <span className="block truncate text-[13px] leading-5" style={{ color: 'var(--text-secondary)' }}>{person.currentWork}</span>
        <span className="mt-0.5 block truncate text-[12px] leading-5" style={{ color: 'var(--text-muted)' }}>{person.detail}</span>
      </span>
      <button
        type="button"
        onClick={() => onRunCommand(person.primaryAction)}
        className="hidden items-center justify-end gap-1.5 text-[12px] font-medium md:flex"
        style={{ color: 'var(--accent)' }}
      >
        <MessageSquare size={12} />
        {person.primaryAction.label}
      </button>
    </div>
  );
}
