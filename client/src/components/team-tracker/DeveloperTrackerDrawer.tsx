import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { X, MessageSquare, Save, Briefcase } from 'lucide-react';
import type { TrackerDeveloperDay, TrackerDeveloperStatus, Issue } from '@/types';
import type { TrackerWorkItem } from '@/types';
import { TrackerStatusPill } from './TrackerStatusPill';
import { TrackerItemRow } from './TrackerItemRow';
import { AddTrackerItemForm } from './AddTrackerItemForm';
import { formatRelativeTime } from '@/lib/utils';
import { ManagerDeskCaptureDialog } from '@/components/manager-desk/ManagerDeskCaptureDialog';

interface DeveloperTrackerDrawerProps {
  day: TrackerDeveloperDay | undefined;
  open: boolean;
  onClose: () => void;
  onUpdateDay: (params: { accountId: string; status?: TrackerDeveloperStatus; capacityUnits?: number | null; managerNotes?: string }) => void;
  onAddItem: (params: { accountId: string; jiraKey?: string; title: string; note?: string }) => void;
  onReorderPlannedItem: (params: { itemId: number; position: number }) => void;
  onUpdateItemNote: (params: { itemId: number; note?: string }) => void;
  onUpdateItemTitle: (params: { itemId: number; title: string }) => void;
  onSetCurrent: (itemId: number) => void;
  onMarkDone: (itemId: number) => void;
  onDropItem: (itemId: number) => void;
  onDeleteItem: (itemId: number) => void;
  onAddCheckIn: (params: { accountId: string; summary: string; status?: TrackerDeveloperStatus }) => void;
  onOpenManagerDesk?: () => void;
  issues?: Issue[];
  isAddItemPending?: boolean;
}

const statusOptions: TrackerDeveloperStatus[] = ['on_track', 'at_risk', 'blocked', 'waiting', 'done_for_today'];

