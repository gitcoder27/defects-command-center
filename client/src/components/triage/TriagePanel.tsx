import { useEffect, useState, useRef, useCallback, useMemo, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Plus, Tag, FileText, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useIssueDetail } from '@/hooks/useIssueDetail';
import { useUpdateIssue } from '@/hooks/useUpdateIssue';
import { useDevelopers } from '@/hooks/useDevelopers';
import { useConfig } from '@/hooks/useConfig';
import { useIssueTagActions } from '@/hooks/useIssueTagActions';
import { useToast } from '@/context/ToastContext';
import { IssueDetails } from './IssueDetails';
import { SuggestionBar } from './SuggestionBar';
import { CommentForm } from './CommentForm';
import { PRIORITY_OPTIONS } from '@/lib/constants';
import { formatIssueDescription } from '@/lib/issue-description';
import { formatDate, priorityColor } from '@/lib/utils';
import type { Developer } from '@/types';

interface TriagePanelProps {
  issueKey?: string;
  onClose: () => void;
}

function PropertyCard({
  label,
  children,
  accent,
}: {
  label: string;
  children: ReactNode;
  accent?: string;
}) {
  return (
    <div
      className="rounded-xl px-3 py-3"
      style={{
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border)',
        borderTop: accent ? `2px solid ${accent}` : undefined,
      }}
    >
      <span
        className="text-[11px] font-semibold uppercase block"
        style={{ color: 'var(--text-muted)', letterSpacing: '0.06em' }}
      >
        {label}
      </span>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export function TriagePanel({ issueKey, onClose }: TriagePanelProps) {
  const { data: issue, isLoading } = useIssueDetail(issueKey);
  const { data: developers } = useDevelopers();
  const { data: config } = useConfig();
  const { allTags, assignedTagIds, isPending: isTagMutationPending, toggleTag, createOrAssignTag } = useIssueTagActions({
    issueKey: issue?.jiraKey,
    localTags: issue?.localTags ?? [],
  });
  const updateIssue = useUpdateIssue();
  const { addToast } = useToast();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [notesValue, setNotesValue] = useState('');
  const [notesSaved, setNotesSaved] = useState(true);
  const notesTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const renderedDescription = useMemo(() => formatIssueDescription(issue?.description), [issue?.description]);

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
          className="w-full sm:w-[720px] sm:min-w-[720px] lg:w-[800px] lg:min-w-[800px] max-w-full h-full overflow-y-auto border-l flex flex-col"
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

              {/* Triage properties */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                    Triage Properties
                  </span>
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Shortcuts: <span className="font-mono">P</span> priority, <span className="font-mono">A</span> assignee, <span className="font-mono">D</span> due date
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <PropertyCard label="ASPEN Severity" accent="rgba(99,102,241,0.3)">
                    {!config?.jiraAspenSeverityField ? (
                      <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                        Configure the Jira field in Settings
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold"
                        style={{
                          background: issue.aspenSeverity ? 'rgba(99,102,241,0.16)' : 'var(--bg-secondary)',
                          color: issue.aspenSeverity ? 'var(--accent)' : 'var(--text-muted)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        {issue.aspenSeverity ?? 'Not set'}
                      </span>
                    )}
                  </PropertyCard>

                  <PropertyCard label="Priority" accent={priorityColor(issue.priorityName)}>
                    {editingField === 'priority' ? (
                      <select
                        autoFocus
                        value={issue.priorityName}
                        onChange={(e) => {
                          handleUpdate(issue.jiraKey, { priorityName: e.target.value });
                          setEditingField(null);
                        }}
                        onBlur={() => setEditingField(null)}
                        className="w-full text-[13px] px-3 py-2 rounded-md"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-active)' }}
                      >
                        {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    ) : (
                      <button
                        onClick={() => setEditingField('priority')}
                        className="w-full text-left rounded-md px-3 py-2 transition-colors"
                        style={{ background: 'var(--bg-secondary)', color: priorityColor(issue.priorityName), border: '1px solid var(--border)' }}
                      >
                        <span className="text-[13px] font-semibold">{issue.priorityName}</span>
                        <span className="text-[11px] ml-2" style={{ color: 'var(--text-muted)' }}>Edit</span>
                      </button>
                    )}
                  </PropertyCard>

                  <PropertyCard label="Assignee">
                    {editingField === 'assignee' ? (
                      <select
                        autoFocus
                        value={issue.assigneeId ?? ''}
                        onChange={(e) => {
                          handleUpdate(issue.jiraKey, { assigneeId: e.target.value || undefined });
                          setEditingField(null);
                        }}
                        onBlur={() => setEditingField(null)}
                        className="w-full text-[13px] px-3 py-2 rounded-md"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-active)' }}
                      >
                        <option value="">Unassigned</option>
                        {developers?.map((d: Developer) => (
                          <option key={d.accountId} value={d.accountId}>{d.displayName}</option>
                        ))}
                      </select>
                    ) : (
                      <button
                        onClick={() => setEditingField('assignee')}
                        className="w-full text-left rounded-md px-3 py-2 transition-colors"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                      >
                        <span className="text-[13px] font-medium">{issue.assigneeName ?? 'Unassigned'}</span>
                        <span className="text-[11px] ml-2" style={{ color: 'var(--text-muted)' }}>Edit</span>
                      </button>
                    )}
                  </PropertyCard>

                  <PropertyCard label="Due Date">
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
                        className="w-full text-[13px] px-3 py-2 rounded-md"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-active)' }}
                      />
                    ) : (
                      <button
                        onClick={() => setEditingField('dueDate')}
                        className="w-full text-left rounded-md px-3 py-2 transition-colors"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                      >
                        <span className="text-[13px] font-medium">{formatDate(issue.developmentDueDate ?? issue.dueDate ?? undefined)}</span>
                        <span className="text-[11px] ml-2" style={{ color: 'var(--text-muted)' }}>Edit</span>
                      </button>
                    )}
                  </PropertyCard>

                  <PropertyCard label="Blocked" accent={issue.flagged ? 'rgba(239,68,68,0.4)' : undefined}>
                    <button
                      onClick={() => handleUpdate(issue.jiraKey, { flagged: !issue.flagged })}
                      className="w-full text-left rounded-md px-3 py-2 transition-colors"
                      style={{
                        background: issue.flagged ? 'rgba(239,68,68,0.12)' : 'var(--bg-secondary)',
                        color: issue.flagged ? 'var(--danger)' : 'var(--text-secondary)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <span className="text-[13px] font-semibold">{issue.flagged ? 'Blocked' : 'Not Blocked'}</span>
                      <span className="text-[11px] ml-2" style={{ color: 'var(--text-muted)' }}>
                        {issue.flagged ? 'Click to clear' : 'Click to mark'}
                      </span>
                    </button>
                  </PropertyCard>

                  <div className="md:col-span-2">
                    <IssueDetails issue={issue} />
                  </div>
                </div>
              </div>

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
                      onClick={() => toggleTag(tag.id)}
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
                    {allTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {allTags.map((tag) => {
                          const isAssigned = assignedTagIds.has(tag.id);
                          return (
                            <button
                              key={tag.id}
                              onClick={() => toggleTag(tag.id)}
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
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            createOrAssignTag(newTagName, { onSuccess: () => setNewTagName('') });
                          }
                        }}
                        placeholder="New tag name..."
                        className="flex-1 text-[12px] px-2 py-1 rounded focus:outline-none focus:ring-1"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', outlineColor: 'var(--accent)' }}
                      />
                      <button
                        onClick={() => createOrAssignTag(newTagName, { onSuccess: () => setNewTagName('') })}
                        disabled={!newTagName.trim() || isTagMutationPending}
                        className="text-[11px] px-2 py-1 rounded font-medium disabled:opacity-40 transition-colors"
                        style={{ background: 'var(--accent)', color: '#fff' }}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Suggestions */}
              <SuggestionBar issue={issue} />

              {/* Description */}
              {renderedDescription && (
                <div>
                  <span className="text-[11px] font-semibold uppercase mb-2 block" style={{ letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                    Description
                  </span>
                  <div className="text-[13px] leading-relaxed prose prose-invert prose-sm max-w-none" style={{ color: 'var(--text-secondary)' }}>
                    <ReactMarkdown>{renderedDescription}</ReactMarkdown>
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
