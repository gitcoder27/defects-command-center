import { useMemo } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { CheckCircle2, MoreHorizontal, XCircle } from 'lucide-react';
import type { ManagerDeskItem, ManagerDeskStatus } from '@/types/manager-desk';
import {
  EXECUTION_STATE_LABELS,
  KIND_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from '@/types/manager-desk';
import {
  getDateSignal,
  getKindBackground,
  getKindColor,
  getPrimaryQuickAction,
  getSecondaryQuickActions,
  kindIcons,
  priorityColors,
  type RowQuickAction,
  type DeskItemVariant,
} from './DeskItemCardPrimitives';

interface Props {
  item: ManagerDeskItem;
  variant: DeskItemVariant;
  isDone: boolean;
  isOverdue: boolean;
  readOnly: boolean;
  onStatusChange?: (status: ManagerDeskStatus) => void;
}

export function DeskItemCardContent({ item, variant, isDone, isOverdue, readOnly, onStatusChange }: Props) {
  const KindIcon = kindIcons[item.kind];
  const dateSignal = useMemo(() => getDateSignal(item, isOverdue), [item, isOverdue]);
  const sourceSignal = useMemo(() => getSourceSignal(item), [item]);
  const statusLabel = STATUS_LABELS[item.status];
  const execChip = useExecutionChip(item);
  const primaryAction = getPrimaryQuickAction(item);
  const secondaryActions = getSecondaryQuickActions(item);
  const showSource = sourceSignal.type !== 'manual';
  const showPriority = !isDone && (item.priority === 'high' || item.priority === 'critical');
  const metaItems = [
    showPriority ? PRIORITY_LABELS[item.priority] : null,
    dateSignal?.label,
    showSource ? sourceSignal.label : null,
    execChip?.label,
    item.assignee?.displayName,
    !item.assignee && item.participants ? item.participants : null,
  ].filter(isPresent);

  return (
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
          style={{ background: getKindBackground(variant), color: getKindColor(variant, item.status) }}
          title={KIND_LABELS[item.kind]}
        >
          <KindIcon size={15} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="min-w-0 max-w-full truncate text-[15px] font-semibold leading-5 tracking-[-0.01em]"
              style={{
                color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
                textDecoration: item.status === 'cancelled' ? 'line-through' : undefined,
              }}
            >
              {item.title}
            </span>
          </div>

          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] leading-4">
            <span
              className="font-semibold uppercase tracking-[0.08em]"
              style={{ color: getStatusColor(item.status, isDone) }}
            >
              {statusLabel}
            </span>
            {metaItems.map((meta, index) => (
              <span key={`${meta}-${index}`} className="inline-flex min-w-0 items-center gap-2" style={{ color: getMetaColor(meta, item, dateSignal?.label) }}>
                <span className="h-1 w-1 rounded-full" style={{ background: 'color-mix(in srgb, var(--text-muted) 68%, transparent)' }} />
                <span className="truncate">{meta}</span>
              </span>
            ))}
          </div>

          <RowContext item={item} isDone={isDone} />
        </div>
      </div>

      {primaryAction && onStatusChange && !readOnly && (
        <div className="flex shrink-0 items-center gap-1 self-start pl-12 sm:self-center sm:pl-0">
          <RowActionButton action={primaryAction} itemTitle={item.title} onStatusChange={onStatusChange} />
          {secondaryActions.length > 0 && (
            <Popover.Root>
              <Popover.Trigger asChild>
                <button
                  type="button"
                  onClick={(event) => event.stopPropagation()}
                  className="flex h-8 w-8 items-center justify-center rounded-md border transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.98]"
                  style={{
                    background: 'var(--bg-secondary)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-secondary)',
                  }}
                  aria-label={`More actions for ${item.title}`}
                  title="More actions"
                >
                  <MoreHorizontal size={13} />
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  align="end"
                  side="bottom"
                  sideOffset={6}
                  collisionPadding={12}
                  onClick={(event) => event.stopPropagation()}
                  className="z-50 min-w-[132px] rounded-lg border p-1 shadow-lg"
                  style={{
                    background: 'var(--bg-primary)',
                    borderColor: 'var(--border)',
                    boxShadow: '0 16px 38px rgba(2,6,23,0.28)',
                  }}
                >
                  {secondaryActions.map((action) => (
                    <Popover.Close asChild key={action.status}>
                      <RowMenuAction
                        action={action}
                        itemTitle={item.title}
                        onStatusChange={onStatusChange}
                      />
                    </Popover.Close>
                  ))}
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          )}
        </div>
      )}

      {isDone && (
        <div className="hidden shrink-0 items-center justify-end md:flex">
          {item.status === 'done' ? <CheckCircle2 size={15} style={{ color: 'var(--success)' }} /> : <XCircle size={15} style={{ color: 'var(--text-muted)' }} />}
        </div>
      )}
    </div>
  );
}

