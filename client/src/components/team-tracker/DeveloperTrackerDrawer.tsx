import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { X, MessageSquare, Save, Briefcase } from 'lucide-react';
import type { TrackerDeveloperDay, TrackerDeveloperStatus, Issue } from '@/types';
import type { TrackerWorkItem } from '@/types';
import { TrackerStatusPill } from './TrackerStatusPill';
import { TrackerItemRow } from './TrackerItemRow';
import { AddTrackerItemForm } from './AddTrackerItemForm';
import { TrackerSignalBadges } from './TrackerSignalBadges';
import { formatAbsoluteDateTime, formatRelativeTime } from '@/lib/utils';
import { ManagerDeskCaptureDialog } from '@/components/manager-desk/ManagerDeskCaptureDialog';
import { JiraIssueLink } from '@/components/JiraIssueLink';

interface DeveloperTrackerDrawerProps {
  day: TrackerDeveloperDay | undefined;
  open: boolean;
  onClose: () => void;
  onUpdateDay: (params: { accountId: string; status?: TrackerDeveloperStatus; capacityUnits?: number | null; managerNotes?: string }) => void;
  onAddItem: (params: { accountId: string; jiraKey?: string; title: string; note?: string }) => void;
  onOpenTaskDetail: (itemId: number, managerDeskItemId?: number) => void;
  onReorderPlannedItem: (params: { itemId: number; position: number }) => void;
  onUpdateItemNote: (params: { itemId: number; note?: string }) => void;
  onUpdateItemTitle: (params: { itemId: number; title: string }) => void;
  onSetCurrent: (itemId: number) => void;
  onMarkDone: (itemId: number) => void;
  onDropItem: (itemId: number) => void;
  onAddCheckIn: (params: { accountId: string; summary: string; status?: TrackerDeveloperStatus }) => void;
  onOpenManagerDesk?: () => void;
  issues?: Issue[];
  isAddItemPending?: boolean;
}

const statusOptions: TrackerDeveloperStatus[] = ['on_track', 'at_risk', 'blocked', 'waiting', 'done_for_today'];

function getCheckInAuthorBadge(authorType?: TrackerDeveloperDay['checkIns'][number]['authorType']) {
  if (authorType === 'developer') {
    return {
      label: 'Developer',
      color: 'var(--accent)',
      background: 'rgba(6, 182, 212, 0.1)',
      border: 'rgba(6, 182, 212, 0.2)',
    };
  }

  if (authorType === 'manager') {
    return {
      label: 'Manager',
      color: 'var(--warning)',
      background: 'rgba(245, 158, 11, 0.1)',
      border: 'rgba(245, 158, 11, 0.2)',
    };
  }

  return {
    label: 'Update',
    color: 'var(--text-secondary)',
    background: 'var(--bg-secondary)',
    border: 'var(--border)',
  };
}

