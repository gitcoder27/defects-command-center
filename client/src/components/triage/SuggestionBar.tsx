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
    <div className="triage-section">
      <div
        className="rounded-lg px-3.5 py-3 flex flex-col gap-2.5"
        style={{ background: 'var(--bg-glow)', border: '1px solid var(--border-active)' }}
      >
        <div className="flex items-center justify-between">
          <span className="triage-section-label" style={{ color: 'var(--accent)' }}>
            <Sparkles size={11} /> Suggestions
          </span>
          <button
            onClick={handleApplyAll}
            disabled={updateIssue.isPending}
            className="px-2.5 py-1 rounded-md text-[10.5px] font-semibold transition-all duration-150 active:scale-[0.97]"
            style={{ background: 'var(--accent)', color: '#fff', opacity: updateIssue.isPending ? 0.6 : 1 }}
          >
            {updateIssue.isPending ? 'Applying…' : 'Apply All'}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 text-[11.5px]">
          {prioritySuggestion.data && (
            <span className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              📌 <strong style={{ color: 'var(--text-primary)' }}>{prioritySuggestion.data.suggested}</strong>
            </span>
          )}
          {dueDateSuggestion.data && (
            <span className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              📅 <strong style={{ color: 'var(--text-primary)' }}>{dueDateSuggestion.data.suggested}</strong>
            </span>
          )}
          {topAssignee && (
            <span className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              👤 <strong style={{ color: 'var(--text-primary)' }}>{topAssignee.developer.displayName}</strong>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>({topAssignee.reason})</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