function isPresent(value: string | null | undefined): value is string {
  return Boolean(value);
}

function getStatusColor(status: ManagerDeskStatus, isDone: boolean) {
  if (isDone) return 'var(--text-muted)';
  if (status === 'inbox' || status === 'planned') return 'var(--md-accent)';
  if (status === 'in_progress') return 'var(--accent)';
  if (status === 'waiting') return 'var(--warning)';
  if (status === 'backlog') return 'var(--text-secondary)';
  return 'var(--text-muted)';
}

function getMetaColor(meta: string, item: ManagerDeskItem, dateLabel?: string) {
  if (meta === PRIORITY_LABELS.critical || meta === PRIORITY_LABELS.high) {
    return priorityColors[item.priority];
  }
  if (dateLabel === meta && meta.startsWith('Overdue')) {
    return 'var(--danger)';
  }
  return 'var(--text-muted)';
}

function RowActionButton({
  action,
  itemTitle,
  onStatusChange,
}: {
  action: RowQuickAction;
  itemTitle: string;
  onStatusChange: (status: ManagerDeskStatus) => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onStatusChange(action.status);
      }}
      className="inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.98]"
      style={action.style}
      aria-label={`${action.label} ${itemTitle}`}
      title={action.label}
    >
      {action.icon}
      <span>{action.label}</span>
    </button>
  );
}

function RowMenuAction({
  action,
  itemTitle,
  onStatusChange,
}: {
  action: RowQuickAction;
  itemTitle: string;
  onStatusChange: (status: ManagerDeskStatus) => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onStatusChange(action.status);
      }}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors hover:bg-white/5"
      style={{ color: action.status === 'cancelled' ? 'var(--text-muted)' : 'var(--text-secondary)' }}
      aria-label={`${action.label} ${itemTitle}`}
      title={action.label}
    >
      {action.icon}
      <span>{action.label}</span>
    </button>
  );
}

function RowContext({ item, isDone }: { item: ManagerDeskItem; isDone: boolean }) {
  const context = isDone ? item.outcome : item.nextAction;
  if (!context) return null;

  return (
    <div className="mt-0.5 min-w-0">
      <span
        className="block max-w-[520px] truncate text-[11px]"
        style={{ color: isDone ? 'var(--success)' : 'var(--text-muted)' }}
      >
        {isDone ? 'Outcome: ' : 'Next: '}
        {context}
      </span>
    </div>
  );
}

function useExecutionChip(item: ManagerDeskItem) {
  const exec = item.delegatedExecution;
  return useMemo(() => {
    if (!exec) return null;
    if (exec.state === 'done') return { label: EXECUTION_STATE_LABELS.done, style: { background: 'rgba(16,185,129,0.10)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.22)' } };
    if (exec.state === 'in_progress') return { label: EXECUTION_STATE_LABELS.in_progress, style: { background: 'rgba(6,182,212,0.10)', color: 'var(--accent)', border: '1px solid rgba(6,182,212,0.22)' } };
    if (exec.state === 'dropped') return { label: EXECUTION_STATE_LABELS.dropped, style: { background: 'rgba(239,68,68,0.08)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.16)' } };
    return { label: EXECUTION_STATE_LABELS.planned, style: { background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' } };
  }, [exec]);
}

function getSourceSignal(item: ManagerDeskItem) {
  const issue = item.links.find((link) => link.linkType === 'issue');
  if (issue) return { type: 'jira' as const, label: issue.displayLabel, title: `Jira issue ${issue.displayLabel}` };
  if (item.links.length > 0) return { type: 'link' as const, label: `${item.links.length} linked`, title: item.links.map((link) => link.displayLabel).join(', ') };
  return { type: 'manual' as const, label: 'Manual', title: 'Manual manager capture' };
}
