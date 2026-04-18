import { useEffect, useId, useState } from 'react';
import { useDevelopers } from '@/hooks/useDevelopers';
import type { ManagerDeskItem, ManagerDeskUpdateItemPayload } from '@/types/manager-desk';
import { KIND_LABELS, STATUS_LABELS, CATEGORY_LABELS, PRIORITY_LABELS } from '@/types/manager-desk';

interface DrawerPropertiesProps {
  item: ManagerDeskItem;
  date: string;
  readOnly?: boolean;
  onFieldChange: (field: keyof ManagerDeskUpdateItemPayload, value: string) => void;
  onAssigneeChange: (accountId: string | null) => void;
}

const kindOpts = (['action', 'meeting', 'decision', 'waiting'] as const).map((v) => ({ value: v, label: KIND_LABELS[v] }));
const statusOpts = (['inbox', 'planned', 'in_progress', 'waiting', 'done', 'cancelled'] as const).map((v) => ({ value: v, label: STATUS_LABELS[v] }));
const categoryOpts = (['analysis', 'design', 'team_management', 'cross_team', 'follow_up', 'escalation', 'admin', 'planning', 'other'] as const).map((v) => ({ value: v, label: CATEGORY_LABELS[v] }));
const priorityOpts = (['low', 'medium', 'high', 'critical'] as const).map((v) => ({ value: v, label: PRIORITY_LABELS[v] }));

export function DrawerProperties({ item, date, readOnly = false, onFieldChange, onAssigneeChange }: DrawerPropertiesProps) {
  const { data: developers } = useDevelopers(date);
  const assigneeId = item.assignee?.accountId ?? '';
  const selectedDev = developers?.find((d) => d.accountId === assigneeId);
  const hasLinkedWork = !!item.delegatedExecution;

  const filteredStatusOpts = hasLinkedWork
    ? statusOpts.filter((o) => o.value !== 'cancelled')
    : statusOpts;

  return (
    <div className="space-y-3 px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>
        Properties
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        <InlineSelect label="Kind" value={item.kind} options={kindOpts} onChange={(v) => onFieldChange('kind', v)} disabled={readOnly} />
        <InlineSelect label="Status" value={item.status} options={filteredStatusOpts} onChange={(v) => onFieldChange('status', v)} disabled={readOnly} />
        <InlineSelect label="Category" value={item.category} options={categoryOpts} onChange={(v) => onFieldChange('category', v)} disabled={readOnly} />
        <InlineSelect label="Priority" value={item.priority} options={priorityOpts} onChange={(v) => onFieldChange('priority', v)} disabled={readOnly} />
        <div className="col-span-2">
          <InlineSelect
            label="Assignee"
            value={assigneeId}
            options={(developers ?? []).map((d) => ({
              value: d.accountId,
              label: d.availability?.state === 'inactive' ? `${d.displayName} (inactive)` : d.displayName,
            }))}
            onChange={(v) => onAssigneeChange(v || null)}
            disabled={readOnly || hasLinkedWork}
            emptyLabel={hasLinkedWork ? undefined : 'Unassigned'}
          />
          {hasLinkedWork && assigneeId && (
            <p className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
              Assignee is locked while delegated work is active. Use the actions menu to remove from desk or cancel the task.
            </p>
          )}
          {selectedDev?.availability?.state === 'inactive' && (
            <p className="mt-1 text-[10px]" style={{ color: 'var(--warning)' }}>
              {selectedDev.availability.note || `${selectedDev.displayName} is inactive for ${date}.`}
            </p>
          )}
        </div>
        <InlineText label="Participants" value={item.participants ?? ''} placeholder="e.g. Design Team, Rahul" onChange={(v) => onFieldChange('participants', v)} className="col-span-2" disabled={readOnly} />
        <InlineDatetime label="Start" value={item.plannedStartAt ?? ''} onChange={(v) => onFieldChange('plannedStartAt', v)} disabled={readOnly} />
        <InlineDatetime label="End" value={item.plannedEndAt ?? ''} onChange={(v) => onFieldChange('plannedEndAt', v)} disabled={readOnly} />
        <InlineDatetime label="Follow-Up" value={item.followUpAt ?? ''} onChange={(v) => onFieldChange('followUpAt', v)} className="col-span-2" disabled={readOnly} />
      </div>
    </div>
  );
}

function InlineSelect<T extends string>({ label, value, options, onChange, emptyLabel, disabled = false }: {
  label: string; value: T | ''; options: Array<{ value: T; label: string }>; onChange: (value: string) => void; emptyLabel?: string; disabled?: boolean;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-0.5 block text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="w-full cursor-pointer rounded-lg px-2 py-1.5 text-[11px] font-medium outline-none disabled:cursor-not-allowed disabled:opacity-70" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
        {emptyLabel && <option value="">{emptyLabel}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function InlineText({ label, value, placeholder, onChange, className, disabled = false }: {
  label: string; value: string; placeholder: string; onChange: (value: string) => void; className?: string; disabled?: boolean;
}) {
  const id = useId();
  const [local, setLocal] = useState(value);
  useEffect(() => { setLocal(value); }, [value]);
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-0.5 block text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>{label}</label>
      <input id={id} type="text" value={local} onChange={(e) => setLocal(e.target.value)} onBlur={() => { if (local !== value) onChange(local); }} placeholder={placeholder} disabled={disabled} className="w-full rounded-lg px-2 py-1.5 text-[11px] outline-none disabled:cursor-not-allowed disabled:opacity-70" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
    </div>
  );
}

function InlineDatetime({ label, value, onChange, className, disabled = false }: {
  label: string; value: string; onChange: (value: string) => void; className?: string; disabled?: boolean;
}) {
  const id = useId();
  const localValue = value ? value.slice(0, 16) : '';
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-0.5 block text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>{label}</label>
      <input id={id} type="datetime-local" value={localValue} onChange={(e) => { const v = e.target.value; onChange(v ? new Date(v).toISOString() : ''); }} disabled={disabled} className="w-full rounded-lg px-2 py-1.5 text-[11px] outline-none disabled:cursor-not-allowed disabled:opacity-70" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
    </div>
  );
}
