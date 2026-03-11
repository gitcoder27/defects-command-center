import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useIssueDetail } from '@/hooks/useIssueDetail';
import { useUpdateIssue } from '@/hooks/useUpdateIssue';
import { useDevelopers } from '@/hooks/useDevelopers';
import { useAddTrackerItem } from '@/hooks/useTeamTrackerMutations';
import { useTrackerIssueAssignments } from '@/hooks/useTeamTracker';
import { useConfig } from '@/hooks/useConfig';
import { useIssueTagActions } from '@/hooks/useIssueTagActions';
import { useToast } from '@/context/ToastContext';
import { SuggestionBar } from './SuggestionBar';
import { CommentForm } from './CommentForm';
import { TriageNotesEditor } from './TriageNotesEditor';
import { TriageTagBar } from './TriageTagBar';
import { TriageProperties } from './TriageProperties';
import { TriageTrackerSection } from './TriageTrackerSection';
import { TriageDeskSection } from './TriageDeskSection';
import { formatIssueDescription } from '@/lib/issue-description';
import { getLocalIsoDate } from '@/lib/utils';
import { ManagerDeskCaptureDialog } from '@/components/manager-desk/ManagerDeskCaptureDialog';

interface TriagePanelProps {
  issueKey?: string;
  onClose: () => void;
  onOpenManagerDesk?: () => void;
}

