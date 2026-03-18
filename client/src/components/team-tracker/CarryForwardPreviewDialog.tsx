import { useState, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Link2,
  Minus,
  Square,
  User,
  X,
} from 'lucide-react';
import { JiraIssueLink } from '@/components/JiraIssueLink';
import type {
  TrackerCarryForwardPreviewGroup,
  TrackerWorkItem,
} from '@/types';

interface CarryForwardPreviewDialogProps {
  open: boolean;
  fromDate: string;
  toDate: string;
  developers: TrackerCarryForwardPreviewGroup[];
  isPending: boolean;
  onConfirm: (itemIds?: number[]) => void;
  onClose: () => void;
}

function TaskSourceBadge({ item }: { item: TrackerWorkItem }) {
  if (item.managerDeskItemId != null) {
    return (
      <span
        className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium"
        style={{
          background: 'rgba(139, 92, 246, 0.10)',
          color: 'rgb(139, 92, 246)',
          border: '1px solid rgba(139, 92, 246, 0.18)',
        }}
      >
        <Link2 size={9} />
        Desk
      </span>
    );
  }
  return null;
}

function TaskCheckbox({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors"
      style={{
        borderColor: checked || indeterminate
          ? 'var(--accent)'
          : 'var(--border-strong)',
        background: checked || indeterminate
          ? 'var(--accent)'
          : 'transparent',
        color: checked || indeterminate ? 'white' : 'transparent',
      }}
    >
      {indeterminate ? <Minus size={11} strokeWidth={2.5} /> : checked ? <Check size={11} strokeWidth={2.5} /> : null}
    </button>
  );
}

