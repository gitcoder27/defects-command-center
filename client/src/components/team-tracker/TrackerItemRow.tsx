import { useEffect, useState } from 'react';
import { Check, CheckCircle2, ChevronDown, ChevronUp, GripVertical, Play, Save, StickyNote, X, XCircle } from 'lucide-react';
import type { TrackerItemState, TrackerWorkItem } from '@/types';
import { JiraIssueLink } from '@/components/JiraIssueLink';
import { formatDate, priorityColor } from '@/lib/utils';
import { TrackerItemRowActions } from './TrackerItemRowActions';
import { TrackerItemRowDetails } from './TrackerItemRowDetails';

interface TrackerItemRowProps {
  item: TrackerWorkItem;
  onOpen?: (id: number, managerDeskItemId?: number) => void;
  onSetCurrent?: (id: number) => void;
  onMarkDone?: (id: number) => void;
  onDrop?: (id: number) => void;
  onMoveUp?: (id: number) => void;
  onMoveDown?: (id: number) => void;
  onUpdateNote?: (id: number, note?: string) => void;
  onUpdateTitle?: (id: number, title: string) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  compact?: boolean;
  draggable?: boolean;
  showDetailsToggle?: boolean;
  hideActions?: boolean;
}

const stateIcons: Record<TrackerItemState, { icon: typeof Play; color: string }> = {
  planned: { icon: GripVertical, color: 'var(--text-muted)' },
  in_progress: { icon: Play, color: 'var(--accent)' },
  done: { icon: CheckCircle2, color: 'var(--success)' },
  dropped: { icon: XCircle, color: 'var(--text-muted)' },
};

