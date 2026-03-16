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

  return (
    <div className="rounded-[16px] border px-3 py-3" style={{ borderColor: 'var(--md-accent)', background: 'color-mix(in srgb, var(--md-accent-glow) 65%, var(--bg-primary) 35%)' }}>
      <div className="flex flex-wrap items-center gap-2">
        <TriageLabel icon={<UserRound size={11} />} label="Inline triage" />

        <select
          aria-label={`Assign ${item.title}`}
          value={item.assigneeDeveloperAccountId ?? ''}
          onChange={(event) => onUpdate(item.id, { assigneeDeveloperAccountId: event.target.value || null })}
          className="rounded-xl border px-3 py-2 text-[12px] outline-none"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          <option value="">Unassigned</option>
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
          className="rounded-xl border px-3 py-2 text-[12px] outline-none"
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
          className="min-w-[180px] flex-1 rounded-xl border px-3 py-2 text-[12px] outline-none"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <DatetimeControl
          ariaLabel={`Start time for ${item.title}`}
          icon={<CalendarClock size={11} />}
          value={toLocalValue(item.plannedStartAt)}
          placeholder="Start"
          onCommit={(value) => onUpdate(item.id, { plannedStartAt: value ? toIsoValue(value) : null })}
        />
        <DatetimeControl
          ariaLabel={`Follow up time for ${item.title}`}
          icon={<TimerReset size={11} />}
          value={toLocalValue(item.followUpAt)}
          placeholder="Follow up"
          onCommit={(value) => onUpdate(item.id, { followUpAt: value ? toIsoValue(value) : null })}
        />

        <ActionButton onClick={() => onUpdate(item.id, { status: 'planned' })}>
          <Play size={11} />
          Plan
        </ActionButton>
        <ActionButton onClick={() => onUpdate(item.id, { status: 'in_progress' })}>
          <Play size={11} />
          Start
        </ActionButton>
        <ActionButton onClick={() => onUpdate(item.id, { status: 'waiting' })}>
          <TimerReset size={11} />
          Waiting
        </ActionButton>
        <ActionButton onClick={() => onUpdate(item.id, { kind: 'meeting', status: 'planned' })}>
          <Waves size={11} />
          Meeting
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
    <label className="inline-flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)' }}>
      <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
      <input
        type="datetime-local"
        aria-label={ariaLabel}
        defaultValue={value}
        onBlur={(event) => onCommit(event.target.value)}
        className="bg-transparent text-[12px] outline-none"
        style={{ color: 'var(--text-primary)' }}
        placeholder={placeholder}
      />
    </label>
  );
}

function TriageLabel({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ background: 'rgba(15,23,42,0.08)', color: 'var(--md-accent)' }}>
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
      className="inline-flex items-center gap-1 rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em]"
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
