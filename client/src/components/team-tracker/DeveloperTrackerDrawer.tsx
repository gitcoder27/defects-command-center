import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { MessageSquare, Save } from 'lucide-react';
import type { TrackerDeveloperDay, TrackerDeveloperStatus, Issue } from '@/types';
import type { TrackerWorkItem } from '@/types';
import { TrackerItemRow } from './TrackerItemRow';
import { AddTrackerItemForm } from './AddTrackerItemForm';
import { formatAbsoluteDateTime, formatRelativeTime } from '@/lib/utils';
import { ManagerDeskCaptureDialog } from '@/components/manager-desk/ManagerDeskCaptureDialog';
import { useManagerDesk, useUpdateManagerDeskItem } from '@/hooks/useManagerDesk';
import { DrawerHeader, DrawerSection, HistorySection, StatusSummary } from './DeveloperDrawerSections';
import { ManagerFollowUpRow } from './ManagerFollowUpsSection';
import type { ManagerDeskItem } from '@/types/manager-desk';

interface DeveloperTrackerDrawerProps {
  date: string;
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
  onMarkInactive?: (day: TrackerDeveloperDay) => void;
  onOpenManagerDesk?: () => void;
  issues?: Issue[];
  isAddItemPending?: boolean;
  readOnly?: boolean;
}

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
  date,
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
  onMarkInactive,
  onOpenManagerDesk,
  issues,
  isAddItemPending,
  readOnly = false,
}: DeveloperTrackerDrawerProps) {
  const [checkInText, setCheckInText] = useState('');
  const [notesText, setNotesText] = useState('');
  const [capacityText, setCapacityText] = useState('');
  const [notesEditing, setNotesEditing] = useState(false);
  const [localPlannedItems, setLocalPlannedItems] = useState<TrackerWorkItem[]>([]);
  const [deskCaptureOpen, setDeskCaptureOpen] = useState(false);
  const [completedOpen, setCompletedOpen] = useState(false);
  const [droppedOpen, setDroppedOpen] = useState(false);
  const localPlannedItemsRef = useRef<TrackerWorkItem[]>([]);
  const isDraggingRef = useRef(false);
  const assignedTodayCount = (day?.currentItem ? 1 : 0) + (day?.plannedItems.length ?? 0);
  const loadLabel = day?.capacityUnits ? `${assignedTodayCount}/${day.capacityUnits}` : `${assignedTodayCount}`;
  const isOverCapacity = day?.capacityUnits !== undefined && assignedTodayCount > day.capacityUnits;
  const managerDesk = useManagerDesk(date, open && Boolean(day) && !readOnly);
  const updateManagerDeskItem = useUpdateManagerDeskItem(date);
  const managerFollowUps = day
    ? getDeveloperManagerFollowUps(managerDesk.data?.items ?? [], day.developer.accountId)
    : [];

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
      setCompletedOpen(false);
      setDroppedOpen(false);
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
            className="workspace-shell-backdrop fixed inset-x-0 bottom-0 z-[60]"
            style={{ background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(2px)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="workspace-shell-drawer fixed right-0 z-[61] flex w-full max-w-[480px] flex-col overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
              borderLeft: '1px solid var(--border-strong)',
              boxShadow: '-20px 0 60px rgba(0, 0, 0, 0.3)',
            }}
          >
            <DrawerHeader
              day={day}
              loadLabel={loadLabel}
              isOverCapacity={isOverCapacity}
              readOnly={readOnly}
              onClose={onClose}
              onUpdateDay={onUpdateDay}
              onMarkInactive={onMarkInactive}
            />

            <StatusSummary
              day={day}
              readOnly={readOnly}
              capacityText={capacityText}
              setCapacityText={setCapacityText}
              onUpdateDay={onUpdateDay}
              onSaveCapacity={handleSaveCapacity}
            />

            <div className="flex-1 overflow-y-auto px-4 py-3">
              <DrawerSection title="Current work">
                {day.currentItem ? (
                  <div
                    className="rounded-xl p-1"
                    style={{
                      background: 'color-mix(in srgb, var(--accent-glow) 48%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--accent) 22%, var(--border))',
                    }}
                  >
                    <TrackerItemRow
                      item={day.currentItem}
                      actionPreset="hover-done"
                      onOpen={readOnly ? undefined : onOpenTaskDetail}
                      onUpdateNote={readOnly ? undefined : (itemId, note) => onUpdateItemNote({ itemId, note })}
                      onUpdateTitle={readOnly ? undefined : (itemId, title) => onUpdateItemTitle({ itemId, title })}
                      onSetCurrent={readOnly ? undefined : onSetCurrent}
                      onMarkDone={readOnly ? undefined : onMarkDone}
                      onDrop={readOnly ? undefined : onDropItem}
                    />
                  </div>
                ) : (
                  <div className="rounded-xl px-3 py-2 text-[13px]" style={{ color: 'var(--text-muted)', background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
                    {readOnly ? 'No active item in this historical snapshot.' : 'No active item. Set one from the planned list.'}
                  </div>
                )}
              </DrawerSection>

              <DrawerSection
                title="Planned"
                count={day.plannedItems.length}
              >
                {!readOnly && (
                  <div className="mb-2">
                    <AddTrackerItemForm
                      onAdd={(params) => onAddItem({ accountId: day.developer.accountId, ...params })}
                      date={date}
                      targetAccountId={day.developer.accountId}
                      onOpenExistingAssignment={(itemId) => onOpenTaskDetail(itemId)}
                      issues={issueList}
                      isPending={isAddItemPending}
                    />
                  </div>
                )}
                {localPlannedItems.length > 0 ? (
                  readOnly ? (
                    <div className="space-y-0.5">
                      {localPlannedItems.map((item) => (
                        <TrackerItemRow
                          key={item.id}
                          item={item}
                          variant="drawer-planned"
                          hideActions
                          onOpen={undefined}
                        />
                      ))}
                    </div>
                  ) : (
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
                  )
                ) : (
                  <div className="rounded-xl px-3 py-2 text-[13px]" style={{ color: 'var(--text-muted)', background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
                    Nothing planned.
                  </div>
                )}
              </DrawerSection>

              {!readOnly && (
                <ManagerFollowUpRow
                  day={day}
                  items={managerFollowUps}
                  isLoading={managerDesk.isLoading}
                  onComplete={(itemId) => updateManagerDeskItem.mutate({ itemId, status: 'done' })}
                  onCapture={() => setDeskCaptureOpen(true)}
                />
              )}

              <DrawerSection
                title="Notes"
                action={
                  !readOnly && !notesEditing ? (
                    <button
                      onClick={() => { setNotesText(day.managerNotes ?? ''); setNotesEditing(true); }}
                      className="text-[11px]"
                      style={{ color: 'var(--accent)' }}
                    >
                      Edit
                    </button>
                  ) : undefined
                }
              >
                {notesEditing && !readOnly ? (
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
              </DrawerSection>

              <HistorySection
                title="Completed"
                items={day.completedItems}
                open={completedOpen}
                onToggle={() => setCompletedOpen((current) => !current)}
              />
              <HistorySection
                title="Dropped"
                items={day.droppedItems}
                open={droppedOpen}
                onToggle={() => setDroppedOpen((current) => !current)}
              />

              {/* Check-in history */}
              <DrawerSection title="Check-ins" count={day.checkIns.length}>
                <div className="space-y-1.5 mb-2">
                  {day.checkIns.length === 0 && (
                    <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                      {readOnly ? 'No check-ins recorded for this date.' : 'No check-ins today.'}
                    </div>
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
                {!readOnly && (
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
                )}
              </DrawerSection>
            </div>
          </motion.div>
        </>
      )}
      {!readOnly && deskCaptureOpen && day && (
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

const managerFollowUpStatusRank: Record<ManagerDeskItem['status'], number> = {
  in_progress: 0,
  waiting: 1,
  inbox: 2,
  planned: 3,
  done: 4,
  cancelled: 5,
};

function getDeveloperManagerFollowUps(items: ManagerDeskItem[], developerAccountId: string) {
  return items
    .filter((item) => {
      if (item.status === 'cancelled') {
        return false;
      }

      return item.links.some(
        (link) => link.linkType === 'developer' && link.developerAccountId === developerAccountId
      );
    })
    .sort((left, right) => {
      const statusDelta = managerFollowUpStatusRank[left.status] - managerFollowUpStatusRank[right.status];
      if (statusDelta !== 0) {
        return statusDelta;
      }

      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });
}
