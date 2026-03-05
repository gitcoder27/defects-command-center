import type { Issue } from '@/types';
import { formatRelativeTime, formatDate, priorityColor } from '@/lib/utils';

export function IssueDetails({ issue }: { issue: Issue }) {
  const fields = [
    { label: 'Priority', value: issue.priorityName, color: priorityColor(issue.priorityName) },
    { label: 'Status', value: issue.statusName },
    { label: 'Assignee', value: issue.assigneeName ?? 'Unassigned' },
    { label: 'Due Date', value: formatDate(issue.developmentDueDate ?? issue.dueDate ?? undefined) },
    { label: 'Reporter', value: issue.reporterName ?? '—' },
    { label: 'Created', value: formatRelativeTime(issue.createdAt) },
    { label: 'Updated', value: formatRelativeTime(issue.updatedAt) },
    { label: 'Blocked', value: issue.flagged ? 'Yes 🚫' : 'No' },
  ];

  return (
    <div className="flex flex-col gap-2">
      {fields.map((field) => (
        <div key={field.label} className="flex items-center justify-between py-1.5 px-1" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>
            {field.label}
          </span>
          <span
            className="text-[13px] font-medium"
            style={{ color: field.color ?? 'var(--text-primary)' }}
          >
            {field.value}
          </span>
        </div>
      ))}

      {/* Labels */}
      {issue.labels && issue.labels.length > 0 && (
        <div className="flex items-start justify-between py-1.5 px-1" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>
            Labels
          </span>
          <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
            {issue.labels.map((label) => (
              <span
                key={label}
                className="text-[11px] px-1.5 py-0.5 rounded-full"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
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
