import { useMemo, useState, type ReactNode } from 'react';
import { addMinutes, format } from 'date-fns';
import { CalendarClock, Check, Plus, UserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useDevelopers } from '@/hooks/useDevelopers';
import {
  fromDateTimeInputValue,
  type ManagerMemoryMode,
} from '@/lib/manager-memory';
import type { ManagerDeskCreateItemPayload } from '@/types/manager-desk';

interface MemoryComposerProps {
  mode: ManagerMemoryMode;
  date: string;
  isSaving: boolean;
  onCreate: (payload: ManagerDeskCreateItemPayload) => void;
}

export function MemoryComposer({ mode, date, isSaving, onCreate }: MemoryComposerProps) {
  const { data: developers } = useDevelopers(date);
  const [title, setTitle] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [participants, setParticipants] = useState('');
  const [note, setNote] = useState('');
  const [nextAction, setNextAction] = useState('');

  const isFollowUps = mode === 'follow-ups';
  const titleLabel = isFollowUps ? 'Follow-up' : 'Meeting';
  const dateLabel = isFollowUps ? 'Due' : 'Starts';
  const submitLabel = isSaving ? 'Saving' : isFollowUps ? 'Add follow-up' : 'Add meeting';

  const defaultDateTime = useMemo(() => {
    const nextHour = addMinutes(new Date(), isFollowUps ? 90 : 30);
    return format(nextHour, "yyyy-MM-dd'T'HH:mm");
  }, [isFollowUps]);

  const reset = () => {
    setTitle('');
    setDateTime('');
    setAssigneeId('');
    setParticipants('');
    setNote('');
    setNextAction('');
  };

  const handleSubmit = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || isSaving) return;

    const timestamp = fromDateTimeInputValue(dateTime || defaultDateTime);
    const basePayload = {
      date,
      title: trimmedTitle,
      status: 'planned',
      priority: 'medium',
      contextNote: note.trim() || undefined,
      nextAction: nextAction.trim() || undefined,
    } satisfies Partial<ManagerDeskCreateItemPayload>;

    if (isFollowUps) {
      onCreate({
        ...basePayload,
        kind: 'action',
        category: 'follow_up',
        assigneeDeveloperAccountId: assigneeId || undefined,
        followUpAt: timestamp,
      });
    } else {
      const start = timestamp;
      const end = start ? addMinutes(new Date(start), 30).toISOString() : undefined;
      onCreate({
        ...basePayload,
        kind: 'meeting',
        category: 'planning',
        participants: participants.trim() || undefined,
        plannedStartAt: start,
        plannedEndAt: end,
      });
    }

    reset();
  };

  return (
    <aside className="border-t px-5 py-5 lg:border-l lg:border-t-0" style={{ borderColor: 'var(--memory-line)' }}>
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-md" style={{ background: 'var(--memory-accent-bg)', color: 'var(--memory-accent)' }}>
          <Plus size={16} />
        </span>
        <div>
          <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{titleLabel}</h2>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{isFollowUps ? 'Promise, owner, and due time' : 'Notes, attendees, and next action'}</p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <FieldLabel text={titleLabel}>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={isFollowUps ? 'Check in on API rollout' : 'Design review with payments'}
            className="memory-input"
            maxLength={240}
          />
        </FieldLabel>

        <FieldLabel text={dateLabel} icon={CalendarClock}>
          <input
            value={dateTime}
            onChange={(event) => setDateTime(event.target.value)}
            type="datetime-local"
            className="memory-input"
            placeholder={defaultDateTime}
          />
        </FieldLabel>

        {isFollowUps ? (
          <FieldLabel text="Person" icon={UserRound}>
            <select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} className="memory-input">
              <option value="">No owner</option>
              {(developers ?? []).map((developer) => (
                <option key={developer.accountId} value={developer.accountId}>
                  {developer.displayName}
                </option>
              ))}
            </select>
          </FieldLabel>
        ) : (
          <FieldLabel text="Attendees" icon={UserRound}>
            <input
              value={participants}
              onChange={(event) => setParticipants(event.target.value)}
              placeholder="Ayan, QA, Product"
              className="memory-input"
              maxLength={400}
            />
          </FieldLabel>
        )}

        <FieldLabel text={isFollowUps ? 'Context' : 'Notes'}>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder={isFollowUps ? 'Why this matters...' : 'What was discussed...'}
            className="memory-input resize-y"
            maxLength={1800}
          />
        </FieldLabel>

        <FieldLabel text="Next action">
          <input
            value={nextAction}
            onChange={(event) => setNextAction(event.target.value)}
            placeholder={isFollowUps ? 'Message after lunch' : 'Send decision summary'}
            className="memory-input"
            maxLength={500}
          />
        </FieldLabel>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!title.trim() || isSaving}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-md text-[12px] font-semibold transition-all active:scale-[0.98] disabled:opacity-40"
          style={{ background: 'var(--memory-accent)', color: 'var(--memory-button-text)' }}
        >
          <Check size={14} />
          {submitLabel}
        </button>
      </div>
    </aside>
  );
}

function FieldLabel({
  text,
  icon: Icon,
  children,
}: {
  text: string;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
        {Icon ? <Icon size={12} style={{ color: 'var(--memory-accent)' }} /> : null}
        {text}
      </span>
      {children}
    </label>
  );
}
