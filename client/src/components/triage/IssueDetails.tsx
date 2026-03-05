import type { Issue } from '@/types';
import { formatRelativeTime } from '@/lib/utils';

export function IssueDetails({ issue }: { issue: Issue }) {
  const fields = [
    { label: 'Status', value: issue.statusName },
    { label: 'Component', value: issue.component ?? '—' },
    { label: 'Reporter', value: issue.reporterName ?? '—' },
    { label: 'Created', value: formatRelativeTime(issue.createdAt) },
    { label: 'Updated', value: formatRelativeTime(issue.updatedAt) },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {fields.map((field) => (
        <div
          key={field.label}
          className="rounded-xl px-3 py-2.5"
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
        >
          <span className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
            {field.label}
          </span>
          <span
            className="mt-1 block text-[13px] font-medium"
            style={{ color: 'var(--text-primary)' }}
          >
            {field.value}
          </span>
        </div>
      ))}

      {issue.labels && issue.labels.length > 0 && (
        <div
          className="rounded-xl px-3 py-2.5 sm:col-span-2"
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
        >
          <span className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
            Labels
          </span>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {issue.labels.map((label) => (
              <span
                key={label}
                className="text-[11px] px-2 py-0.5 rounded-full"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
