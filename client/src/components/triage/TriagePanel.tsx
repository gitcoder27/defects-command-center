import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Plus, Tag, FileText, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useIssueDetail } from '@/hooks/useIssueDetail';
import { useUpdateIssue } from '@/hooks/useUpdateIssue';
import { useDevelopers } from '@/hooks/useDevelopers';
import { useConfig } from '@/hooks/useConfig';
import { useTags, useCreateTag, useSetIssueTags } from '@/hooks/useTags';
import { useToast } from '@/context/ToastContext';
import { IssueDetails } from './IssueDetails';
import { SuggestionBar } from './SuggestionBar';
import { CommentForm } from './CommentForm';
import { PRIORITY_OPTIONS } from '@/lib/constants';
import type { Developer, LocalTag } from '@/types';

interface TriagePanelProps {
  issueKey?: string;
  onClose: () => void;
}

export function TriagePanel({ issueKey, onClose }: TriagePanelProps) {
  const { data: issue, isLoading } = useIssueDetail(issueKey);
  const { data: developers } = useDevelopers();
  const { data: config } = useConfig();
  const { data: allTags } = useTags();
  const createTag = useCreateTag();
  const setIssueTags = useSetIssueTags();
  const updateIssue = useUpdateIssue();
  const { addToast } = useToast();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [notesValue, setNotesValue] = useState('');
  const [notesSaved, setNotesSaved] = useState(true);
  const notesTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync local notes state with issue data
  useEffect(() => {
    if (issue) {
      setNotesValue(issue.analysisNotes ?? '');
      setNotesSaved(true);
    }
  }, [issue?.jiraKey, issue?.analysisNotes]);

  const saveNotes = useCallback(
    (value: string) => {
      if (!issueKey) return;
      updateIssue.mutate(
        { key: issueKey, update: { analysisNotes: value } },
        {
          onError: (err) => {
            addToast({ type: 'error', title: 'Failed to save notes', message: err.message });
          },
        }
      );
      setNotesSaved(true);
    },
    [issueKey, updateIssue, addToast]
  );

  const handleNotesChange = useCallback(
    (value: string) => {
      setNotesValue(value);
      setNotesSaved(false);
      if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
      notesTimerRef.current = setTimeout(() => saveNotes(value), 1500);
    },
    [saveNotes]
  );

  const handleToggleTag = useCallback(
    (tagId: number) => {
      if (!issue) return;
      const currentIds = issue.localTags.map((t) => t.id);
      const newIds = currentIds.includes(tagId)
        ? currentIds.filter((id) => id !== tagId)
        : [...currentIds, tagId];
      setIssueTags.mutate({ key: issue.jiraKey, tagIds: newIds });
    },
    [issue, setIssueTags]
  );

  const handleCreateTag = useCallback(() => {
    if (!newTagName.trim()) return;
    const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];
    const color = colors[Math.floor(Math.random() * colors.length)]!;
    createTag.mutate(
      { name: newTagName.trim(), color },
      {
        onSuccess: (tag) => {
          setNewTagName('');
          if (issue) {
            const currentIds = issue.localTags.map((t) => t.id);
            setIssueTags.mutate({ key: issue.jiraKey, tagIds: [...currentIds, tag.id] });
          }
        },
      }
    );
  }, [newTagName, createTag, issue, setIssueTags]);

  useEffect(() => {
    if (!issueKey) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'a':
          e.preventDefault();
          setEditingField('assignee');
          break;
        case 'p':
          e.preventDefault();
          setEditingField('priority');
          break;
        case 'd':
          e.preventDefault();
          setEditingField('dueDate');
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, issueKey]);

  const handleUpdate = (key: string, update: Record<string, unknown>) => {
    updateIssue.mutate(
      { key, update },
      {
        onError: (err) => {
          addToast({
            type: 'error',
            title: `Failed to update ${key}`,
            message: err.message,
            action: {
              label: 'Retry',
              onClick: () => handleUpdate(key, update),
            },
          });
        },
      }
    );
  };

  return (
    <AnimatePresence>
      {issueKey && (
        <motion.div
          key="triage-panel"
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="w-[400px] min-w-[400px] max-w-full h-full overflow-y-auto border-l flex flex-col"
          style={{
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border)',
            boxShadow: '-8px 0 24px rgba(0,0,0,0.5)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <button onClick={onClose} className="p-1 rounded hover:bg-[var(--bg-tertiary)] transition-colors">
              <X size={16} style={{ color: 'var(--text-secondary)' }} />
            </button>
            {issue && (
              <a
                href={config?.jiraBaseUrl ? `${config.jiraBaseUrl}/browse/${issue.jiraKey}` : undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
                title="Open in Jira"
                style={{ pointerEvents: config?.jiraBaseUrl ? 'auto' : 'none', opacity: config?.jiraBaseUrl ? 1 : 0.4 }}
              >
                <ExternalLink size={16} style={{ color: 'var(--text-secondary)' }} />
              </a>
            )}
          </div>

          {isLoading ? (
            <div className="p-5 flex flex-col gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-6 rounded animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />
              ))}
            </div>
          ) : issue ? (
            <div className="flex flex-col gap-5 p-5 flex-1">
              {/* Issue key & title */}
              <div>
                <span className="font-mono text-[14px] font-medium" style={{ color: 'var(--accent)' }}>
                  {issue.jiraKey}
                </span>
                <h2 className="text-[16px] font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
                  {issue.summary}
                </h2>
              </div>

              {/* Editable fields */}
              <div className="flex flex-col gap-2">
                {/* Priority */}
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>Priority</span>
                  {editingField === 'priority' ? (
                    <select
                      autoFocus
                      value={issue.priorityName}
                      onChange={(e) => {
                        handleUpdate(issue.jiraKey, { priorityName: e.target.value });
                        setEditingField(null);
                      }}
                      onBlur={() => setEditingField(null)}
                      className="text-[13px] px-2 py-1 rounded"
                      style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-active)' }}
                    >
                      {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  ) : (
                    <button
                      onClick={() => setEditingField('priority')}
                      className="text-[13px] font-medium px-2 py-0.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {issue.priorityName} ▼
                    </button>
                  )}
                </div>

                {/* Assignee */}
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>Assignee</span>
                  {editingField === 'assignee' ? (
                    <select
                      autoFocus
                      value={issue.assigneeId ?? ''}
                      onChange={(e) => {
                        handleUpdate(issue.jiraKey, { assigneeId: e.target.value || undefined });
                        setEditingField(null);
                      }}
                      onBlur={() => setEditingField(null)}
                      className="text-[13px] px-2 py-1 rounded"
                      style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-active)' }}
                    >
                      <option value="">Unassigned</option>
                      {developers?.map((d: Developer) => (
                        <option key={d.accountId} value={d.accountId}>{d.displayName}</option>
                      ))}
                    </select>
                  ) : (
                    <button
                      onClick={() => setEditingField('assignee')}
                      className="text-[13px] font-medium px-2 py-0.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {issue.assigneeName ?? 'Unassigned'} ▼
                    </button>
                  )}
                </div>

                {/* Due Date (Development Due Date) */}
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>Due Date</span>
                  {editingField === 'dueDate' ? (
                    <input
                      type="date"
                      autoFocus
                      value={issue.developmentDueDate ?? issue.dueDate ?? ''}
                      onChange={(e) => {
                        handleUpdate(issue.jiraKey, { developmentDueDate: e.target.value });
                        setEditingField(null);
                      }}
                      onBlur={() => setEditingField(null)}
                      className="text-[13px] px-2 py-1 rounded"
                      style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-active)' }}
                    />
                  ) : (
                    <button
                      onClick={() => setEditingField('dueDate')}
                      className="text-[13px] font-medium px-2 py-0.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors font-mono"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {issue.developmentDueDate ?? issue.dueDate ?? 'Set date'} 📅
                    </button>
                  )}
                </div>

                {/* Blocked toggle */}
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>Blocked</span>
                  <button
                    onClick={() => handleUpdate(issue.jiraKey, { flagged: !issue.flagged })}
                    className="text-[13px] px-2 py-0.5 rounded transition-colors"
                    style={{
                      background: issue.flagged ? 'rgba(239,68,68,0.15)' : 'var(--bg-tertiary)',
                      color: issue.flagged ? 'var(--danger)' : 'var(--text-secondary)',
                    }}
                  >
                    {issue.flagged ? '🚫 Blocked' : 'Not Blocked'}
                  </button>
                </div>
              </div>

              {/* Read-only fields */}
              <IssueDetails issue={issue} />

              {/* Tags */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase flex items-center gap-1.5" style={{ letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                    <Tag size={12} /> Tags
                  </span>
                  <button
                    onClick={() => setShowTagPicker((p) => !p)}
                    className="p-0.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
                    title="Add tag"
                  >
                    <Plus size={14} style={{ color: 'var(--text-muted)' }} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {issue.localTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => handleToggleTag(tag.id)}
                      className="text-[11px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 hover:opacity-80 transition-opacity"
                      style={{ background: `${tag.color}25`, color: tag.color, border: `1px solid ${tag.color}40` }}
                      title={`Remove "${tag.name}"`}
                    >
                      {tag.name} ×
                    </button>
                  ))}
                  {issue.localTags.length === 0 && !showTagPicker && (
                    <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>No tags assigned</span>
                  )}
                </div>
                {showTagPicker && (
                  <div className="rounded-md p-2 flex flex-col gap-2" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
                    {allTags && allTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {allTags.map((tag) => {
                          const isAssigned = issue.localTags.some((t) => t.id === tag.id);
                          return (
                            <button
                              key={tag.id}
                              onClick={() => handleToggleTag(tag.id)}
                              className="text-[11px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 transition-opacity"
                              style={{
                                background: isAssigned ? `${tag.color}40` : `${tag.color}15`,
                                color: tag.color,
                                border: `1px solid ${tag.color}${isAssigned ? '80' : '30'}`,
                                opacity: isAssigned ? 1 : 0.7,
                              }}
                            >
                              {isAssigned && <Check size={10} />}
                              {tag.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleCreateTag(); }}
                        placeholder="New tag name..."
                        className="flex-1 text-[12px] px-2 py-1 rounded focus:outline-none focus:ring-1"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', outlineColor: 'var(--accent)' }}
                      />
                      <button
                        onClick={handleCreateTag}
                        disabled={!newTagName.trim() || createTag.isPending}
                        className="text-[11px] px-2 py-1 rounded font-medium disabled:opacity-40 transition-colors"
                        style={{ background: 'var(--accent)', color: '#fff' }}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Analysis Notes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase flex items-center gap-1.5" style={{ letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                    <FileText size={12} /> Analysis & Notes
                  </span>
                  {!notesSaved && (
                    <span className="text-[10px] italic" style={{ color: 'var(--warning)' }}>Saving...</span>
                  )}
                  {notesSaved && notesValue && (
                    <span className="text-[10px]" style={{ color: 'var(--success)' }}>Saved</span>
                  )}
                </div>
                <textarea
                  value={notesValue}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  onBlur={() => { if (!notesSaved) saveNotes(notesValue); }}
                  placeholder="Write your analysis, observations, root cause, action items..."
                  rows={5}
                  className="w-full px-3 py-2 rounded-md text-[13px] leading-relaxed resize-y focus:outline-none focus:ring-1"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                    outlineColor: 'var(--accent)',
                    minHeight: '80px',
                  }}
                />
              </div>

              {/* Suggestions */}
              <SuggestionBar issue={issue} />

              {/* Description */}
              {issue.description && (
                <div>
                  <span className="text-[11px] font-semibold uppercase mb-2 block" style={{ letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                    Description
                  </span>
                  <div className="text-[13px] leading-relaxed prose prose-invert prose-sm max-w-none" style={{ color: 'var(--text-secondary)' }}>
                    <ReactMarkdown>{issue.description}</ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Comments */}
              <div>
                <span className="text-[11px] font-semibold uppercase mb-2 block" style={{ letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                  Comments
                </span>
                <CommentForm issueKey={issue.jiraKey} />
              </div>
            </div>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