function DeveloperGroup({
  group,
  selectedIds,
  expandedGroups,
  onToggleExpand,
  onToggleDeveloper,
  onToggleItem,
}: {
  group: TrackerCarryForwardPreviewGroup;
  selectedIds: Set<number>;
  expandedGroups: Set<string>;
  onToggleExpand: (accountId: string) => void;
  onToggleDeveloper: (accountId: string) => void;
  onToggleItem: (id: number) => void;
}) {
  const accountId = group.developer.accountId;
  const isExpanded = expandedGroups.has(accountId);
  const selectedInGroup = group.items.filter((item) => selectedIds.has(item.id)).length;
  const allSelected = selectedInGroup === group.items.length;
  const someSelected = selectedInGroup > 0 && !allSelected;

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{
        borderColor: someSelected || allSelected
          ? 'color-mix(in srgb, var(--accent) 25%, var(--border))'
          : 'var(--border)',
        background: 'var(--bg-secondary)',
      }}
    >
      {/* Developer header */}
      <div
        className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer select-none"
        style={{ background: 'var(--bg-tertiary)' }}
        onClick={() => onToggleExpand(accountId)}
      >
        <TaskCheckbox
          checked={allSelected}
          indeterminate={someSelected}
          onChange={() => onToggleDeveloper(accountId)}
          label={allSelected ? `Deselect all for ${group.developer.displayName}` : `Select all for ${group.developer.displayName}`}
        />
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-bold shrink-0"
            style={{
              background: 'color-mix(in srgb, var(--accent) 14%, transparent)',
              color: 'var(--accent)',
            }}
          >
            {group.developer.displayName.charAt(0).toUpperCase()}
          </div>
          <span
            className="text-[12px] font-semibold truncate"
            style={{ color: 'var(--text-primary)' }}
          >
            {group.developer.displayName}
          </span>
          <span
            className="text-[10px] font-medium shrink-0 tabular-nums"
            style={{ color: 'var(--text-muted)' }}
          >
            {selectedInGroup}/{group.items.length}
          </span>
        </div>
        <div
          className="flex h-5 w-5 items-center justify-center rounded-md shrink-0"
          style={{ color: 'var(--text-muted)' }}
        >
          {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </div>
      </div>

      {/* Task list */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-1.5 py-1">
              {group.items.map((item) => (
                <CarryForwardTaskRow
                  key={item.id}
                  item={item}
                  selected={selectedIds.has(item.id)}
                  onToggle={() => onToggleItem(item.id)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CarryForwardTaskRow({
  item,
  selected,
  onToggle,
}: {
  item: TrackerWorkItem;
  selected: boolean;
  onToggle: () => void;
}) {
  const stateLabel =
    item.state === 'in_progress' ? 'In progress' :
    item.state === 'planned' ? 'Planned' :
    item.state;

  return (
    <div
      className="flex items-start gap-2 rounded-xl px-2 py-1.5 transition-colors cursor-pointer group"
      style={{
        background: selected
          ? 'color-mix(in srgb, var(--accent) 5%, transparent)'
          : 'transparent',
      }}
      onClick={onToggle}
    >
      <div className="pt-0.5">
        <TaskCheckbox
          checked={selected}
          onChange={onToggle}
          label={selected ? `Deselect ${item.title}` : `Select ${item.title}`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="text-[12px] leading-tight"
            style={{
              color: selected ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            {item.title}
          </span>
          <TaskSourceBadge item={item} />
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {item.jiraKey && (
            <JiraIssueLink
              issueKey={item.jiraKey}
              className="text-[10px] font-mono"
              style={{ color: 'var(--accent)' }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              {item.jiraKey}
            </JiraIssueLink>
          )}
          {item.jiraPriorityName && (
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {item.jiraPriorityName}
            </span>
          )}
          <span
            className="text-[10px] rounded-md px-1 py-px"
            style={{
              background: item.state === 'in_progress'
                ? 'rgba(59, 130, 246, 0.10)'
                : 'var(--bg-tertiary)',
              color: item.state === 'in_progress'
                ? 'rgb(96, 165, 250)'
                : 'var(--text-muted)',
            }}
          >
            {stateLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

export function CarryForwardPreviewDialog({
  open,
  fromDate,
  toDate,
  developers,
  isPending,
  onConfirm,
  onClose,
}: CarryForwardPreviewDialogProps) {
  const allItemIds = useMemo(
    () => new Set(developers.flatMap((g) => g.items.map((i) => i.id))),
    [developers]
  );

  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set(allItemIds));
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(developers.map((g) => g.developer.accountId))
  );

  // Reset selection when developers change (dialog reopens with new data)
  const prevDevKey = useMemo(
    () => developers.map((g) => g.developer.accountId).join(','),
    [developers]
  );
  const [lastDevKey, setLastDevKey] = useState(prevDevKey);
  if (prevDevKey !== lastDevKey) {
    setLastDevKey(prevDevKey);
    setSelectedIds(new Set(allItemIds));
    setExpandedGroups(new Set(developers.map((g) => g.developer.accountId)));
  }

  const selectedCount = selectedIds.size;
  const totalCount = allItemIds.size;
  const allSelected = selectedCount === totalCount;

  const toggleItem = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleDeveloper = useCallback(
    (accountId: string) => {
      const group = developers.find((g) => g.developer.accountId === accountId);
      if (!group) return;

      setSelectedIds((prev) => {
        const next = new Set(prev);
        const groupIds = group.items.map((i) => i.id);
        const allGroupSelected = groupIds.every((id) => next.has(id));

        if (allGroupSelected) {
          for (const id of groupIds) next.delete(id);
        } else {
          for (const id of groupIds) next.add(id);
        }
        return next;
      });
    },
    [developers]
  );

  const toggleExpandGroup = useCallback((accountId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allItemIds));
    }
  }, [allSelected, allItemIds]);

  const handleConfirm = useCallback(() => {
    if (selectedCount === 0) return;
    if (allSelected) {
      onConfirm(undefined);
    } else {
      onConfirm(Array.from(selectedIds));
    }
  }, [allSelected, onConfirm, selectedCount, selectedIds]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70]"
            style={{ background: 'rgba(2, 6, 23, 0.55)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            role="dialog"
            aria-label="Carry forward preview"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-x-4 top-[10vh] z-[71] mx-auto flex max-h-[80vh] w-full max-w-[520px] flex-col rounded-[24px] border shadow-2xl"
            style={{ borderColor: 'var(--border-strong)', background: 'var(--bg-secondary)' }}
          >
            {/* Header */}
            <div className="shrink-0 px-4 pt-4 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-2xl shrink-0"
                    style={{
                      background: 'var(--accent-glow)',
                      color: 'var(--accent)',
                    }}
                  >
                    <ArrowRight size={18} />
                  </div>
                  <div>
                    <div
                      className="text-[14px] font-semibold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      Carry Forward Preview
                    </div>
                    <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {fromDate} → {toDate} · {totalCount} task{totalCount === 1 ? '' : 's'} across {developers.length} developer{developers.length === 1 ? '' : 's'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-xl shrink-0"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
                  aria-label="Close carry forward preview"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Select all row */}
              <div className="mt-3 flex items-center gap-2.5 px-1">
                <TaskCheckbox
                  checked={allSelected}
                  indeterminate={selectedCount > 0 && !allSelected}
                  onChange={toggleAll}
                  label={allSelected ? 'Deselect all tasks' : 'Select all tasks'}
                />
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-[11px] font-medium"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {allSelected ? 'Deselect all' : 'Select all'}
                </button>
                <span
                  className="ml-auto text-[10px] font-medium tabular-nums"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {selectedCount} of {totalCount} selected
                </span>
              </div>
            </div>

            {/* Scrollable developer groups */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-2">
              <div className="flex flex-col gap-2">
                {developers.map((group) => (
                  <DeveloperGroup
                    key={group.developer.accountId}
                    group={group}
                    selectedIds={selectedIds}
                    expandedGroups={expandedGroups}
                    onToggleExpand={toggleExpandGroup}
                    onToggleDeveloper={toggleDeveloper}
                    onToggleItem={toggleItem}
                  />
                ))}
              </div>
            </div>

            {/* Footer */}
            <div
              className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-t"
              style={{ borderColor: 'var(--border)' }}
            >
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-3 py-2 text-[11px] font-semibold"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={selectedCount === 0 || isPending}
                className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[11px] font-semibold transition-colors disabled:opacity-40"
                style={{
                  background: selectedCount > 0 ? 'var(--accent)' : 'var(--bg-tertiary)',
                  color: selectedCount > 0 ? 'white' : 'var(--text-muted)',
                }}
              >
                <ArrowRight size={12} />
                {isPending
                  ? 'Carrying…'
                  : selectedCount === 0
                  ? 'Select tasks to carry'
                  : `Carry ${selectedCount} task${selectedCount === 1 ? '' : 's'}`}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
