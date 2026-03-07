import { useState } from 'react';
import { Plus, Link, FileText } from 'lucide-react';
import type { TrackerItemType } from '@/types';

interface AddTrackerItemFormProps {
  onAdd: (params: { itemType: TrackerItemType; title: string; jiraKey?: string; note?: string }) => void;
  issues?: Array<{ jiraKey: string; summary: string }>;
  isPending?: boolean;
}

export function AddTrackerItemForm({ onAdd, issues, isPending }: AddTrackerItemFormProps) {
  const [mode, setMode] = useState<'idle' | 'custom' | 'jira'>('idle');
  const [title, setTitle] = useState('');
  const [jiraSearch, setJiraSearch] = useState('');
  const [selectedJiraKey, setSelectedJiraKey] = useState('');

  const filteredIssues = issues?.filter(
    (i) =>
      i.jiraKey.toLowerCase().includes(jiraSearch.toLowerCase()) ||
      i.summary.toLowerCase().includes(jiraSearch.toLowerCase())
  ).slice(0, 8);

  const handleSubmitCustom = () => {
    if (!title.trim()) return;
    onAdd({ itemType: 'custom', title: title.trim() });
    setTitle('');
    setMode('idle');
  };

  const handleSelectJira = (key: string, summary: string) => {
    setSelectedJiraKey(key);
    onAdd({ itemType: 'jira', jiraKey: key, title: summary });
    setJiraSearch('');
    setSelectedJiraKey('');
    setMode('idle');
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
      <div className="flex items-center gap-1 pt-1">
        <input
          type="text"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmitCustom();
            if (e.key === 'Escape') { setTitle(''); setMode('idle'); }
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
          onClick={() => { setTitle(''); setMode('idle'); }}
          className="text-[11px] px-1"
          style={{ color: 'var(--text-muted)' }}
        >
          Cancel
        </button>
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
          if (e.key === 'Escape') { setJiraSearch(''); setMode('idle'); }
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
              onClick={() => handleSelectJira(issue.jiraKey, issue.summary)}
              disabled={isPending && selectedJiraKey === issue.jiraKey}
              className="w-full text-left px-2 py-1.5 flex items-center gap-2 transition-colors"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <span className="font-mono text-[10px] font-semibold shrink-0" style={{ color: 'var(--accent)' }}>
                {issue.jiraKey}
              </span>
              <span className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>
                {issue.summary}
              </span>
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => { setJiraSearch(''); setMode('idle'); }}
        className="text-[11px] px-1 mt-1"
        style={{ color: 'var(--text-muted)' }}
      >
        Cancel
      </button>
    </div>
  );
}
