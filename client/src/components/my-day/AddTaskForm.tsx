import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Link, FileText, Search } from 'lucide-react';
import type { TrackerItemType } from '@/types';
import { useMyDayIssues } from '@/hooks/useIssues';
import { formatDate } from '@/lib/utils';

interface AddTaskFormProps {
  onAdd: (params: { itemType: TrackerItemType; title: string; jiraKey?: string; note?: string }) => void;
  isPending?: boolean;
}

export function AddTaskForm({ onAdd, isPending }: AddTaskFormProps) {
  const [mode, setMode] = useState<'idle' | 'custom' | 'jira'>('idle');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [jiraSearch, setJiraSearch] = useState('');
  const [selectedIssue, setSelectedIssue] = useState<{ jiraKey: string; summary: string } | null>(null);

  const { data: issues } = useMyDayIssues(mode === 'jira');

  const resetForm = () => {
    setTitle('');
    setNote('');
    setJiraSearch('');
    setSelectedIssue(null);
    setMode('idle');
  };

  const filteredIssues = issues
    ?.filter(
      (i) =>
        i.jiraKey.toLowerCase().includes(jiraSearch.toLowerCase()) ||
        i.summary.toLowerCase().includes(jiraSearch.toLowerCase())
    )
    .slice(0, 6);

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
      <div className="flex items-center gap-2">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setMode('custom')}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-medium transition-colors"
          style={{
            color: 'var(--text-secondary)',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
          }}
        >
          <FileText size={12} />
          Add Custom Task
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setMode('jira')}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-medium transition-colors"
          style={{
            color: 'var(--text-secondary)',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
          }}
        >
          <Link size={12} />
          Add Jira Issue
        </motion.button>
      </div>
    );
  }

  if (mode === 'custom') {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="rounded-xl p-3 space-y-2"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-active)',
        }}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <FileText size={12} style={{ color: 'var(--accent)' }} />
          <span className="text-[11px] font-semibold" style={{ color: 'var(--accent)' }}>
            New Custom Task
          </span>
        </div>
        <input
          type="text"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmitCustom();
            if (e.key === 'Escape') resetForm();
          }}
          placeholder="What are you working on?"
          className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
          }}
        />
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Optional note or context"
          className="w-full rounded-lg px-3 py-2 text-[12px] outline-none resize-none"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
          }}
        />
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmitCustom}
            disabled={!title.trim() || isPending}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all disabled:opacity-40"
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
            onClick={resetForm}
            className="text-[12px] px-2 py-1.5"
            style={{ color: 'var(--text-muted)' }}
          >
            Cancel
          </button>
        </div>
      </motion.div>
    );
  }

  // Jira mode
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="rounded-xl p-3 space-y-2"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-active)',
      }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <Link size={12} style={{ color: 'var(--accent)' }} />
        <span className="text-[11px] font-semibold" style={{ color: 'var(--accent)' }}>
          Link Jira Issue
        </span>
      </div>
      <div className="relative">
        <Search
          size={13}
          className="absolute left-2.5 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--text-muted)' }}
        />
        <input
          type="text"
          autoFocus
          value={jiraSearch}
          onChange={(e) => setJiraSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') resetForm();
          }}
          placeholder="Search by key or summary..."
          className="w-full rounded-lg pl-8 pr-3 py-2 text-[13px] outline-none"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
          }}
        />
      </div>
      {jiraSearch && filteredIssues && filteredIssues.length > 0 && !selectedIssue && (
        <div
          className="rounded-lg overflow-hidden max-h-[180px] overflow-y-auto"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
        >
          {filteredIssues.map((issue) => (
            <button
              key={issue.jiraKey}
              onClick={() =>
                setSelectedIssue({ jiraKey: issue.jiraKey, summary: issue.summary })
              }
              className="w-full text-left px-3 py-2 transition-colors hover:bg-white/5"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-[10px] font-semibold shrink-0"
                  style={{ color: 'var(--accent)' }}
                >
                  {issue.jiraKey}
                </span>
                <span
                  className="text-[12px] truncate"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {issue.summary}
                </span>
              </div>
              {(issue.priorityName || issue.developmentDueDate || issue.dueDate) && (
                <div className="mt-0.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
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
            </button>
          ))}
        </div>
      )}
      {selectedIssue && (
        <div
          className="rounded-lg p-2.5 space-y-2"
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <span
              className="font-mono text-[11px] font-semibold shrink-0"
              style={{ color: 'var(--accent)' }}
            >
              {selectedIssue.jiraKey}
            </span>
            <span className="text-[12px]" style={{ color: 'var(--text-primary)' }}>
              {selectedIssue.summary}
            </span>
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Optional note"
            className="w-full rounded-lg px-3 py-2 text-[12px] outline-none resize-none"
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
          />
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmitJira}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold disabled:opacity-40"
            style={{
              background: 'var(--accent-glow)',
              color: 'var(--accent)',
              border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
            }}
          >
            <Plus size={12} />
            Add Jira Item
          </motion.button>
        </div>
      )}
      <button
        onClick={resetForm}
        className="text-[12px] px-2 py-1"
        style={{ color: 'var(--text-muted)' }}
      >
        Cancel
      </button>
    </motion.div>
  );
}