export function DeveloperTrackerDrawer({
  day,
  open,
  onClose,
  onUpdateDay,
  onAddItem,
  onReorderPlannedItem,
  onUpdateItemNote,
  onUpdateItemTitle,
  onSetCurrent,
  onMarkDone,
  onDropItem,
  onDeleteItem,
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
  const isDraggingRef = useRef(false);
  const assignedTodayCount = (day?.currentItem ? 1 : 0) + (day?.plannedItems.length ?? 0);
  const loadLabel = day?.capacityUnits ? `${assignedTodayCount}/${day.capacityUnits}` : `${assignedTodayCount}`;
  const isOverCapacity = day?.capacityUnits !== undefined && assignedTodayCount > day.capacityUnits;

  // Sync local planned items from server data when not actively dragging
  useEffect(() => {
    if (day && !isDraggingRef.current) {
      setLocalPlannedItems(day.plannedItems);
    }
  }, [day?.plannedItems]);

  useEffect(() => {
    if (day) {
      setCapacityText(day.capacityUnits ? String(day.capacityUnits) : '');
    }
  }, [day?.id, day?.capacityUnits]);

  const handleDragReorder = useCallback(
    (newOrder: TrackerWorkItem[]) => {
      setLocalPlannedItems(newOrder);
    },
    []
  );

  const handleDragEnd = useCallback(() => {
    isDraggingRef.current = false;
    if (!day) return;

    // Find the item that moved and compute its new target position
    const oldIds = day.plannedItems.map((i) => i.id);
    const newIds = localPlannedItems.map((i) => i.id);

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
  }, [day, localPlannedItems, onReorderPlannedItem]);

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
                      <span className="text-[10px]" style={{ color: day.isStale ? 'var(--warning)' : 'var(--text-muted)' }}>
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

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              {/* Status selector */}
              <div>
                <div className="text-[10px] font-semibold uppercase mb-1.5" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                  Status
                </div>
                <div className="flex flex-wrap gap-1">
                  {statusOptions.map((s) => (
                    <button
                      key={s}
                      onClick={() => onUpdateDay({ accountId: day.developer.accountId, status: s })}
                      className={`transition-all ${day.status === s ? '' : 'opacity-50 hover:opacity-80'}`}
                    >
                      <TrackerStatusPill status={s} size="md" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-semibold uppercase mb-1.5" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                  Today
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl px-2.5 py-2" style={{ background: 'var(--bg-tertiary)' }}>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Load</div>
                    <div className="mt-0.5 font-mono text-[13px] font-semibold" style={{ color: isOverCapacity ? 'var(--danger)' : 'var(--text-primary)' }}>
                      {loadLabel}
                    </div>
                  </div>
                  <div className="rounded-xl px-2.5 py-2" style={{ background: 'var(--bg-tertiary)' }}>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Done</div>
                    <div className="mt-0.5 font-mono text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {day.completedItems.length}
                    </div>
                  </div>
                  <div className="rounded-xl px-2.5 py-2" style={{ background: 'var(--bg-tertiary)' }}>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Dropped</div>
                    <div className="mt-0.5 font-mono text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {day.droppedItems.length}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                    Capacity
                  </div>
                  {day.capacityUnits !== undefined && (
                    <span className="font-mono text-[10px]" style={{ color: isOverCapacity ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {loadLabel}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={capacityText}
                    onChange={(e) => setCapacityText(e.target.value)}
                    placeholder="Add"
                    className="w-20 rounded-lg px-2 py-1.5 text-[12px] outline-none"
                    style={{
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border)',
                    }}
                  />
                  <button
                    onClick={handleSaveCapacity}
                    className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium"
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

              {/* Current item */}
              <div>
                <div className="text-[10px] font-semibold uppercase mb-1" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                  Current Work
                </div>
                {day.currentItem ? (
                  <TrackerItemRow
                    item={day.currentItem}
                    onUpdateNote={(itemId, note) => onUpdateItemNote({ itemId, note })}
                    onUpdateTitle={(itemId, title) => onUpdateItemTitle({ itemId, title })}
                    onSetCurrent={onSetCurrent}
                    onMarkDone={onMarkDone}
                    onDrop={onDropItem}
                  />
                ) : (
                  <div className="text-[12px] py-2" style={{ color: 'var(--text-muted)' }}>
                    No active item. Set one from the planned list.
                  </div>
                )}
              </div>

              {/* Planned items */}
              <div>
                <div className="text-[10px] font-semibold uppercase mb-1" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
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
                  <div className="text-[10px] font-semibold uppercase mb-1" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                    Completed ({day.completedItems.length})
                  </div>
                  <div className="space-y-0.5">
                    {day.completedItems.map((item) => (
                      <TrackerItemRow key={item.id} item={item} compact />
                    ))}
                  </div>
                </div>
              )}

              {/* Dropped items */}
              {day.droppedItems.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold uppercase mb-1" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                    Dropped ({day.droppedItems.length})
                  </div>
                  <div className="space-y-0.5">
                    {day.droppedItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <TrackerItemRow item={item} compact />
                        <button
                          onClick={() => onDeleteItem(item.id)}
                          className="text-[10px] shrink-0 px-1"
                          style={{ color: 'var(--danger)' }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                    Manager Desk
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeskCaptureOpen(true)}
                    className="text-[10px] font-medium"
                    style={{ color: 'var(--md-accent)' }}
                  >
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
                      <div className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>
                        Keep your own follow-ups separate from the team queue
                      </div>
                      <div className="mt-1 text-[11px] leading-5" style={{ color: 'var(--text-secondary)' }}>
                        This capture links {day.developer.displayName} automatically and drops the task into today&apos;s Manager Desk inbox.
                      </div>
                      {day.currentItem?.jiraKey && (
                        <div className="mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          Current tracker context: <span style={{ color: 'var(--text-primary)' }}>{day.currentItem.jiraKey}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Manager notes */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                    Manager Notes
                  </div>
                  {!notesEditing && (
                    <button
                      onClick={() => { setNotesText(day.managerNotes ?? ''); setNotesEditing(true); }}
                      className="text-[10px]"
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
                      className="w-full rounded-lg px-2 py-1.5 text-[12px] outline-none resize-none"
                      style={{
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-active)',
                      }}
                    />
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleSaveNotes}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px]"
                        style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}
                      >
                        <Save size={10} /> Save
                      </button>
                      <button
                        onClick={() => setNotesEditing(false)}
                        className="text-[11px] px-1"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-[12px]" style={{ color: day.managerNotes ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                    {day.managerNotes || 'No notes yet.'}
                  </div>
                )}
              </div>

              {/* Check-in history */}
              <div>
                <div className="text-[10px] font-semibold uppercase mb-1.5" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                  Check-ins ({day.checkIns.length})
                </div>
                <div className="space-y-1.5 mb-2">
                  {day.checkIns.length === 0 && (
                    <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>No check-ins today.</div>
                  )}
                  {[...day.checkIns].reverse().map((ci) => (
                    <div
                      key={ci.id}
                      className="rounded-lg px-2.5 py-2"
                      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
                    >
                      <div className="text-[12px]" style={{ color: 'var(--text-primary)' }}>{ci.summary}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {formatRelativeTime(ci.createdAt)}
                      </div>
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
                    className="flex-1 rounded-lg px-2 py-1.5 text-[12px] outline-none"
                    style={{
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border)',
                    }}
                  />
                  <button
                    onClick={handleCheckIn}
                    disabled={!checkInText.trim()}
                    className="shrink-0 h-7 rounded-lg px-2 text-[11px] font-medium disabled:opacity-40 transition-colors"
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