export function DeveloperTrackerDrawer({
  day,
  open,
  onClose,
  onUpdateDay,
  onAddItem,
  onOpenTaskDetail,
  onReorderPlannedItem,
  onUpdateItemNote,
  onUpdateItemTitle,
  onSetCurrent,
  onMarkDone,
  onDropItem,
  onAddCheckIn,
  onOpenManagerDesk,
  issues,
  isAddItemPending,
}: DeveloperTrackerDrawerProps) {
  const [checkInText, setCheckInText] = useState('');
  const [notesText, setNotesText] = useState('');
  const [capacityText, setCapacityText] = useState('');
  const [notesEditing, setNotesEditing] = useState(false);
  const [localPlannedItems, setLocalPlannedItems] = useState<TrackerWorkItem[]>([]);
  const [deskCaptureOpen, setDeskCaptureOpen] = useState(false);
  const localPlannedItemsRef = useRef<TrackerWorkItem[]>([]);
  const isDraggingRef = useRef(false);
  const assignedTodayCount = (day?.currentItem ? 1 : 0) + (day?.plannedItems.length ?? 0);
  const loadLabel = day?.capacityUnits ? `${assignedTodayCount}/${day.capacityUnits}` : `${assignedTodayCount}`;
  const isOverCapacity = day?.capacityUnits !== undefined && assignedTodayCount > day.capacityUnits;

  // Sync local planned items from server data when not actively dragging
  useEffect(() => {
    if (day && !isDraggingRef.current) {
      setLocalPlannedItems(day.plannedItems);
      localPlannedItemsRef.current = day.plannedItems;
    }
  }, [day?.plannedItems]);

  useEffect(() => {
    if (day) {
      setCapacityText(day.capacityUnits ? String(day.capacityUnits) : '');
    }
  }, [day?.id, day?.capacityUnits]);

  const handleDragReorder = useCallback(
    (newOrder: TrackerWorkItem[]) => {
      localPlannedItemsRef.current = newOrder;
      setLocalPlannedItems(newOrder);
    },
    []
  );

  const handleDragEnd = useCallback(() => {
    isDraggingRef.current = false;
    if (!day) return;

    // Find the item that moved and compute its new target position
    const oldIds = day.plannedItems.map((i) => i.id);
    const newIds = localPlannedItemsRef.current.map((i) => i.id);

    // Find the moved item: compare old vs new by index
    for (let i = 0; i < newIds.length; i++) {
      if (oldIds[i] !== newIds[i]) {
        const movedItemId = newIds[i];
        if (movedItemId === undefined) break;
        const targetPosition = day.plannedItems[i]?.position ?? i;
        onReorderPlannedItem({ itemId: movedItemId, position: targetPosition });
        break;
      }
    }
  }, [day, onReorderPlannedItem]);

  const handleSaveNotes = () => {
    if (!day) return;
    onUpdateDay({ accountId: day.developer.accountId, managerNotes: notesText });
    setNotesEditing(false);
  };

  const handleCheckIn = () => {
    if (!day || !checkInText.trim()) return;
    onAddCheckIn({ accountId: day.developer.accountId, summary: checkInText.trim() });
    setCheckInText('');
  };

  const handleSaveCapacity = () => {
    if (!day) return;

    const trimmed = capacityText.trim();
    if (!trimmed) {
      onUpdateDay({ accountId: day.developer.accountId, capacityUnits: null });
      return;
    }

    const nextValue = Number.parseInt(trimmed, 10);
    if (Number.isNaN(nextValue) || nextValue < 1) {
      return;
    }

    onUpdateDay({ accountId: day.developer.accountId, capacityUnits: nextValue });
  };

  const issueList = issues?.map((i) => ({
    jiraKey: i.jiraKey,
    summary: i.summary,
    priorityName: i.priorityName,
    dueDate: i.dueDate,
    developmentDueDate: i.developmentDueDate,
  })) ?? [];

  return (
    <AnimatePresence>
      {open && day && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60]"
            style={{ background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(2px)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="fixed right-0 top-0 bottom-0 z-[61] w-full max-w-[480px] overflow-hidden flex flex-col"
            style={{
              background: 'linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
              borderLeft: '1px solid var(--border-strong)',
              boxShadow: '-20px 0 60px rgba(0, 0, 0, 0.3)',
            }}
          >
            {/* Drawer header */}
            <div
              className="shrink-0 px-4 py-3 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center text-[13px] font-bold"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent-glow), var(--bg-tertiary))',
                    color: 'var(--accent)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {day.developer.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {day.developer.displayName}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <TrackerStatusPill status={day.status} size="md" />
                    {day.lastCheckInAt && (
                      <span
                        className="text-[11px]"
                        style={{ color: day.signals.freshness.staleByTime ? 'var(--warning)' : 'var(--text-muted)' }}
                        title={formatAbsoluteDateTime(day.lastCheckInAt)}
                      >
                        Last check-in {formatRelativeTime(day.lastCheckInAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="h-8 w-8 rounded-xl flex items-center justify-center transition-colors"
                style={{ background: 'var(--bg-tertiary)' }}
              >
                <X size={16} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>

            {/* Compact summary strip (pinned above scroll) */}
            <div className="shrink-0 px-4 py-2 space-y-2" style={{ borderBottom: '1px solid var(--border)' }}>
              {/* Status pills — tight inline row */}
              <div className="flex flex-wrap gap-1">
                {statusOptions.map((s) => (
                  <button
                    key={s}
                    onClick={() => onUpdateDay({ accountId: day.developer.accountId, status: s })}
                    className={`transition-all ${day.status === s ? '' : 'opacity-40 hover:opacity-75'}`}
                  >
                    <TrackerStatusPill status={s} size="sm" />
                  </button>
                ))}
              </div>

              {/* Stats + Capacity — single row */}
              <div className="flex items-center gap-3 text-[12px]">
                <div className="flex items-center gap-2.5">
                  <span style={{ color: 'var(--text-muted)' }}>
                    Load{' '}
                    <span className="font-mono font-semibold" style={{ color: isOverCapacity ? 'var(--danger)' : 'var(--text-primary)' }}>
                      {loadLabel}
                    </span>
                  </span>
                  <span style={{ color: 'var(--border-strong)' }}>·</span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    Done{' '}
                    <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {day.completedItems.length}
                    </span>
                  </span>
                  <span style={{ color: 'var(--border-strong)' }}>·</span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    Dropped{' '}
                    <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {day.droppedItems.length}
                    </span>
                  </span>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Cap</span>
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={capacityText}
                    onChange={(e) => setCapacityText(e.target.value)}
                    placeholder="–"
                    className="w-10 rounded-md px-1.5 py-0.5 text-[12px] text-center outline-none font-mono"
                    style={{
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border)',
                    }}
                  />
                  <button
                    onClick={handleSaveCapacity}
                    className="rounded-md px-1.5 py-0.5 text-[11px] font-medium"
                    style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}
                  >
                    Save
                  </button>
                  {day.capacityUnits !== undefined && (
                    <button
                      onClick={() => {
                        setCapacityText('');
                        onUpdateDay({ accountId: day.developer.accountId, capacityUnits: null });
                      }}
                      className="text-[11px]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Signal badges — only shown when there are active signals */}
              <TrackerSignalBadges day={day} />
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              {/* Current item */}
              <div>
                <div className="text-[11px] font-semibold uppercase mb-1.5" style={{ color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                  Current Work
                </div>
                {day.currentItem ? (
                  <TrackerItemRow
                    item={day.currentItem}
                    actionPreset="hover-done"
                    onOpen={onOpenTaskDetail}
                    onUpdateNote={(itemId, note) => onUpdateItemNote({ itemId, note })}
                    onUpdateTitle={(itemId, title) => onUpdateItemTitle({ itemId, title })}
                    onSetCurrent={onSetCurrent}
                    onMarkDone={onMarkDone}
                    onDrop={onDropItem}
                  />
                ) : (
                  <div className="text-[13px] py-2" style={{ color: 'var(--text-muted)' }}>
                    No active item. Set one from the planned list.
                  </div>
                )}
              </div>

              {/* Planned items */}
              <div>
                <div className="text-[11px] font-semibold uppercase mb-1.5" style={{ color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                  Planned ({day.plannedItems.length})
                </div>
                {localPlannedItems.length > 0 ? (
                  <Reorder.Group
                    axis="y"
                    values={localPlannedItems}
                    onReorder={handleDragReorder}
                    className="space-y-0.5"
                    as="div"
                  >
                    {localPlannedItems.map((item) => (
                      <Reorder.Item
                        key={item.id}
                        value={item}
                        onDragStart={() => { isDraggingRef.current = true; }}
                        onDragEnd={handleDragEnd}
                        as="div"
                        whileDrag={{
                          scale: 1.02,
                          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                          borderRadius: '8px',
                          background: 'var(--bg-secondary)',
                          zIndex: 50,
                        }}
                        style={{ position: 'relative', cursor: 'grab' }}
                      >
                        <TrackerItemRow
                          item={item}
                          draggable
                          variant="drawer-planned"
                          actionPreset="hover-start"
                          onOpen={onOpenTaskDetail}
                          onUpdateNote={(itemId, note) => onUpdateItemNote({ itemId, note })}
                          onUpdateTitle={(itemId, title) => onUpdateItemTitle({ itemId, title })}
                          onSetCurrent={onSetCurrent}
                          onMarkDone={onMarkDone}
                          onDrop={onDropItem}
                        />
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                ) : (
                  <div className="space-y-0.5" />
                )}
                <AddTrackerItemForm
                  onAdd={(params) => onAddItem({ accountId: day.developer.accountId, ...params })}
                  issues={issueList}
                  isPending={isAddItemPending}
                />
              </div>

              {/* Completed items */}
              {day.completedItems.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold uppercase mb-1.5" style={{ color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                    Completed ({day.completedItems.length})
                  </div>
                  <div className="space-y-0.5">
                    {day.completedItems.map((item) => (
                      <TrackerItemRow key={item.id} item={item} compact hideActions onOpen={onOpenTaskDetail} />
                    ))}
                  </div>
                </div>
              )}

              {/* Dropped items */}
              {day.droppedItems.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold uppercase mb-1.5" style={{ color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                    Dropped ({day.droppedItems.length})
                  </div>
                  <div className="space-y-0.5">
                    {day.droppedItems.map((item) => (
                      <TrackerItemRow key={item.id} item={item} compact hideActions onOpen={onOpenTaskDetail} />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                    Manager Desk
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeskCaptureOpen(true)}
                    className="text-[11px] font-medium"
                    style={{ color: 'var(--md-accent)' }}>
                    Capture Follow-Up
                  </button>
                </div>
                <div
                  className="rounded-xl px-3 py-3"
                  style={{
                    background: 'linear-gradient(135deg, color-mix(in srgb, var(--md-accent-glow) 72%, var(--bg-tertiary) 28%), var(--bg-tertiary))',
                    border: '1px solid rgba(217,169,78,0.16)',
                  }}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: 'rgba(217,169,78,0.14)', color: 'var(--md-accent)' }}
                    >
                      <Briefcase size={14} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                        Keep your own follow-ups separate from the team queue
                      </div>
                      <div className="mt-1 text-[12px] leading-5" style={{ color: 'var(--text-secondary)' }}>
                        This capture links {day.developer.displayName} automatically and drops the task into today&apos;s Manager Desk inbox.
                      </div>
                      {day.currentItem?.jiraKey && (
                        <div className="mt-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                          Current tracker context:{' '}
                          <JiraIssueLink issueKey={day.currentItem.jiraKey} style={{ color: 'var(--text-primary)' }}>
                            {day.currentItem.jiraKey}
                          </JiraIssueLink>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Manager notes */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                    Manager Notes
                  </div>
                  {!notesEditing && (
                    <button
                      onClick={() => { setNotesText(day.managerNotes ?? ''); setNotesEditing(true); }}
                      className="text-[11px]"
                      style={{ color: 'var(--accent)' }}
                    >
                      Edit
                    </button>
                  )}
                </div>
                {notesEditing ? (
                  <div className="space-y-1">
                    <textarea
                      value={notesText}
                      onChange={(e) => setNotesText(e.target.value)}
                      rows={3}
                      className="w-full rounded-lg px-2 py-1.5 text-[13px] outline-none resize-none"
                      style={{
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-active)',
                      }}
                    />
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleSaveNotes}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12px]"
                        style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}
                      >
                        <Save size={11} /> Save
                      </button>
                      <button
                        onClick={() => setNotesEditing(false)}
                        className="text-[12px] px-1"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-[13px] leading-5" style={{ color: day.managerNotes ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                    {day.managerNotes || 'No notes yet.'}
                  </div>
                )}
              </div>

              {/* Check-in history */}
              <div>
                <div className="text-[11px] font-semibold uppercase mb-1.5" style={{ color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                  Check-ins ({day.checkIns.length})
                </div>
                <div className="space-y-1.5 mb-2">
                  {day.checkIns.length === 0 && (
                    <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>No check-ins today.</div>
                  )}
                  {[...day.checkIns].reverse().map((ci) => (
                    <div key={ci.id} className="rounded-lg px-2.5 py-2" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
                      {(() => {
                        const badge = getCheckInAuthorBadge(ci.authorType);
                        const absoluteCreatedAt = formatAbsoluteDateTime(ci.createdAt);

                        return (
                          <>
                            <div className="text-[13px] leading-5" style={{ color: 'var(--text-primary)' }}>{ci.summary}</div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                              <span
                                className="rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.05em]"
                                style={{
                                  color: badge.color,
                                  background: badge.background,
                                  borderColor: badge.border,
                                }}
                              >
                                {badge.label}
                              </span>
                              <span title={absoluteCreatedAt}>{formatRelativeTime(ci.createdAt)}</span>
                              <span>{absoluteCreatedAt}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ))}
                </div>

                {/* New check-in input */}
                <div className="flex items-center gap-1.5">
                  <MessageSquare size={12} style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    value={checkInText}
                    onChange={(e) => setCheckInText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCheckIn();
                    }}
                    placeholder="Add a check-in note..."
                    className="flex-1 rounded-lg px-2 py-1.5 text-[13px] outline-none"
                    style={{
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border)',
                    }}
                  />
                  <button
                    onClick={handleCheckIn}
                    disabled={!checkInText.trim()}
                    className="shrink-0 h-7 rounded-lg px-2 text-[12px] font-medium disabled:opacity-40 transition-colors"
                    style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
      {deskCaptureOpen && day && (
        <ManagerDeskCaptureDialog
          onClose={() => setDeskCaptureOpen(false)}
          onOpenManagerDesk={onOpenManagerDesk}
          heading="Capture Developer Follow-Up"
          description="Create a manager task from this tracker view while keeping the developer linked."
          initialTitle={`Follow up with ${day.developer.displayName}`}
          initialCategory="team_management"
          initialContextNote={
            day.currentItem?.jiraKey
              ? `Current tracker context: ${day.currentItem.jiraKey} - ${day.currentItem.title}`
              : ''
          }
          initialLinks={[{ linkType: 'developer', developerAccountId: day.developer.accountId }]}
          contextChips={[
            { label: 'Developer', value: day.developer.displayName, tone: 'developer' },
            ...(day.currentItem?.jiraKey
              ? [{ label: 'Current', value: day.currentItem.jiraKey, tone: 'issue' as const }]
              : []),
          ]}
        />
      )}
    </AnimatePresence>
  );
}
