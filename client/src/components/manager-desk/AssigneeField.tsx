import { useDevelopers } from '@/hooks/useDevelopers';
import type { ManagerDeskItem } from '@/types/manager-desk';
import { AssigneePill } from './AssigneePill';

interface AssigneeFieldProps {
  item: ManagerDeskItem;
  date: string;
  onChange: (accountId: string | null) => void;
}

export function AssigneeField({ item, date, onChange }: AssigneeFieldProps) {
  const { data: developers } = useDevelopers(date);
  const assigneeId = item.assignee?.accountId ?? '';
  const selectedDeveloper = developers?.find((developer) => developer.accountId === assigneeId);

  return (
    <div className="rounded-[20px] border p-3.5" style={{ borderColor: 'var(--border)', background: 'rgba(217, 169, 78, 0.06)' }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--md-accent)' }}>
            Assignment
          </div>
          <p className="mt-1 text-[12px] leading-5" style={{ color: 'var(--text-secondary)' }}>
            Give the task a single team owner. Developer links below stay as related context only.
          </p>
        </div>
        <AssigneePill assignee={item.assignee} />
      </div>

      <label
        htmlFor={`manager-desk-assignee-${item.id}`}
        className="mt-3 block text-[10px] font-bold uppercase tracking-[0.18em]"
        style={{ color: 'var(--text-muted)' }}
      >
        Assigned To
      </label>
      <select
        id={`manager-desk-assignee-${item.id}`}
        value={assigneeId}
        onChange={(event) => onChange(event.target.value || null)}
        className="mt-1 w-full rounded-xl px-3 py-2 text-[12px] font-medium outline-none"
        style={{
          background: 'var(--bg-elevated)',
          color: 'var(--text-primary)',
          border: '1px solid color-mix(in srgb, var(--md-accent) 26%, var(--border) 74%)',
        }}
      >
        <option value="">Unassigned</option>
        {(developers ?? []).map((developer) => (
          <option key={developer.accountId} value={developer.accountId}>
            {developer.availability?.state === 'inactive'
              ? `${developer.displayName} (inactive)`
              : developer.displayName}
          </option>
        ))}
      </select>
      {selectedDeveloper?.availability?.state === 'inactive' && (
        <p className="mt-2 text-[11px]" style={{ color: 'var(--warning)' }}>
          {selectedDeveloper.availability.note || `${selectedDeveloper.displayName} is inactive for ${date}.`}
        </p>
      )}
    </div>
  );
}
