import { useState } from 'react';
import { Plus, Link, FileText } from 'lucide-react';
import type { TrackerItemType } from '@/types';

interface AddTrackerItemFormProps {
  onAdd: (params: { itemType: TrackerItemType; title: string; jiraKey?: string; note?: string }) => void;
  issues?: Array<{
    jiraKey: string;
    summary: string;
    priorityName?: string;
    dueDate?: string;
    developmentDueDate?: string;
  }>;
  isPending?: boolean;
}

export function AddTrackerItemForm({ onAdd, issues, isPending }: AddTrackerItemFormProps) {
  const [mode, setMode] = useState<'idle' | 'custom' | 'jira'>('idle');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [jiraSearch, setJiraSearch] = useState('');
  const [selectedIssue, setSelectedIssue] = useState<{
    jiraKey: string;
    summary: string;
  } | null>(null);

  const resetForm = () => {
    setTitle('');
    setNote('');
    setJiraSearch('');
    setSelectedIssue(null);
    setMode('idle');
  };

  const filteredIssues = issues?.filter(
    (i) =>
      i.jiraKey.toLowerCase().includes(jiraSearch.toLowerCase()) ||
      i.summary.toLowerCase().includes(jiraSearch.toLowerCase())
  ).slice(0, 8);

  const handleSubmitCustom = () => {
    if (!title.trim()) return;
    onAdd({ itemType: 'custom', title: title.trim(), note: note.trim() || undefined });
    resetForm();
  };

  const handleSubmitJira = () => {
    if (!selectedIssue) return;
    onAdd({
      itemType: 'jira',
      jiraKey: selectedIssue.jiraKey,
      title: selectedIssue.summary,
      note: note.trim() || undefined,
    });
    resetForm();
  };

  if (mode === 'idle') {
    return (
      <div className="flex items-center gap-1 pt-1">
        <button
          onClick={() => setMode('custom')}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] transition-colors"
          style={{ color: 'var(--text-muted)', background: 'var(--bg-tertiary)' }}
        >
          <FileText size={10} />
          Custom
        </button>
        <button
          onClick={() => setMode('jira')}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] transition-colors"
          style={{ color: 'var(--text-muted)', background: 'var(--bg-tertiary)' }}
        >
          <Link size={10} />
          Jira
        </button>
      </div>
    );
  }

  if (mode === 'custom') {
    return (
      <div className="pt-1 space-y-1.5">
        <div className="flex items-center gap-1">
          <input
            type="text"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmitCustom();
              if (e.key === 'Escape') resetForm();
            }}
            placeholder="What are they working on?"
            className="flex-1 rounded-lg px-2 py-1 text-[12px] outline-none"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-active)',
            }}
          />
          <button
            onClick={handleSubmitCustom}
            disabled={!title.trim() || isPending}
            className="h-6 w-6 rounded-md flex items-center justify-center disabled:opacity-40"
            style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}
          >
            <Plus size={12} />
          </button>
          <button
            onClick={resetForm}
            className="text-[11px] px-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Cancel
          </button>
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Optional note"
          className="w-full rounded-lg px-2 py-1.5 text-[11px] outline-none resize-none"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
          }}
        />
      </div>
    );
  }

  // Jira mode
  return (
    <div className="pt-1">
      <input
        type="text"
        autoFocus
        value={jiraSearch}
        onChange={(e) => setJiraSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') resetForm();
        }}
        placeholder="Search Jira issues..."
        className="w-full rounded-lg px-2 py-1 text-[12px] outline-none"
        style={{
          background: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-active)',
        }}
      />
      {jiraSearch && filteredIssues && filteredIssues.length > 0 && (
        <div
          className="mt-1 rounded-lg overflow-hidden max-h-[140px] overflow-y-auto"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
        >
          {filteredIssues.map((issue) => (
            <button
              key={issue.jiraKey}
              onClick={() => setSelectedIssue({ jiraKey: issue.jiraKey, summary: issue.summary })}
              disabled={isPending && selectedIssue?.jiraKey === issue.jiraKey}
              className="w-full text-left px-2 py-1.5 transition-colors"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-semibold shrink-0" style={{ color: 'var(--accent)' }}>
                  {issue.jiraKey}
                </span>
                <span className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>
                  {issue.summary}
                </span>
              </div>
              {(issue.priorityName || issue.developmentDueDate || issue.dueDate) && (
                <div className="mt-0.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {[
                    issue.priorityName,
                    (issue.developmentDueDate ?? issue.dueDate)
                      ? `Due ${issue.developmentDueDate ?? issue.dueDate}`
                      : undefined,
                  ]
                    .filter(Boolean)
                    .join(' • ')}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
      {selectedIssue && (
        <div
          className="mt-1.5 rounded-lg p-2 space-y-2"
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold shrink-0" style={{ color: 'var(--accent)' }}>
              {selectedIssue.jiraKey}
            </span>
            <span className="text-[11px]" style={{ color: 'var(--text-primary)' }}>
              {selectedIssue.summary}
            </span>
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Optional note"
            className="w-full rounded-lg px-2 py-1.5 text-[11px] outline-none resize-none"
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
          />
          <button
            onClick={handleSubmitJira}
            disabled={isPending}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium disabled:opacity-40"
            style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}
          >
            <Plus size={10} />
            Add Jira Item
          </button>
        </div>
      )}
      <button
        onClick={resetForm}
        className="text-[11px] px-1 mt-1"
        style={{ color: 'var(--text-muted)' }}
      >
        Cancel
      </button>
    </div>
  );
}
