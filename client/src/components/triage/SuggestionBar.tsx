import { useSuggestions } from '@/hooks/useSuggestions';
import { useUpdateIssue } from '@/hooks/useUpdateIssue';
import { Sparkles } from 'lucide-react';
import type { Issue } from '@/types';

interface SuggestionBarProps {
  issue: Issue;
}

export function SuggestionBar({ issue }: SuggestionBarProps) {
  const { prioritySuggestion, dueDateSuggestion, assigneeSuggestion } = useSuggestions(
    issue.jiraKey,
    issue.priorityName
  );
  const updateIssue = useUpdateIssue();

  const hasSuggestions =
    prioritySuggestion.data || dueDateSuggestion.data || (assigneeSuggestion.data && assigneeSuggestion.data.length > 0);

  if (!hasSuggestions) return null;

  const topAssignee = assigneeSuggestion.data?.[0];

  const handleApplyAll = () => {
    const updates: Record<string, string> = {};
    if (prioritySuggestion.data?.suggested) updates.priorityName = prioritySuggestion.data.suggested;
    if (dueDateSuggestion.data?.suggested) updates.dueDate = dueDateSuggestion.data.suggested;
    if (topAssignee?.developer.accountId) updates.assigneeId = topAssignee.developer.accountId;

    if (Object.keys(updates).length > 0) {
      updateIssue.mutate({ key: issue.jiraKey, update: updates });
    }
  };

  return (
    <div
      className="rounded-lg p-3 flex flex-col gap-2"
      style={{ background: 'var(--bg-glow)', border: '1px solid var(--border-active)' }}
    >
      <span className="text-[11px] font-semibold uppercase flex items-center gap-1.5" style={{ letterSpacing: '0.06em', color: 'var(--accent)' }}>
        <Sparkles size={12} />
        Suggestions
      </span>

      <div className="flex flex-col gap-1.5 text-[13px]">
        {prioritySuggestion.data && (
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--text-muted)' }}>📌</span>
            <span style={{ color: 'var(--text-secondary)' }}>
              Priority: <strong style={{ color: 'var(--text-primary)' }}>{prioritySuggestion.data.suggested}</strong>
            </span>
          </div>
        )}
        {dueDateSuggestion.data && (
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--text-muted)' }}>📅</span>
            <span style={{ color: 'var(--text-secondary)' }}>
              Due: <strong style={{ color: 'var(--text-primary)' }}>{dueDateSuggestion.data.suggested}</strong>
            </span>
          </div>
        )}
        {topAssignee && (
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--text-muted)' }}>👤</span>
            <span style={{ color: 'var(--text-secondary)' }}>
              Assign: <strong style={{ color: 'var(--text-primary)' }}>{topAssignee.developer.displayName}</strong>
              <span className="text-[11px] ml-1" style={{ color: 'var(--text-muted)' }}>({topAssignee.reason})</span>
            </span>
          </div>
        )}
      </div>

      <button
        onClick={handleApplyAll}
        disabled={updateIssue.isPending}
        className="mt-1 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all duration-150 active:scale-[0.97]"
        style={{
          background: 'var(--accent)',
          color: '#fff',
          opacity: updateIssue.isPending ? 0.7 : 1,
        }}
      >
        {updateIssue.isPending ? 'Applying…' : 'Apply All Suggestions'}
      </button>
    </div>
  );
}
