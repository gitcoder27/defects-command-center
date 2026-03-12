import { useState } from 'react';
import { formatDate, formatRelativeTime, priorityColor } from '@/lib/utils';
import { PRIORITY_OPTIONS } from '@/lib/constants';
import type { Issue, Developer } from '@/types';

interface TriagePropertiesProps {
  issue: Issue;
  developers: Developer[] | undefined;
  editingField: string | null;
  onEditField: (field: string | null) => void;
  onUpdate: (key: string, update: Record<string, unknown>) => void;
  jiraAspenSeverityField?: string;
}

function InlineProperty({
  label,
  children,
  accentDot,
}: {
  label: string;
  children: React.ReactNode;
  accentDot?: string;
}) {
  return (
    <div
      className="flex items-center justify-between py-[7px] px-2.5 rounded-md transition-colors hover:bg-[var(--bg-tertiary)]"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <span className="text-[10.5px] font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
        {accentDot && (
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accentDot }} />
        )}
        {label}
      </span>
      <div className="text-right">{children}</div>
    </div>
  );
}

export function TriageProperties({ issue, developers, editingField, onEditField, onUpdate, jiraAspenSeverityField }: TriagePropertiesProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="triage-section">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between mb-1"
      >
        <span className="triage-section-label flex items-center gap-1">
          Properties
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{expanded ? '▾' : '▸'}</span>
        </span>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          <span className="font-mono">P</span>&thinsp;priority · <span className="font-mono">A</span>&thinsp;assignee · <span className="font-mono">D</span>&thinsp;due
        </span>
      </button>

      {expanded && (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
          {/* ASPEN Severity */}
          {jiraAspenSeverityField && (
            <InlineProperty label="Severity" accentDot="rgba(99,102,241,0.6)">
              <span
                className="text-[11.5px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: issue.aspenSeverity ? 'rgba(99,102,241,0.12)' : 'transparent',
                  color: issue.aspenSeverity ? 'rgb(99,102,241)' : 'var(--text-muted)',
                }}
              >
                {issue.aspenSeverity ?? 'Not set'}
              </span>
            </InlineProperty>
          )}

          {/* Priority */}
          <InlineProperty label="Priority" accentDot={priorityColor(issue.priorityName)}>
            {editingField === 'priority' ? (
              <select
                autoFocus
                value={issue.priorityName}
                onChange={(e) => { onUpdate(issue.jiraKey, { priorityName: e.target.value }); onEditField(null); }}
                onBlur={() => onEditField(null)}
                className="text-[11.5px] px-2 py-0.5 rounded-md bg-transparent outline-none"
                style={{ color: 'var(--text-primary)', border: '1px solid var(--border-active)' }}
              >
                {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            ) : (
              <button onClick={() => onEditField('priority')} className="text-[11.5px] font-semibold hover:underline" style={{ color: priorityColor(issue.priorityName) }}>
                {issue.priorityName}
                <span className="text-[10px] font-normal ml-1" style={{ color: 'var(--text-muted)' }}>Edit</span>
              </button>
            )}
          </InlineProperty>

          {/* Assignee */}
          <InlineProperty label="Assignee">
            {editingField === 'assignee' ? (
              <select
                autoFocus
                value={issue.assigneeId ?? ''}
                onChange={(e) => { onUpdate(issue.jiraKey, { assigneeId: e.target.value || undefined }); onEditField(null); }}
                onBlur={() => onEditField(null)}
                className="text-[11.5px] px-2 py-0.5 rounded-md bg-transparent outline-none"
                style={{ color: 'var(--text-primary)', border: '1px solid var(--border-active)' }}
              >
                <option value="">Unassigned</option>
                {developers?.map((d: Developer) => (
                  <option key={d.accountId} value={d.accountId}>{d.displayName}</option>
                ))}
              </select>
            ) : (
              <button onClick={() => onEditField('assignee')} className="text-[11.5px] font-medium hover:underline" style={{ color: 'var(--text-primary)' }}>
                {issue.assigneeName ?? 'Unassigned'}
                <span className="text-[10px] font-normal ml-1" style={{ color: 'var(--text-muted)' }}>Edit</span>
              </button>
            )}
          </InlineProperty>

          {/* Due Date */}
          <InlineProperty label="Due Date">
            {editingField === 'dueDate' ? (
              <input
                type="date"
                autoFocus
                value={issue.developmentDueDate ?? issue.dueDate ?? ''}
                onChange={(e) => { onUpdate(issue.jiraKey, { developmentDueDate: e.target.value }); onEditField(null); }}
                onBlur={() => onEditField(null)}
                className="text-[11.5px] px-2 py-0.5 rounded-md bg-transparent outline-none"
                style={{ color: 'var(--text-primary)', border: '1px solid var(--border-active)' }}
              />
            ) : (
              <button onClick={() => onEditField('dueDate')} className="text-[11.5px] font-medium hover:underline" style={{ color: 'var(--text-primary)' }}>
                {formatDate(issue.developmentDueDate ?? issue.dueDate ?? undefined)}
                <span className="text-[10px] font-normal ml-1" style={{ color: 'var(--text-muted)' }}>Edit</span>
              </button>
            )}
          </InlineProperty>

          {/* Blocked */}
          <InlineProperty label="Blocked" accentDot={issue.flagged ? 'var(--danger)' : undefined}>
            <button
              onClick={() => onUpdate(issue.jiraKey, { flagged: !issue.flagged })}
              className="text-[11.5px] font-semibold hover:underline"
              style={{ color: issue.flagged ? 'var(--danger)' : 'var(--text-secondary)' }}
            >
              {issue.flagged ? 'Blocked' : 'Not Blocked'}
              <span className="text-[10px] font-normal ml-1" style={{ color: 'var(--text-muted)' }}>
                {issue.flagged ? 'Clear' : 'Mark'}
              </span>
            </button>
          </InlineProperty>

          {/* Status */}
          <InlineProperty label="Status">
            <span className="text-[11.5px] font-medium" style={{ color: 'var(--text-primary)' }}>
              {issue.statusName}
            </span>
          </InlineProperty>

          {/* Last Updated */}
          <InlineProperty label="Updated">
            <span className="text-[11.5px] font-mono" style={{ color: 'var(--text-secondary)' }}>
              {formatRelativeTime(issue.updatedAt)}
            </span>
          </InlineProperty>

          {/* Component */}
          <InlineProperty label="Component">
            <span className="text-[11.5px]" style={{ color: 'var(--text-secondary)' }}>
              {issue.component ?? '—'}
            </span>
          </InlineProperty>

          {/* Reporter */}
          <InlineProperty label="Reporter">
            <span className="text-[11.5px]" style={{ color: 'var(--text-secondary)' }}>
              {issue.reporterName ?? '—'}
            </span>
          </InlineProperty>

          {/* Created */}
          <InlineProperty label="Created">
            <span className="text-[11.5px] font-mono" style={{ color: 'var(--text-secondary)' }}>
              {formatRelativeTime(issue.createdAt)}
            </span>
          </InlineProperty>

          {/* Labels */}
          {issue.labels && issue.labels.length > 0 && (
            <div className="flex items-center justify-between py-[7px] px-2.5">
              <span className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Labels
              </span>
              <div className="flex flex-wrap gap-1 justify-end">
                {issue.labels.map((label) => (
                  <span
                    key={label}
                    className="text-[10px] px-1.5 py-[1px] rounded-full"
                    style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
