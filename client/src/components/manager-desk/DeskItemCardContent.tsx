import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, FileText, Link2, Users, XCircle } from 'lucide-react';
import type { ManagerDeskItem, ManagerDeskStatus } from '@/types/manager-desk';
import {
  CATEGORY_LABELS,
  EXECUTION_STATE_LABELS,
  KIND_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from '@/types/manager-desk';
import { AssigneePill } from './AssigneePill';
import {
  getDateSignal,
  getKindBackground,
  getKindColor,
  getQuickActions,
  kindIcons,
  priorityColors,
  SignalChip,
  statusTone,
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
  const statusLabel = item.status === 'in_progress' ? 'Started' : STATUS_LABELS[item.status];
  const execChip = useExecutionChip(item);
  const actions = getQuickActions(item);

  return (
    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex min-w-0 items-start gap-2">
          <span
            className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md"
            style={{ background: getKindBackground(variant), color: getKindColor(variant, item.status) }}
            title={KIND_LABELS[item.kind]}
          >
            <KindIcon size={12} />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <span
                className="min-w-0 max-w-full truncate text-[12px] font-semibold leading-5"
                style={{
                  color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
                  textDecoration: item.status === 'cancelled' ? 'line-through' : undefined,
                }}
              >
                {item.title}
              </span>
              {item.priority !== 'low' && !isDone && <PriorityPill item={item} />}
            </div>

            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
              <SignalChip label={statusLabel} style={statusTone[item.status]} />
              <SignalChip icon={<KindIcon size={8} />} label={KIND_LABELS[item.kind]} />
              <SignalChip label={CATEGORY_LABELS[item.category]} />
              {dateSignal && (
                <SignalChip
                  icon={dateSignal.tone === 'danger' ? <AlertTriangle size={8} /> : <Clock3 size={8} />}
                  label={dateSignal.label}
                  tone={dateSignal.tone}
                />
              )}
              <SignalChip
                icon={sourceSignal.type === 'jira' ? <Link2 size={8} /> : <FileText size={8} />}
                label={sourceSignal.label}
                title={sourceSignal.title}
              />
              {execChip && <SignalChip icon={<Users size={8} />} label={execChip.label} style={execChip.style} title={`Developer execution: ${execChip.label}`} />}
            </div>

            <RowContext item={item} isDone={isDone} />
          </div>
        </div>
      </div>

      {actions.length > 0 && onStatusChange && !readOnly && (
        <div className="flex flex-wrap items-center gap-1 md:justify-end">
          {actions.map((action) => (
            <button
              key={action.status}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onStatusChange(action.status);
              }}
              className="inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[9px] font-semibold uppercase tracking-[0.08em] transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.98]"
              style={action.style}
              aria-label={`${action.label} ${item.title}`}
              title={action.label}
            >
              {action.icon}
              <span className={action.secondary ? 'hidden xl:inline' : ''}>{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {isDone && (
        <div className="hidden items-center justify-end md:flex">
          {item.status === 'done' ? <CheckCircle2 size={15} style={{ color: 'var(--success)' }} /> : <XCircle size={15} style={{ color: 'var(--text-muted)' }} />}
        </div>
      )}
    </div>
  );
}

function PriorityPill({ item }: { item: ManagerDeskItem }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em]"
      style={{ background: 'var(--bg-secondary)', color: priorityColors[item.priority], border: '1px solid var(--border)' }}
      title={PRIORITY_LABELS[item.priority]}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: priorityColors[item.priority] }} />
      {PRIORITY_LABELS[item.priority]}
    </span>
  );
}

function RowContext({ item, isDone }: { item: ManagerDeskItem; isDone: boolean }) {
  if (!item.assignee && !item.participants && !item.nextAction && !item.outcome) return null;
  return (
    <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-2 pl-0.5">
      {item.assignee && <AssigneePill assignee={item.assignee} size="xs" tone="neutral" />}
      {item.participants && <span className="truncate text-[10px]" style={{ color: 'var(--text-secondary)' }}>{item.participants}</span>}
      {!isDone && item.nextAction && <span className="max-w-[320px] truncate text-[10px]" style={{ color: 'var(--text-muted)' }}>Next: {item.nextAction}</span>}
      {isDone && item.outcome && <span className="max-w-[320px] truncate text-[10px]" style={{ color: 'var(--success)' }}>Outcome: {item.outcome}</span>}
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