export function TriagePanel({ issueKey, onClose, onOpenManagerDesk }: TriagePanelProps) {
  const { data: issue, isLoading } = useIssueDetail(issueKey);
  const { data: developers } = useDevelopers();
  const trackerDate = getLocalIsoDate();
  const addTrackerItem = useAddTrackerItem(trackerDate);
  const trackerAssignments = useTrackerIssueAssignments(issue?.jiraKey, trackerDate);
  const { data: config } = useConfig();
  const { allTags, assignedTagIds, isPending: isTagMutationPending, toggleTag, createOrAssignTag } = useIssueTagActions({
    issueKey: issue?.jiraKey,
    localTags: issue?.localTags ?? [],
  });
  const updateIssue = useUpdateIssue();
  const { addToast } = useToast();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState('');
  const [notesSaved, setNotesSaved] = useState(true);
  const [deskCaptureOpen, setDeskCaptureOpen] = useState(false);
  const notesTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const renderedDescription = useMemo(() => formatIssueDescription(issue?.description), [issue?.description]);
  const activeTrackerAssignments = trackerAssignments.data ?? [];
  const firstLinkedDeveloperAccountId = activeTrackerAssignments[0]?.developer.accountId;

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
        case 'Escape': onClose(); break;
        case 'a': e.preventDefault(); setEditingField('assignee'); break;
        case 'p': e.preventDefault(); setEditingField('priority'); break;
        case 'd': e.preventDefault(); setEditingField('dueDate'); break;
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
            action: { label: 'Retry', onClick: () => handleUpdate(key, update) },
          });
        },
      }
    );
  };

  const handleAddToTracker = useCallback(
    (accountId: string, title: string) => {
      if (!issue) return;
      const dev = developers?.find((d) => d.accountId === accountId);
      addTrackerItem.mutate(
        { accountId, jiraKey: issue.jiraKey, title },
        {
          onSuccess: () => {
            addToast({
              type: 'success',
              title: `${issue.jiraKey} added to ${dev?.displayName ?? 'plan'}`,
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
    },
    [addToast, addTrackerItem, developers, issue, trackerDate]
  );

  return (
    <AnimatePresence>
      {issueKey && (
        <motion.div
          key="triage-panel"
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="w-full sm:w-[640px] sm:min-w-[640px] lg:w-[720px] lg:min-w-[720px] max-w-full h-full overflow-y-auto border-l flex flex-col"
          style={{
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border)',
            boxShadow: '-6px 0 20px rgba(0,0,0,0.4)',
          }}
        >
          {/* Sticky header */}
          <div
            className="flex items-center justify-between px-4 py-2.5 border-b sticky top-0 z-10"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)', backdropFilter: 'blur(12px)' }}
          >
            <button onClick={onClose} className="p-1 rounded hover:bg-[var(--bg-tertiary)] transition-colors">
              <X size={15} style={{ color: 'var(--text-secondary)' }} />
            </button>
            {issue && (
              <div className="flex items-center gap-2">
                <span className="font-mono text-[13px] font-semibold" style={{ color: 'var(--accent)' }}>
                  {issue.jiraKey}
                </span>
                <a
                  href={config?.jiraBaseUrl ? `${config.jiraBaseUrl}/browse/${issue.jiraKey}` : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
                  title="Open in Jira"
                  style={{ pointerEvents: config?.jiraBaseUrl ? 'auto' : 'none', opacity: config?.jiraBaseUrl ? 1 : 0.4 }}
                >
                  <ExternalLink size={14} style={{ color: 'var(--text-muted)' }} />
                </a>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="p-4 flex flex-col gap-2.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-5 rounded animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />
              ))}
            </div>
          ) : issue ? (
            <div className="flex flex-col gap-0 p-4 flex-1">
              {/* Title */}
              <h2 className="text-[15px] font-semibold leading-snug mb-4" style={{ color: 'var(--text-primary)' }}>
                {issue.summary}
              </h2>

              {/* Notes — the primary workspace tool */}
              <TriageNotesEditor
                value={notesValue}
                onChange={handleNotesChange}
                onBlurSave={() => { if (!notesSaved) saveNotes(notesValue); }}
                isSaved={notesSaved}
              />

              {/* Tags */}
              <TriageTagBar
                tags={issue.localTags}
                allTags={allTags}
                assignedTagIds={assignedTagIds}
                isPending={isTagMutationPending}
                onToggle={toggleTag}
                onCreate={createOrAssignTag}
              />

              {/* Suggestions banner */}
              <div className="mt-1">
                <SuggestionBar issue={issue} />
              </div>

              {/* Team Tracker inline */}
              {developers && (
                <TriageTrackerSection
                  issueKey={issue.jiraKey}
                  issueAssigneeId={issue.assigneeId}
                  developers={developers}
                  assignments={activeTrackerAssignments}
                  trackerDate={trackerDate}
                  firstLinkedAccountId={firstLinkedDeveloperAccountId}
                  onAdd={handleAddToTracker}
                  isAdding={addTrackerItem.isPending}
                />
              )}

              {/* Manager Desk */}
              <TriageDeskSection issue={issue} onCapture={() => setDeskCaptureOpen(true)} />

              {/* Compact properties */}
              <TriageProperties
                issue={issue}
                developers={developers}
                editingField={editingField}
                onEditField={setEditingField}
                onUpdate={handleUpdate}
                jiraAspenSeverityField={config?.jiraAspenSeverityField}
              />

              {/* Description — collapsible */}
              {renderedDescription && (
                <DescriptionSection content={renderedDescription} />
              )}

              {/* Comments */}
              <div className="triage-section">
                <span className="triage-section-label mb-1.5 block">Comment</span>
                <CommentForm issueKey={issue.jiraKey} />
              </div>
            </div>
          ) : null}
        </motion.div>
      )}
      {deskCaptureOpen && issue && (
        <ManagerDeskCaptureDialog
          onClose={() => setDeskCaptureOpen(false)}
          onOpenManagerDesk={onOpenManagerDesk}
          heading="Add Issue Follow-Up"
          description="Capture a manager task from the current Jira issue without leaving triage."
          initialTitle={issue.summary}
          initialCategory="analysis"
          initialContextNote={issue.analysisNotes?.trim() ? issue.analysisNotes : undefined}
          initialLinks={[{ linkType: 'issue', issueKey: issue.jiraKey }]}
          contextChips={[
            { label: 'Issue', value: issue.jiraKey, tone: 'issue' },
            ...(issue.assigneeName ? [{ label: 'Owner', value: issue.assigneeName, tone: 'developer' as const }] : []),
          ]}
        />
      )}
    </AnimatePresence>
  );
}

/* Collapsible description — avoids dominating the panel for long Jira descriptions */
function DescriptionSection({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="triage-section">
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="triage-section-label flex items-center gap-1 mb-1"
      >
        Description
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{expanded ? '▾' : '▸'}</span>
      </button>
      {expanded && (
        <div
          className="text-[12px] leading-relaxed prose prose-invert prose-sm max-w-none"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      )}
      {!expanded && (
        <div
          className="text-[11.5px] leading-relaxed line-clamp-2 cursor-pointer"
          onClick={() => setExpanded(true)}
          style={{ color: 'var(--text-muted)' }}
        >
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
