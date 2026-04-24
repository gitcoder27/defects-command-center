import { useEffect, useId, useState } from 'react';
import { ArrowRight, UserRound } from 'lucide-react';
import { useDevelopers } from '@/hooks/useDevelopers';
import type { ManagerDeskItem, ManagerDeskUpdateItemPayload } from '@/types/manager-desk';
import { useDraftField } from './useDraftField';

interface DrawerPrimaryFieldsProps {
  item: ManagerDeskItem;
  date: string;
  readOnly?: boolean;
  onFieldChange: (field: keyof ManagerDeskUpdateItemPayload, value: string) => void;
  onAssigneeChange: (accountId: string | null) => void;
}

export function DrawerPrimaryFields({
  item,
  date,
  readOnly = false,
  onFieldChange,
  onAssigneeChange,
}: DrawerPrimaryFieldsProps) {
  const { data: developers } = useDevelopers(date);
  const assigneeId = item.assignee?.accountId ?? '';
  const selectedDev = developers?.find((d) => d.accountId === assigneeId);
  const hasLinkedWork = !!item.delegatedExecution;
  const nextAction = useDraftField({
    value: item.nextAction ?? '',
    onChange: (value) => onFieldChange('nextAction', value),
  });

  return (
    <section className="space-y-3 px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="grid gap-3 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div
          className="rounded-xl border p-3"
          style={{
            background: 'color-mix(in srgb, var(--bg-secondary) 78%, transparent)',
            borderColor: 'color-mix(in srgb, var(--border) 82%, transparent)',
          }}
        >
          <div className="mb-2 flex items-center gap-2">
            <UserRound size={12} style={{ color: 'var(--md-accent)' }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
              Owner
            </span>
          </div>
          <InlineSelect
            label="Assignee"
            value={assigneeId}
            options={(developers ?? []).map((developer) => ({
              value: developer.accountId,
              label: developer.availability?.state === 'inactive'
                ? `${developer.displayName} (inactive)`
                : developer.displayName,
            }))}
            onChange={(value) => onAssigneeChange(value || null)}
            disabled={readOnly || hasLinkedWork}
            emptyLabel={hasLinkedWork ? undefined : 'Unassigned'}
          />
          {hasLinkedWork && assigneeId && (
            <p className="mt-2 text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Assignee is locked while delegated work is active.
            </p>
          )}
          {selectedDev?.availability?.state === 'inactive' && (
            <p className="mt-2 text-[10px] leading-relaxed" style={{ color: 'var(--warning)' }}>
              {selectedDev.availability.note || `${selectedDev.displayName} is inactive for ${date}.`}
            </p>
          )}
        </div>

        <div
          className="rounded-xl border p-3"
          style={{
            background: 'linear-gradient(180deg, color-mix(in srgb, var(--md-accent-dim) 34%, var(--bg-secondary) 66%), color-mix(in srgb, var(--bg-secondary) 82%, transparent))',
            borderColor: 'color-mix(in srgb, var(--md-accent) 16%, var(--border) 84%)',
          }}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ArrowRight size={12} style={{ color: 'var(--md-accent)' }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
                Next move
              </span>
            </div>
            <SaveIndicator state={nextAction.saveState} />
          </div>
          <DraftTextArea
            label="Next Action"
            value={nextAction.local}
            fieldId={nextAction.fieldId}
            onChange={nextAction.handleChange}
            onBlur={() => nextAction.commitDraft(nextAction.localRef.current)}
            placeholder="What should happen next?"
            readOnly={readOnly}
          />
        </div>
      </div>
    </section>
  );
}

function InlineSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  emptyLabel,
  disabled = false,
}: {
  label: string;
  value: T | '';
  options: Array<{ value: T; label: string }>;
  onChange: (value: string) => void;
  emptyLabel?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="w-full cursor-pointer rounded-lg px-2.5 py-2 text-[12px] font-medium outline-none disabled:cursor-not-allowed disabled:opacity-70"
        style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
      >
        {emptyLabel && <option value="">{emptyLabel}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function DraftTextArea({
  label,
  value,
  fieldId,
  onChange,
  onBlur,
  placeholder,
  readOnly,
}: {
  label: string;
  value: string;
  fieldId: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  placeholder: string;
  readOnly: boolean;
}) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  return (
    <>
      <label htmlFor={fieldId} className="sr-only">
        {label}
      </label>
      <textarea
        id={fieldId}
        value={local}
        onChange={(event) => {
          setLocal(event.target.value);
          onChange(event.target.value);
        }}
        onBlur={onBlur}
        readOnly={readOnly}
        placeholder={placeholder}
        rows={3}
        className="w-full resize-none rounded-lg px-3 py-2 text-[12px] leading-relaxed outline-none read-only:cursor-default"
        style={{
          background: 'color-mix(in srgb, var(--bg-primary) 72%, transparent)',
          color: 'var(--text-primary)',
          border: '1px solid color-mix(in srgb, var(--border) 84%, transparent)',
          caretColor: 'var(--md-accent)',
        }}
      />
    </>
  );
}

function SaveIndicator({ state }: { state: 'idle' | 'dirty' | 'saving' | 'saved' }) {
  if (state === 'idle') return null;
  return (
    <span
      className="text-[9px] font-semibold uppercase tracking-[0.12em]"
      style={{ color: state === 'saved' ? 'var(--success)' : 'var(--warning)' }}
    >
      {state === 'saved' ? 'Saved' : 'Saving...'}
    </span>
  );
}
