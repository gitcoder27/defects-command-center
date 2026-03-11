import { useMemo, useState } from 'react';
import { Link, Plus, Search, X } from 'lucide-react';

interface AddTrackerItemFormProps {
  onAdd: (params: { title: string; jiraKey?: string; note?: string }) => void;
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
  const [open, setOpen] = useState(false);
  const isOpen = open;
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [jiraSearch, setJiraSearch] = useState('');
  const [jiraPickerOpen, setJiraPickerOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<{
    jiraKey: string;
    summary: string;
  } | null>(null);

  const filteredIssues = useMemo(
    () =>
      issues
        ?.filter(
          (issue) =>
            issue.jiraKey.toLowerCase().includes(jiraSearch.toLowerCase()) ||
            issue.summary.toLowerCase().includes(jiraSearch.toLowerCase())
        )
        .slice(0, 8) ?? [],
    [issues, jiraSearch]
  );

  const resetForm = () => {
    setOpen(false);
    setTitle('');
    setNote('');
    setJiraSearch('');
    setJiraPickerOpen(false);
    setSelectedIssue(null);
  };

  const handleSubmit = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }

    onAdd({
      title: trimmedTitle,
      jiraKey: selectedIssue?.jiraKey,
      note: note.trim() || undefined,
    });
    resetForm();
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] transition-colors"
        style={{ color: 'var(--text-muted)', background: 'var(--bg-tertiary)' }}
      >
        <Plus size={10} />
        Add Task
      </button>
    );
  }

  return (
    <div
      className="rounded-xl p-3 space-y-2"
      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-active)' }}
    >
      <div>
        <div className="text-[10px] font-semibold uppercase mb-1" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
          Task
        </div>
        <input
          type="text"
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              handleSubmit();
            }
            if (event.key === 'Escape') {
              resetForm();
            }
          }}
          placeholder="Describe the work in one line"
          className="w-full rounded-lg px-2.5 py-2 text-[12px] outline-none"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-active)',
          }}
        />
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
            Linked Jira
          </div>
          <button
            type="button"
            onClick={() => setJiraPickerOpen((current) => !current)}
            className="text-[10px] px-2 py-1 rounded-md"
            style={{ color: 'var(--accent)', background: 'var(--accent-glow)' }}
          >
            {selectedIssue ? 'Change Jira' : 'Attach Jira'}
          </button>
        </div>

        {selectedIssue && (
          <div
            className="mt-1.5 flex items-start justify-between gap-2 rounded-lg px-2.5 py-2"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Link size={10} style={{ color: 'var(--accent)' }} />
                <span className="font-mono text-[10px] font-semibold" style={{ color: 'var(--accent)' }}>
                  {selectedIssue.jiraKey}
                </span>
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {selectedIssue.summary}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedIssue(null);
                setJiraSearch('');
              }}
              className="h-6 w-6 rounded-md flex items-center justify-center"
              style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}
              aria-label="Remove linked Jira"
            >
              <X size={10} />
            </button>
          </div>
        )}

        {jiraPickerOpen && (
          <div className="mt-1.5 space-y-1.5">
            <div className="relative">
              <Search
                size={12}
                className="absolute left-2.5 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-muted)' }}
              />
              <input
                type="text"
                value={jiraSearch}
                onChange={(event) => setJiraSearch(event.target.value)}
                placeholder="Search Jira issues"
                className="w-full rounded-lg pl-8 pr-3 py-2 text-[12px] outline-none"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
              />
            </div>

            {jiraSearch && filteredIssues.length > 0 && (
              <div
                className="rounded-lg overflow-hidden max-h-[160px] overflow-y-auto"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
              >
                {filteredIssues.map((issue) => (
                  <button
                    key={issue.jiraKey}
                    type="button"
                    onClick={() => {
                      setSelectedIssue({ jiraKey: issue.jiraKey, summary: issue.summary });
                      setJiraPickerOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-2 transition-colors hover:bg-white/5"
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
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <div className="text-[10px] font-semibold uppercase mb-1" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
          Notes
        </div>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          placeholder="Optional context or handoff detail"
          className="w-full rounded-lg px-2.5 py-2 text-[11px] outline-none resize-none"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
          }}
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!title.trim() || isPending}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium disabled:opacity-40"
          style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}
        >
          <Plus size={10} />
          Add Task
        </button>
        <button
          type="button"
          onClick={resetForm}
          className="text-[11px] px-1"
          style={{ color: 'var(--text-muted)' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