export function TrackerItemRow({
  item,
  onOpen,
  onSetCurrent,
  onMarkDone,
  onDrop,
  onMoveUp,
  onMoveDown,
  onUpdateNote,
  onUpdateTitle,
  canMoveUp = false,
  canMoveDown = false,
  compact,
  draggable,
  showDetailsToggle = false,
  hideActions = false,
}: TrackerItemRowProps) {
  const [noteEditing, setNoteEditing] = useState(false);
  const [draftNote, setDraftNote] = useState(item.note ?? '');
  const [titleEditing, setTitleEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(item.title);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => setDraftNote(item.note ?? ''), [item.id, item.note]);
  useEffect(() => setDraftTitle(item.title), [item.id, item.title]);
  useEffect(() => {
    setDetailsOpen(false);
    setNoteEditing(false);
    setTitleEditing(false);
  }, [item.id]);

  const stateInfo = stateIcons[item.state] ?? stateIcons.planned;
  const Icon = stateInfo.icon;
  const isActive = item.state === 'in_progress';
  const isDone = item.state === 'done' || item.state === 'dropped';
  const canOpen = Boolean(onOpen) && !noteEditing && !titleEditing;
  const isTitleEditable = !compact && Boolean(onUpdateTitle) && !isDone && !canOpen;
  const canShowDetails = showDetailsToggle && !compact && !canOpen;
  const detailsRegionId = `tracker-item-details-${item.id}`;
  const jiraLabel = item.jiraSummary && item.jiraSummary !== item.title ? `${item.jiraKey} · ${item.jiraSummary}` : item.jiraKey;
  const jiraMeta = [item.jiraPriorityName, item.jiraDueDate ? `Due ${formatDate(item.jiraDueDate)}` : undefined].filter(Boolean).join(' • ');

  const commitTitle = () => {
    const trimmed = draftTitle.trim();
    if (trimmed && trimmed !== item.title) onUpdateTitle?.(item.id, trimmed);
    setTitleEditing(false);
  };

  const commitNote = () => {
    onUpdateNote?.(item.id, draftNote.trim() || undefined);
    setNoteEditing(false);
  };

  const toggleDetails = () => setDetailsOpen((open) => !open);
  const handleOpen = () => onOpen?.(item.id, item.managerDeskItemId);

  return (
    <div
      className={`group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${canOpen ? 'cursor-pointer' : ''}`}
      style={{
        background: isActive ? 'rgba(6, 182, 212, 0.06)' : 'transparent',
        borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
      }}
      onClick={canOpen ? (event) => {
        event.stopPropagation();
        handleOpen();
      } : undefined}
      onKeyDown={canOpen ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleOpen();
        }
      } : undefined}
      role={canOpen ? 'button' : undefined}
      tabIndex={canOpen ? 0 : undefined}
    >
      {draggable ? (
        <div
          data-drag-handle
          onClick={(event) => event.stopPropagation()}
          className="cursor-grab active:cursor-grabbing touch-none shrink-0 flex items-center justify-center h-5 w-5 rounded"
          style={{ color: 'var(--text-muted)' }}
          title="Drag to reorder"
        >
          <GripVertical size={14} />
        </div>
      ) : (
        <Icon size={compact ? 12 : 14} style={{ color: stateInfo.color, flexShrink: 0 }} />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1.5">
          <div className="flex-1 min-w-0">
            {titleEditing && isTitleEditable ? (
              <div className="flex items-center gap-1 min-w-0">
                <input
                  autoFocus
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') commitTitle();
                    if (event.key === 'Escape') {
                      setDraftTitle(item.title);
                      setTitleEditing(false);
                    }
                  }}
                  className="flex-1 min-w-0 rounded px-1.5 py-0.5 text-[13px] outline-none"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-active)' }}
                  aria-label="Edit title"
                />
                <button onClick={commitTitle} className="h-5 w-5 rounded flex items-center justify-center shrink-0" style={{ color: 'var(--success)' }} title="Save title">
                  <Check size={10} />
                </button>
                <button
                  onClick={() => {
                    setDraftTitle(item.title);
                    setTitleEditing(false);
                  }}
                  className="h-5 w-5 rounded flex items-center justify-center shrink-0"
                  style={{ color: 'var(--text-muted)' }}
                  title="Cancel"
                >
                  <X size={10} />
                </button>
              </div>
            ) : isTitleEditable ? (
              <button
                type="button"
                onClick={() => {
                  setDetailsOpen(false);
                  setTitleEditing(true);
                }}
                className="block w-full min-w-0 text-left"
                aria-label={`Edit title: ${item.title}`}
                title={item.title}
              >
                <span
                  className="block truncate text-[13px] hover:underline"
                  style={{ color: 'var(--text-primary)', textDecoration: isDone ? 'line-through' : 'none' }}
                >
                  {item.title}
                </span>
              </button>
            ) : (
              <span
                className="block truncate text-[13px]"
                style={{ color: isDone ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: isDone ? 'line-through' : 'none' }}
                title={item.title}
              >
                {item.title}
              </span>
            )}
          </div>

          {canShowDetails && !titleEditing && (
            <button
              type="button"
              onClick={toggleDetails}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  toggleDetails();
                }
              }}
              className="mt-[1px] h-5 w-5 shrink-0 rounded flex items-center justify-center"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              aria-expanded={detailsOpen}
              aria-controls={detailsRegionId}
              aria-label={`${detailsOpen ? 'Hide' : 'Show'} task details for ${item.title}`}
              title={detailsOpen ? 'Hide details' : 'Show details'}
            >
              {detailsOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
          )}
        </div>

        {item.jiraKey && (
          <div className="mt-0.5 flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] font-semibold uppercase shrink-0" style={{ color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
              Jira
            </span>
            <JiraIssueLink issueKey={item.jiraKey} className="font-mono text-[11px] truncate" style={{ color: 'var(--accent)' }}>
              {jiraLabel}
            </JiraIssueLink>
          </div>
        )}
        {jiraMeta && (
          <div className="mt-0.5">
            <span className="text-[11px]" style={{ color: item.jiraPriorityName ? priorityColor(item.jiraPriorityName) : 'var(--text-muted)' }}>
              {jiraMeta}
            </span>
          </div>
        )}
        {item.note && !compact && !noteEditing && (
          <div className="mt-1 flex items-start gap-1.5">
            <StickyNote size={12} className="shrink-0 mt-[2px]" style={{ color: 'var(--text-muted)' }} />
            <span className="text-[12px] leading-5" style={{ color: 'var(--text-secondary)' }}>
              {item.note}
            </span>
          </div>
        )}
        {!compact && noteEditing && (
          <div className="mt-1.5 space-y-1.5">
            <textarea
              value={draftNote}
              onChange={(event) => setDraftNote(event.target.value)}
              rows={2}
              className="w-full rounded-lg px-2 py-1.5 text-[13px] outline-none resize-none"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-active)' }}
            />
            <div className="flex items-center gap-1.5">
              <button onClick={commitNote} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12px]" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                <Save size={11} />
                Save
              </button>
              <button
                onClick={() => {
                  setDraftNote(item.note ?? '');
                  setNoteEditing(false);
                }}
                className="text-[12px]"
                style={{ color: 'var(--text-muted)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {canShowDetails && detailsOpen && !titleEditing && !noteEditing && (
          <TrackerItemRowDetails regionId={detailsRegionId} title={item.title} note={item.note} />
        )}
      </div>

      {!isDone && !hideActions && (
        <TrackerItemRowActions
          itemId={item.id}
          itemState={item.state}
          draggable={draggable}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          hasNote={Boolean(item.note)}
          onSetCurrent={onSetCurrent}
          onMarkDone={onMarkDone}
          onDrop={onDrop}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onToggleNoteEditor={!compact && onUpdateNote ? () => setNoteEditing((editing) => !editing) : undefined}
        />
      )}
    </div>
  );
}
