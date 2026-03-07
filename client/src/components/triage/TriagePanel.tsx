import { useEffect, useState, useRef, useCallback, useMemo, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Plus, Tag, FileText, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useIssueDetail } from '@/hooks/useIssueDetail';
import { useUpdateIssue } from '@/hooks/useUpdateIssue';
import { useDevelopers } from '@/hooks/useDevelopers';
import { useAddTrackerItem } from '@/hooks/useTeamTrackerMutations';
import { useTrackerIssueAssignment } from '@/hooks/useTeamTracker';
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

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
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
  const trackerDate = todayIso();
  const addTrackerItem = useAddTrackerItem(trackerDate);
  const trackerAssignment = useTrackerIssueAssignment(issue?.jiraKey, trackerDate);
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
  const [trackerAccountId, setTrackerAccountId] = useState<string | undefined>();
  const [trackerAddedAccountId, setTrackerAddedAccountId] = useState<string | undefined>();
  const notesTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const renderedDescription = useMemo(() => formatIssueDescription(issue?.description), [issue?.description]);
  const selectedTrackerDeveloper = useMemo(
    () => developers?.find((dev) => dev.accountId === trackerAccountId),
    [developers, trackerAccountId]
  );
  const activeTrackerAssignment = trackerAssignment.data;
  const isAlreadyTrackedToday = Boolean(activeTrackerAssignment);

  // Sync local notes state with issue data
  useEffect(() => {
    if (issue) {
      setNotesValue(issue.analysisNotes ?? '');
      setNotesSaved(true);
      setTrackerAddedAccountId(undefined);
    }
  }, [issue?.jiraKey, issue?.analysisNotes]);

  useEffect(() => {
    if (!developers?.length) {
      setTrackerAccountId(undefined);
      return;
    }

    setTrackerAccountId((current) => {
      if (current && developers.some((dev) => dev.accountId === current)) {
        return current;
      }

      if (activeTrackerAssignment?.developer.accountId && developers.some((dev) => dev.accountId === activeTrackerAssignment.developer.accountId)) {
        return activeTrackerAssignment.developer.accountId;
      }

      if (issue?.assigneeId && developers.some((dev) => dev.accountId === issue.assigneeId)) {
        return issue.assigneeId;
      }

      return developers[0]?.accountId;
    });
  }, [activeTrackerAssignment?.developer.accountId, developers, issue?.assigneeId, issue?.jiraKey]);

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

  const handleAddToTracker = useCallback(() => {
    if (!issue || !selectedTrackerDeveloper || isAlreadyTrackedToday) {
      return;
    }

    addTrackerItem.mutate(
      {
        accountId: selectedTrackerDeveloper.accountId,
        itemType: 'jira',
        jiraKey: issue.jiraKey,
        title: issue.summary,
      },
      {
        onSuccess: () => {
          setTrackerAddedAccountId(selectedTrackerDeveloper.accountId);
          addToast({
            type: 'success',
            title: `${issue.jiraKey} added to ${firstName(selectedTrackerDeveloper.displayName)}'s plan`,
            message: `Tracker queue updated for ${trackerDate}.`,
          });
        },
        onError: (err) => {
          addToast({
            type: 'error',
            title: `Failed to add ${issue.jiraKey} to Team Tracker`,
            message: err.message,
          });
        },
      }
    );
  }, [addToast, addTrackerItem, isAlreadyTrackedToday, issue, selectedTrackerDeveloper, trackerDate]);

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

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase flex items-center gap-1.5" style={{ letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                    <Plus size={12} /> Team Tracker
                  </span>
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Today
                  </span>
                </div>
                <div
                  className="rounded-xl px-3 py-3"
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {developers && developers.length > 0 ? (
                    <>
                      <div className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                        Add this Jira issue to a developer&apos;s planned queue without leaving triage.
                      </div>
                      {isAlreadyTrackedToday && activeTrackerAssignment && (
                        <div
                          className="mt-3 rounded-lg px-3 py-2"
                          style={{
                            background: activeTrackerAssignment.state === 'in_progress'
                              ? 'color-mix(in srgb, var(--success) 12%, var(--bg-secondary) 88%)'
                              : 'color-mix(in srgb, var(--accent-glow) 56%, var(--bg-secondary) 44%)',
                            border: '1px solid var(--border)',
                          }}
                        >
                          <div className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>
                            {issue.jiraKey} is already {activeTrackerAssignment.state === 'in_progress' ? 'current work' : 'planned'} for {activeTrackerAssignment.developer.displayName}
                          </div>
                          <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            Duplicate planned items are blocked until this tracker entry is moved, completed, or dropped.
                          </div>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {developers.map((dev) => {
                          const isSelected = trackerAccountId === dev.accountId;
                          const isAssigned = issue?.assigneeId === dev.accountId;
                          const wasJustAdded = trackerAddedAccountId === dev.accountId;
                          const isTrackerOwner = activeTrackerAssignment?.developer.accountId === dev.accountId;

                          return (
                            <button
                              key={dev.accountId}
                              type="button"
                              onClick={() => setTrackerAccountId(dev.accountId)}
                              aria-pressed={isSelected}
                              className="rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors"
                              style={{
                                background: isSelected
                                  ? 'color-mix(in srgb, var(--accent-glow) 76%, var(--bg-secondary) 24%)'
                                  : 'var(--bg-secondary)',
                                color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                                border: `1px solid ${isSelected ? 'var(--border-active)' : 'var(--border)'}`,
                              }}
                            >
                              <span className="flex items-center gap-1.5">
                                {wasJustAdded && <Check size={12} />}
                                <span>{dev.displayName}</span>
                                {isAssigned && (
                                  <span
                                    className="rounded-full px-1.5 py-0.5 text-[10px]"
                                    style={{
                                      background: isSelected ? 'rgba(255,255,255,0.55)' : 'var(--bg-tertiary)',
                                      color: isSelected ? 'var(--accent)' : 'var(--text-muted)',
                                    }}
                                  >
                                    Assigned
                                  </span>
                                )}
                                {isTrackerOwner && (
                                  <span
                                    className="rounded-full px-1.5 py-0.5 text-[10px]"
                                    style={{
                                      background: isSelected ? 'rgba(255,255,255,0.55)' : 'var(--bg-tertiary)',
                                      color: isSelected ? 'var(--accent)' : 'var(--text-muted)',
                                    }}
                                  >
                                    In Tracker
                                  </span>
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>
                            {isAlreadyTrackedToday && activeTrackerAssignment
                              ? `${activeTrackerAssignment.developer.displayName} already owns this Jira task for ${trackerDate}`
                              : selectedTrackerDeveloper
                                ? `Add to ${selectedTrackerDeveloper.displayName}'s plan for ${trackerDate}`
                                : 'Choose a developer'}
                          </div>
                          <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            {isAlreadyTrackedToday
                              ? 'Use Team Tracker to update the existing assignment instead of creating a duplicate.'
                              : 'Creates a Jira-linked planned item in Team Tracker.'}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddToTracker}
                          disabled={!selectedTrackerDeveloper || addTrackerItem.isPending || isAlreadyTrackedToday}
                          className="shrink-0 rounded-lg px-3 py-2 text-[12px] font-medium disabled:opacity-40"
                          style={{
                            background: 'var(--accent-glow)',
                            color: 'var(--accent)',
                            border: '1px solid color-mix(in srgb, var(--accent) 28%, transparent)',
                          }}
                        >
                          {addTrackerItem.isPending
                            ? 'Adding...'
                            : isAlreadyTrackedToday && activeTrackerAssignment
                              ? `Already in ${firstName(activeTrackerAssignment.developer.displayName)}'s plan`
                              : selectedTrackerDeveloper
                              ? `Add to ${firstName(selectedTrackerDeveloper.displayName)}`
                              : 'Add to Team Tracker'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                      Add active team members in Settings to send Jira issues into Team Tracker.
                    </div>
                  )}
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
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors"
                    title={showTagPicker ? 'Hide tag editor' : 'Add tag'}
                    aria-label={showTagPicker ? 'Hide tag editor' : 'Add tag'}
                    style={{
                      color: 'var(--text-secondary)',
                      background: showTagPicker ? 'var(--bg-secondary)' : 'transparent',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <Plus size={14} style={{ color: 'var(--text-muted)' }} />
                    {showTagPicker ? 'Close' : 'Add Tag'}
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
                    <div className="flex items-center gap-2">
                      <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>No tags assigned</span>
                      <button
                        type="button"
                        onClick={() => setShowTagPicker(true)}
                        className="text-[11px] font-medium"
                        style={{ color: 'var(--accent)' }}
                      >
                        Add one
                      </button>
                    </div>
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
