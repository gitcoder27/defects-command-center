import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, Plus, Search, X } from 'lucide-react';
import { useMyDayIssues } from '@/hooks/useIssues';
import { JiraIssueLink } from '@/components/JiraIssueLink';
import { formatDate } from '@/lib/utils';

interface AddTaskFormProps {
  onAdd: (params: { title: string; jiraKey?: string; note?: string }) => void;
  isPending?: boolean;
  disabled?: boolean;
}

export function AddTaskForm({ onAdd, isPending, disabled }: AddTaskFormProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [jiraSearch, setJiraSearch] = useState('');
  const [jiraPickerOpen, setJiraPickerOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<{ jiraKey: string; summary: string } | null>(null);

  const { data: issues } = useMyDayIssues(open && jiraPickerOpen);

  const filteredIssues = useMemo(
    () =>
      issues
        ?.filter(
          (issue) =>
            issue.jiraKey.toLowerCase().includes(jiraSearch.toLowerCase()) ||
            issue.summary.toLowerCase().includes(jiraSearch.toLowerCase())
        )
        .slice(0, 6) ?? [],
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
    if (!trimmedTitle || disabled) {
      return;
    }

    onAdd({
      title: trimmedTitle,
      jiraKey: selectedIssue?.jiraKey,
      note: note.trim() || undefined,
    });
    resetForm();
  };

  if (!open) {
    return (
      <motion.button
        whileTap={{ scale: 0.96 }}
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors"
        style={{
          color: 'var(--text-secondary)',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border)',
        }}
      >
        <Plus size={12} />
        Add Task
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="rounded-xl p-3 space-y-3"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-active)',
      }}
    >
      <div>
        <label htmlFor="my-day-task-title" className="block text-[12px] font-semibold uppercase mb-1.5" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
          Task
        </label>
        <input
          id="my-day-task-title"
          type="text"
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={disabled}
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
          className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
          }}
        />
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="text-[12px] font-semibold uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
            Linked Jira
          </div>
          <button
            type="button"
            onClick={() => setJiraPickerOpen((current) => !current)}
            disabled={disabled}
            className="rounded-lg px-2.5 py-1.5 text-[12px] font-semibold"
            style={{
              color: 'var(--accent)',
              background: 'var(--accent-glow)',
              border: '1px solid color-mix(in srgb, var(--accent) 24%, transparent)',
            }}
          >
            {selectedIssue ? 'Change Jira' : 'Attach Jira'}
          </button>
        </div>

        {selectedIssue && (
          <div
            className="mt-2 rounded-lg p-2.5"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Link size={12} style={{ color: 'var(--accent)' }} />
                  <JiraIssueLink
                    issueKey={selectedIssue.jiraKey}
                    className="font-mono text-[12px] font-semibold shrink-0"
                    style={{ color: 'var(--accent)' }}
                  >
                    {selectedIssue.jiraKey}
                  </JiraIssueLink>
                </div>
                <div className="text-[13px] mt-1" style={{ color: 'var(--text-primary)' }}>
                  {selectedIssue.summary}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedIssue(null);
                  setJiraSearch('');
                }}
                className="h-7 w-7 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                aria-label="Remove linked Jira"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        {jiraPickerOpen && (
          <div className="mt-2 space-y-2">
            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-muted)' }}
              />
              <input
                id="my-day-jira-search"
                type="text"
                value={jiraSearch}
                onChange={(event) => setJiraSearch(event.target.value)}
                disabled={disabled}
                placeholder="Search by key or summary..."
                aria-label="Search Jira issues"
                className="w-full rounded-lg pl-8 pr-3 py-2 text-[13px] outline-none"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
              />
            </div>

            {jiraSearch && filteredIssues.length > 0 && (
              <div
                className="rounded-lg overflow-hidden max-h-[180px] overflow-y-auto"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
              >
                {filteredIssues.map((issue) => (
                  <div
                    key={issue.jiraKey}
                    className="px-3 py-2 transition-colors hover:bg-white/5"
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <div className="flex items-center gap-2">
                      <JiraIssueLink
                        issueKey={issue.jiraKey}
                        stopPropagation
                        className="font-mono text-[11px] font-semibold shrink-0"
                        style={{ color: 'var(--accent)' }}
                      >
                        {issue.jiraKey}
                      </JiraIssueLink>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedIssue({ jiraKey: issue.jiraKey, summary: issue.summary });
                          setJiraPickerOpen(false);
                        }}
                        className="min-w-0 flex-1 truncate text-left text-[13px]"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {issue.summary}
                      </button>
                    </div>
                    {(issue.priorityName || issue.developmentDueDate || issue.dueDate) && (
                      <div className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {[
                          issue.priorityName,
                          (issue.developmentDueDate ?? issue.dueDate)
                            ? `Due ${formatDate(issue.developmentDueDate ?? issue.dueDate)}`
                            : undefined,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="my-day-task-notes" className="block text-[12px] font-semibold uppercase mb-1.5" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
          Notes
        </label>
        <textarea
          id="my-day-task-notes"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          disabled={disabled}
          rows={2}
          placeholder="Optional context or handoff detail"
          className="w-full rounded-lg px-3 py-2 text-[13px] outline-none resize-none"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
          }}
        />
      </div>

      <div className="flex items-center gap-2">
        <motion.button
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={handleSubmit}
          disabled={!title.trim() || isPending || disabled}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-all disabled:opacity-40"
          style={{
            background: 'var(--accent-glow)',
            color: 'var(--accent)',
            border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
          }}
        >
          <Plus size={12} />
          Add Task
        </motion.button>
        <button
          type="button"
          onClick={resetForm}
          className="text-[13px] px-2 py-1.5"
          style={{ color: 'var(--text-muted)' }}
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}
