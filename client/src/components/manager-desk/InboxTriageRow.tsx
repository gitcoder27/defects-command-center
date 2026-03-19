import type { ReactNode } from 'react';
import { CalendarClock, Play, TimerReset, UserRound, Waves } from 'lucide-react';
import { formatISO } from 'date-fns';
import { useDevelopers } from '@/hooks/useDevelopers';
import type { ManagerDeskItem, ManagerDeskPriority } from '@/types/manager-desk';

interface Props {
  item: ManagerDeskItem;
  onUpdate: (itemId: number, updates: Record<string, unknown>) => void;
}

const priorities: ManagerDeskPriority[] = ['low', 'medium', 'high', 'critical'];

export function InboxTriageRow({ item, onUpdate }: Props) {
  const { data: developers = [] } = useDevelopers();
  const hasLinkedWork = !!item.delegatedExecution;

  return (
    <div className="rounded-lg border px-2.5 py-2" style={{ borderColor: 'var(--md-accent)', background: 'color-mix(in srgb, var(--md-accent-glow) 65%, var(--bg-primary) 35%)' }}>
      <div className="flex flex-wrap items-center gap-1.5">
        <TriageLabel icon={<UserRound size={9} />} label="Triage" />

        <select
          aria-label={`Assign ${item.title}`}
          value={item.assigneeDeveloperAccountId ?? ''}
          onChange={(event) => onUpdate(item.id, { assigneeDeveloperAccountId: event.target.value || null })}
          className="rounded-lg border px-2 py-1 text-[11px] outline-none"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          {!hasLinkedWork && <option value="">Unassigned</option>}
          {developers.map((developer) => (
            <option key={developer.accountId} value={developer.accountId}>
              {developer.displayName}
            </option>
          ))}
        </select>

        <select
          aria-label={`Priority for ${item.title}`}
          value={item.priority}
          onChange={(event) => onUpdate(item.id, { priority: event.target.value })}
          className="rounded-lg border px-2 py-1 text-[11px] outline-none"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          {priorities.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>

        <input
          type="text"
          aria-label={`Next action for ${item.title}`}
          defaultValue={item.nextAction ?? ''}
          placeholder="Next action"
          onBlur={(event) => onUpdate(item.id, { nextAction: event.target.value.trim() || null })}
          className="min-w-[140px] flex-1 rounded-lg border px-2 py-1 text-[11px] outline-none"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        />
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <DatetimeControl
          ariaLabel={`Start time for ${item.title}`}
          icon={<CalendarClock size={9} />}
          value={toLocalValue(item.plannedStartAt)}
          placeholder="Start"
          onCommit={(value) => onUpdate(item.id, { plannedStartAt: value ? toIsoValue(value) : null })}
        />
        <DatetimeControl
          ariaLabel={`Follow up time for ${item.title}`}
          icon={<TimerReset size={9} />}
          value={toLocalValue(item.followUpAt)}
          placeholder="Follow up"
          onCommit={(value) => onUpdate(item.id, { followUpAt: value ? toIsoValue(value) : null })}
        />

        <ActionButton onClick={() => onUpdate(item.id, { status: 'planned' })}>
          <Play size={9} /> Plan
        </ActionButton>
        <ActionButton onClick={() => onUpdate(item.id, { status: 'in_progress' })}>
          <Play size={9} /> Start
        </ActionButton>
        <ActionButton onClick={() => onUpdate(item.id, { status: 'waiting' })}>
          <TimerReset size={9} /> Wait
        </ActionButton>
        <ActionButton onClick={() => onUpdate(item.id, { kind: 'meeting', status: 'planned' })}>
          <Waves size={9} /> Meet
        </ActionButton>
      </div>
    </div>
  );
}

function DatetimeControl({
  ariaLabel,
  icon,
  placeholder,
  value,
  onCommit,
}: {
  ariaLabel: string;
  icon: ReactNode;
  placeholder: string;
  value: string;
  onCommit: (value: string) => void;
}) {
  return (
    <label className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1" style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)' }}>
      <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
      <input
        type="datetime-local"
        aria-label={ariaLabel}
        defaultValue={value}
        onBlur={(event) => onCommit(event.target.value)}
        className="bg-transparent text-[10px] outline-none"
        style={{ color: 'var(--text-primary)' }}
        placeholder={placeholder}
      />
    </label>
  );
}

function TriageLabel({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em]" style={{ background: 'rgba(15,23,42,0.08)', color: 'var(--md-accent)' }}>
      {icon}
      {label}
    </span>
  );
}

function ActionButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-0.5 rounded-md border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em]"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
    >
      {children}
    </button>
  );
}

function toLocalValue(value?: string) {
  if (!value) return '';

  try {
    return new Date(value).toISOString().slice(0, 16);
  } catch {
    return '';
  }
}

function toIsoValue(value: string) {
  return formatISO(new Date(value));
}
