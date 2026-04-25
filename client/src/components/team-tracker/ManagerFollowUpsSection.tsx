import { Briefcase, Check, Loader2 } from 'lucide-react';
import type { TrackerDeveloperDay } from '@/types';
import type { ManagerDeskItem } from '@/types/manager-desk';
import { JiraIssueLink } from '@/components/JiraIssueLink';
import { DrawerSection } from './DeveloperDrawerSections';

interface ManagerFollowUpRowProps {
  day: TrackerDeveloperDay;
  items: ManagerDeskItem[];
  isLoading?: boolean;
  onComplete: (itemId: number) => void;
  onCapture: () => void;
}

const managerDeskStatusLabels: Record<ManagerDeskItem['status'], string> = {
  inbox: 'Inbox',
  planned: 'Planned',
  in_progress: 'In progress',
  waiting: 'Waiting',
  backlog: 'Later',
  done: 'Done',
  cancelled: 'Cancelled',
};

const managerDeskStatusStyles: Record<ManagerDeskItem['status'], { color: string; background: string; border: string }> = {
  inbox: { color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', border: 'var(--border)' },
  planned: { color: 'var(--md-accent)', background: 'rgba(217,169,78,0.10)', border: 'rgba(217,169,78,0.18)' },
  in_progress: { color: 'var(--accent)', background: 'var(--accent-glow)', border: 'color-mix(in srgb, var(--accent) 20%, transparent)' },
  waiting: { color: 'var(--info)', background: 'rgba(139,92,246,0.10)', border: 'rgba(139,92,246,0.20)' },
  backlog: { color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', border: 'var(--border)' },
  done: { color: 'var(--success)', background: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.20)' },
  cancelled: { color: 'var(--text-muted)', background: 'var(--bg-tertiary)', border: 'var(--border)' },
};

function getManagerFollowUpMeta(item: ManagerDeskItem) {
  const issueLink = item.links.find((link) => link.linkType === 'issue' && link.issueKey);
  return {
    issueKey: issueLink?.issueKey,
    subtitle: item.nextAction || item.contextNote,
  };
}

function EmptyManagerFollowUp({ day }: { day: TrackerDeveloperDay }) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl px-3 py-2"
      style={{
        background: 'var(--bg-tertiary)',
        border: '1px solid rgba(217,169,78,0.16)',
      }}
    >
      <Briefcase size={14} className="shrink-0" style={{ color: 'var(--md-accent)' }} />
      <div className="min-w-0 text-[12px] leading-5" style={{ color: 'var(--text-secondary)' }}>
        <span>Private follow-up linked to {day.developer.displayName}</span>
        {day.currentItem?.jiraKey && (
          <>
            <span> · Current: </span>
            <JiraIssueLink issueKey={day.currentItem.jiraKey} style={{ color: 'var(--text-primary)' }}>
              {day.currentItem.jiraKey}
            </JiraIssueLink>
          </>
        )}
      </div>
    </div>
  );
}

function ManagerFollowUpItem({ item, onComplete }: { item: ManagerDeskItem; onComplete: (itemId: number) => void }) {
  const statusStyle = managerDeskStatusStyles[item.status];
  const meta = getManagerFollowUpMeta(item);
  const isDone = item.status === 'done';

  return (
    <div
      className="group flex items-start gap-2 rounded-xl px-3 py-2"
      style={{
        background: isDone ? 'color-mix(in srgb, var(--bg-tertiary) 72%, transparent)' : 'var(--bg-tertiary)',
        border: `1px solid ${isDone ? 'var(--border)' : 'rgba(217,169,78,0.16)'}`,
      }}
    >
      <Briefcase size={14} className="mt-0.5 shrink-0" style={{ color: isDone ? 'var(--success)' : 'var(--md-accent)' }} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="truncate text-[13px] font-medium"
            style={{
              color: isDone ? 'var(--text-secondary)' : 'var(--text-primary)',
              textDecoration: isDone ? 'line-through' : undefined,
            }}
          >
            {item.title}
          </span>
          <span
            className="shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase"
            style={{
              color: statusStyle.color,
              background: statusStyle.background,
              borderColor: statusStyle.border,
              letterSpacing: '0.04em',
            }}
          >
            {managerDeskStatusLabels[item.status]}
          </span>
        </div>
        {(meta.issueKey || meta.subtitle) && (
          <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {meta.issueKey && (
              <JiraIssueLink issueKey={meta.issueKey} className="shrink-0" style={{ color: 'var(--accent)' }}>
                {meta.issueKey}
              </JiraIssueLink>
            )}
            {meta.issueKey && meta.subtitle && <span>·</span>}
            {meta.subtitle && <span className="truncate">{meta.subtitle}</span>}
          </div>
        )}
      </div>
      {!isDone && (
        <button
          type="button"
          onClick={() => onComplete(item.id)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg opacity-80 transition-all hover:opacity-100"
          style={{ color: 'var(--success)', background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.18)' }}
          aria-label={`Mark ${item.title} complete`}
          title="Mark complete"
        >
          <Check size={13} />
        </button>
      )}
    </div>
  );
}

export function ManagerFollowUpRow({ day, items, isLoading, onComplete, onCapture }: ManagerFollowUpRowProps) {
  return (
    <DrawerSection
      title="Manager follow-up"
      count={items.length}
      action={
        <button
          type="button"
          onClick={onCapture}
          className="rounded-lg px-2 py-1 text-[11px] font-medium"
          style={{ color: 'var(--md-accent)', background: 'rgba(217,169,78,0.10)' }}
        >
          Capture
        </button>
      }
    >
      <div className="space-y-1.5">
        {isLoading && (
          <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-[12px]" style={{ color: 'var(--text-muted)', background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
            <Loader2 size={13} className="animate-spin" />
            Loading follow-ups
          </div>
        )}

        {!isLoading && items.length === 0 && <EmptyManagerFollowUp day={day} />}

        {items.map((item) => (
          <ManagerFollowUpItem key={item.id} item={item} onComplete={onComplete} />
        ))}
      </div>
    </DrawerSection>
  );
}
