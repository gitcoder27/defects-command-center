import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Eye,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Rows3,
  Target,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { AppView } from '@/App';
import { useManagerAttention } from '@/hooks/useManagerAttention';
import {
  formatManagerDueSignal,
  type ManagerAttentionItem,
  type ManagerAttentionSeverity,
  type ManagerAttentionTarget,
  type ManagerTeamPulseItem,
  type ManualWorkSummary,
  type StandupPrompt,
} from '@/lib/manager-attention';
import type { FilterType, ManagerDeskItem } from '@/types';

interface TodayPageProps {
  onViewChange: (view: AppView) => void;
  onSelectWorkFilter?: (filter: FilterType) => void;
}

type BoardGroup = 'now' | 'next' | 'later';

interface BoardRow {
  id: string;
  group: BoardGroup;
  icon: LucideIcon;
  title: string;
  context: string;
  chip: string;
  count?: number;
  severity: ManagerAttentionSeverity;
  target: ManagerAttentionTarget;
  filter?: FilterType;
}

const toneStyles: Record<ManagerAttentionSeverity | 'success', { color: string; bg: string; border: string }> = {
  critical: {
    color: 'var(--danger)',
    bg: 'color-mix(in srgb, var(--danger) 14%, transparent)',
    border: 'color-mix(in srgb, var(--danger) 28%, transparent)',
  },
  warning: {
    color: 'var(--warning)',
    bg: 'color-mix(in srgb, var(--warning) 13%, transparent)',
    border: 'color-mix(in srgb, var(--warning) 26%, transparent)',
  },
  info: {
    color: 'var(--accent)',
    bg: 'color-mix(in srgb, var(--accent) 12%, transparent)',
    border: 'color-mix(in srgb, var(--accent) 24%, transparent)',
  },
  neutral: {
    color: 'var(--text-secondary)',
    bg: 'color-mix(in srgb, var(--bg-tertiary) 80%, transparent)',
    border: 'var(--border)',
  },
  success: {
    color: 'var(--success)',
    bg: 'color-mix(in srgb, var(--success) 13%, transparent)',
    border: 'color-mix(in srgb, var(--success) 24%, transparent)',
  },
};

const groupLabels: Record<BoardGroup, { title: string; hint: string }> = {
  now: { title: 'Now', hint: 'Focus first' },
  next: { title: 'Next', hint: 'Plan next' },
  later: { title: 'Later', hint: 'Track and review' },
};

function actionLabel(target: ManagerAttentionTarget) {
  if (target === 'follow-ups') return 'Open Follow-ups';
  if (target === 'meetings') return 'Open Meetings';
  if (target === 'team') return 'Open Team';
  if (target === 'desk') return 'Open Desk';
  return 'Open Work';
}

function attentionIcon(item: ManagerAttentionItem): LucideIcon {
  if (item.id.includes('blocked') || item.id.includes('team')) return AlertTriangle;
  if (item.id.includes('follow')) return Bell;
  if (item.id.includes('due') || item.id.includes('overdue')) return CalendarClock;
  if (item.id.includes('unassigned')) return Users;
  return Target;
}

function attentionGroup(item: ManagerAttentionItem): BoardGroup {
  if (item.severity === 'critical' || item.id === 'due-today' || item.id === 'follow-ups') return 'now';
  if (item.id === 'high-priority' || item.id === 'unassigned' || item.id === 'team-attention') return 'next';
  return 'later';
}

function attentionChip(item: ManagerAttentionItem) {
  if (item.id.includes('blocked')) return 'Blocked';
  if (item.id.includes('follow')) return 'Follow-up';
  if (item.id.includes('due')) return item.id === 'due-today' ? 'Due today' : 'Overdue';
  if (item.id.includes('unassigned')) return 'Needs owner';
  if (item.id.includes('stale')) return 'Needs update';
  if (item.id.includes('priority')) return 'Priority';
  return item.target;
}

function getWorkMetricValue(metrics: { id: string; value: number }[], id: string): number {
  return metrics.find((metric) => metric.id === id)?.value ?? 0;
}

export function TodayPage({ onViewChange, onSelectWorkFilter }: TodayPageProps) {
  const attention = useManagerAttention();
  const snapshot = attention.data;
  const formattedDate = format(parseISO(snapshot.date), 'MMM d, yyyy');
  const weekday = format(parseISO(snapshot.date), 'EEE');
  const activeDefects = getWorkMetricValue(snapshot.workMetrics, 'jira-defects');
  const staleCheckIns = getWorkMetricValue(snapshot.teamMetrics, 'stale-checkins');
  const dueToday = snapshot.attentionItems.find((item) => item.id === 'due-today')?.count ?? 0;

  const openTarget = (target: ManagerAttentionTarget, filter?: FilterType) => {
    if (target === 'work' && filter && onSelectWorkFilter) {
      onSelectWorkFilter(filter);
      return;
    }
    onViewChange(target);
  };

  const boardRows = buildBoardRows(snapshot.attentionItems, snapshot.manualWork);
  const groupedRows: Record<BoardGroup, BoardRow[]> = {
    now: boardRows.filter((row) => row.group === 'now').slice(0, 4),
    next: boardRows.filter((row) => row.group === 'next').slice(0, 4),
    later: boardRows.filter((row) => row.group === 'later').slice(0, 3),
  };

  return (
    <main
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-canvas) 96%, var(--accent) 4%), var(--bg-canvas))',
        ['--today-line' as string]: 'color-mix(in srgb, var(--border) 34%, transparent)',
        ['--today-line-strong' as string]: 'color-mix(in srgb, var(--border-strong) 24%, transparent)',
        ['--today-hover' as string]: 'color-mix(in srgb, var(--bg-tertiary) 34%, transparent)',
        ['--today-muted-panel' as string]: 'color-mix(in srgb, var(--bg-secondary) 20%, transparent)',
        ['--today-soft-panel' as string]: 'color-mix(in srgb, var(--bg-secondary) 38%, transparent)',
      }}
    >
      <section className="shrink-0 border-b px-2 py-1.5" style={{ borderColor: 'var(--today-line)' }}>
        <div
          className="grid gap-1.5 border-b border-t py-1.5 lg:grid-cols-[190px_repeat(6,minmax(0,1fr))_160px]"
          style={{
            background: 'linear-gradient(90deg, color-mix(in srgb, var(--bg-secondary) 20%, transparent), color-mix(in srgb, var(--bg-secondary) 8%, transparent))',
            borderColor: 'color-mix(in srgb, var(--border) 24%, transparent)',
          }}
        >
          <SummaryDate date={formattedDate} weekday={weekday} isFetching={attention.isFetching} onRefresh={() => void attention.refetch()} />
          <SummaryMetric value={snapshot.totalAttentionCount} label="Attention" detail="needs your focus" tone="warning" />
          <SummaryMetric value={activeDefects} label="Active defects" detail="in Work" tone="neutral" />
          <SummaryMetric value={snapshot.teamSize} label="People" detail="on your team" tone="info" />
          <SummaryMetric value={staleCheckIns} label="Stale check-ins" detail="need update" tone="warning" />
          <SummaryMetric value={dueToday} label="Due today" detail="defects" tone="warning" />
          <SummaryMetric value={snapshot.followUpsDue.length} label="Follow-ups" detail="due today" tone="warning" />
          <div className="hidden min-h-[58px] items-center rounded-lg px-3 lg:flex" style={{ background: 'color-mix(in srgb, var(--bg-secondary) 14%, transparent)' }}>
            <div>
              <p className="text-[13px] font-medium" style={{ color: 'var(--accent)' }}>Standup kit</p>
              <p className="mt-1 text-[12px] leading-5" style={{ color: 'var(--text-secondary)' }}>{snapshot.standupPrompts.length} prompts ready</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
        <OperationsBoard
          isLoading={attention.isLoading}
          rows={groupedRows}
          prompts={snapshot.standupPrompts}
          followUps={snapshot.followUpsDue}
          onOpenTarget={openTarget}
        />
        <PeopleAndPromises
          teamPulse={snapshot.teamPulse}
          followUps={snapshot.followUpsDue}
          prompts={snapshot.standupPrompts}
          onOpenTarget={openTarget}
          onViewChange={onViewChange}
        />
      </section>

      <CommandFooter
        onViewChange={onViewChange}
        onSelectWorkFilter={onSelectWorkFilter}
      />
    </main>
  );
}

function buildBoardRows(attentionItems: ManagerAttentionItem[], manualWork: ManualWorkSummary): BoardRow[] {
  const rows: BoardRow[] = attentionItems.map((item) => ({
    id: item.id,
    group: attentionGroup(item),
    icon: attentionIcon(item),
    title: item.title,
    context: item.samples[0] ?? item.detail,
    chip: attentionChip(item),
    count: item.count,
    severity: item.severity,
    target: item.target,
    filter: item.filter,
  }));

  if (manualWork.deskOpen > 0) {
    rows.push({
      id: 'desk-manual-work',
      group: 'next',
      icon: Rows3,
      title: `${manualWork.deskOpen} Desk item${manualWork.deskOpen === 1 ? '' : 's'}`,
      context: 'Manager Desk non-Jira work',
      chip: 'Desk',
      count: manualWork.deskOpen,
      severity: 'info',
      target: 'desk',
    });
  }

  if (manualWork.trackerOpen > 0) {
    rows.push({
      id: 'team-manual-work',
      group: 'next',
      icon: Users,
      title: `${manualWork.trackerOpen} Team manual item${manualWork.trackerOpen === 1 ? '' : 's'}`,
      context: 'Team Tracker non-Jira work',
      chip: 'Team',
      count: manualWork.trackerOpen,
      severity: 'info',
      target: 'team',
    });
  }

  if (rows.length === 0) {
    rows.push({
      id: 'clean-start',
      group: 'now',
      icon: CheckCircle2,
      title: 'No urgent signals',
      context: 'Work, Team, and Desk are calm right now',
      chip: 'Clear',
      severity: 'neutral',
      target: 'team',
    });
  }

  return rows;
}

function SummaryDate({
  date,
  weekday,
  isFetching,
  onRefresh,
}: {
  date: string;
  weekday: string;
  isFetching: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="flex min-h-[58px] items-center justify-between gap-3 rounded-lg px-3.5 py-2.5" style={{ background: 'color-mix(in srgb, var(--bg-secondary) 14%, transparent)' }}>
      <div className="flex items-center gap-3">
        <CalendarClock size={16} style={{ color: 'var(--text-secondary)' }} />
        <div>
          <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>Today</p>
          <p className="mt-1 text-[12px] leading-5" style={{ color: 'var(--text-secondary)' }}>{date} · {weekday}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-tertiary)] active:scale-[0.98]"
        aria-label="Refresh today"
        title="Refresh today"
      >
        {isFetching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
      </button>
    </div>
  );
}

function SummaryMetric({
  value,
  label,
  detail,
  tone,
}: {
  value: number;
  label: string;
  detail: string;
  tone: ManagerAttentionSeverity;
}) {
  const style = toneStyles[value > 0 ? tone : 'neutral'];
  return (
    <div className="min-h-[58px] rounded-lg px-3.5 py-2.5 transition-colors hover:bg-[var(--today-hover)]" style={{ background: 'transparent' }}>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[22px] font-semibold leading-none tabular-nums" style={{ color: style.color }}>{value}</span>
        <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{label}</span>
      </div>
      <p className="mt-1.5 truncate text-[12px] leading-5" style={{ color: 'var(--text-secondary)' }}>{detail}</p>
    </div>
  );
}

function OperationsBoard({
  isLoading,
  rows,
  prompts,
  followUps,
  onOpenTarget,
}: {
  isLoading: boolean;
  rows: Record<BoardGroup, BoardRow[]>;
  prompts: StandupPrompt[];
  followUps: ManagerDeskItem[];
  onOpenTarget: (target: ManagerAttentionTarget, filter?: FilterType) => void;
}) {
  return (
    <section className="min-h-0 overflow-auto border-b px-5 py-6 lg:border-b-0 lg:border-r xl:px-8" style={{ borderColor: 'var(--today-line-strong)' }}>
      <SectionHeading icon={Target} title="What needs attention" detail="Prioritized by impact and urgency" />
      <div className="mt-6">
        {isLoading ? (
          <BoardSkeleton />
        ) : (
          <>
            {(Object.keys(groupLabels) as BoardGroup[]).map((group) => (
              <BoardGroupBlock
                key={group}
                group={group}
                rows={rows[group]}
                onOpenTarget={onOpenTarget}
              />
            ))}
            <StandupBrief prompts={prompts} followUps={followUps} onOpenTarget={onOpenTarget} />
          </>
        )}
      </div>
    </section>
  );
}

function BoardGroupBlock({
  group,
  rows,
  onOpenTarget,
}: {
  group: BoardGroup;
  rows: BoardRow[];
  onOpenTarget: (target: ManagerAttentionTarget, filter?: FilterType) => void;
}) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 last:mb-0">
      <div className="mb-2.5 flex items-baseline gap-2">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em]" style={{ color: group === 'now' ? 'var(--danger)' : group === 'next' ? 'var(--warning)' : 'var(--text-secondary)' }}>
          {groupLabels[group].title}
        </h2>
        <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>({groupLabels[group].hint})</span>
      </div>
      <div className="space-y-1.5">
        {rows.map((row, index) => (
          <BoardAttentionRow key={row.id} row={row} featured={group === 'now' && index === 0} onOpenTarget={onOpenTarget} />
        ))}
      </div>
    </div>
  );
}

function BoardAttentionRow({
  row,
  featured,
  onOpenTarget,
}: {
  row: BoardRow;
  featured: boolean;
  onOpenTarget: (target: ManagerAttentionTarget, filter?: FilterType) => void;
}) {
  const Icon = row.icon;
  const style = toneStyles[row.severity];
  const featuredBackground = `linear-gradient(90deg, color-mix(in srgb, ${style.color} 4%, transparent), color-mix(in srgb, var(--bg-secondary) 8%, transparent))`;
  const featuredBorder = `color-mix(in srgb, ${style.color} 12%, var(--today-line))`;

  return (
    <button
      type="button"
      onClick={() => onOpenTarget(row.target, row.filter)}
      className="grid w-full grid-cols-[32px_minmax(0,1.2fr)] gap-4 rounded-lg px-3.5 py-3.5 text-left transition-colors hover:bg-[var(--today-hover)] active:scale-[0.998] md:grid-cols-[32px_minmax(0,1.25fr)_minmax(140px,0.72fr)_112px_150px]"
      style={{
        background: featured ? featuredBackground : 'transparent',
        boxShadow: featured ? `inset 0 0 0 1px ${featuredBorder}` : 'inset 0 -1px 0 var(--today-line)',
      }}
    >
      <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md" style={{ color: style.color, background: featured ? `color-mix(in srgb, ${style.color} 5%, transparent)` : 'transparent' }}>
        <Icon size={16} />
      </span>
      <span className="min-w-0">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>{row.title}</span>
          {row.count !== undefined ? (
            <span className="rounded-md border px-1.5 py-0.5 text-[11px] font-medium tabular-nums md:hidden" style={{ background: style.bg, borderColor: style.border, color: style.color }}>
              {row.count}
            </span>
          ) : null}
        </span>
        <span className="mt-1 block truncate text-[12px] leading-5 md:hidden" style={{ color: 'var(--text-secondary)' }}>{row.context}</span>
      </span>
      <span className="hidden min-w-0 truncate text-[13px] leading-6 md:block" style={{ color: 'var(--text-secondary)' }}>{row.context}</span>
      <span className="hidden md:block">
        <span className="rounded-md border px-2 py-1 text-[11px] font-medium" style={{ background: style.bg, borderColor: style.border, color: style.color }}>
          {row.chip}
        </span>
      </span>
      <span className="hidden items-center justify-end gap-2 whitespace-nowrap text-[13px] font-medium md:flex" style={{ color: 'var(--accent)' }}>
        {actionLabel(row.target)}
        <ArrowRight size={13} />
      </span>
    </button>
  );
}

function StandupBrief({
  prompts,
  followUps,
  onOpenTarget,
}: {
  prompts: StandupPrompt[];
  followUps: ManagerDeskItem[];
  onOpenTarget: (target: ManagerAttentionTarget, filter?: FilterType) => void;
}) {
  const leadPrompt = prompts[0];
  const leadFollowUp = followUps[0];

  return (
    <section
      className="mt-8 grid gap-4 rounded-lg px-4 py-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.8fr)]"
      style={{ background: 'var(--today-muted-panel)', boxShadow: 'inset 0 0 0 1px var(--today-line)' }}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Zap size={14} style={{ color: 'var(--accent)' }} />
          <h3 className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>Standup brief</h3>
        </div>
        <p className="mt-2 max-w-xl text-[13px] leading-6" style={{ color: 'var(--text-secondary)' }}>
          {leadPrompt ? leadPrompt.detail : 'No urgent prompts right now. Confirm the plan and protect focus time.'}
        </p>
        {leadPrompt ? (
          <button
            type="button"
            onClick={() => onOpenTarget(leadPrompt.target, leadPrompt.filter)}
            className="mt-3 inline-flex items-center gap-2 text-[12.5px] font-medium transition-colors hover:opacity-80"
            style={{ color: 'var(--accent)' }}
          >
            {leadPrompt.title}
            <ArrowRight size={12} />
          </button>
        ) : null}
      </div>
      <div className="min-w-0 border-t pt-3 md:border-l md:border-t-0 md:pl-4 md:pt-0" style={{ borderColor: 'var(--today-line)' }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--text-secondary)' }}>Manager promise</p>
        <p className="mt-2 truncate text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
          {leadFollowUp?.title ?? 'No follow-up due'}
        </p>
        <p className="mt-1 text-[12px] leading-5" style={{ color: 'var(--text-secondary)' }}>
          {leadFollowUp ? formatManagerDueSignal(leadFollowUp) : 'Desk is clear for now'}
        </p>
      </div>
    </section>
  );
}

function PeopleAndPromises({
  teamPulse,
  followUps,
  prompts,
  onOpenTarget,
  onViewChange,
}: {
  teamPulse: ManagerTeamPulseItem[];
  followUps: ManagerDeskItem[];
  prompts: StandupPrompt[];
  onOpenTarget: (target: ManagerAttentionTarget, filter?: FilterType) => void;
  onViewChange: (view: AppView) => void;
}) {
  const visibleTeamPulse = teamPulse.slice(0, 4);
  const hiddenTeamPulseCount = Math.max(teamPulse.length - visibleTeamPulse.length, 0);

  return (
    <aside className="min-h-0 overflow-auto px-5 py-6 xl:px-8">
      <SectionHeading icon={Users} title="Team Pulse" detail="People signals and manager follow-ups" />
      <div className="mt-6">
        <div className="flex items-center gap-6 border-b" style={{ borderColor: 'var(--today-line)' }}>
          <span className="border-b-2 pb-3 text-[13px] font-medium" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>Team pulse</span>
          <button type="button" onClick={() => onViewChange('desk')} className="pb-3 text-[13px] font-medium" style={{ color: 'var(--text-muted)' }}>
            My follow-ups <span className="ml-1 rounded-md px-1.5 py-0.5 text-[11px]" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>{followUps.length}</span>
          </button>
        </div>

        <div className="mt-3 space-y-1.5">
          {teamPulse.length > 0 ? (
            <>
              {visibleTeamPulse.map((person) => (
                <TeamPulseRow key={person.accountId} person={person} onOpenTeam={() => onViewChange('team')} />
              ))}
              {hiddenTeamPulseCount > 0 ? (
                <button
                  type="button"
                  onClick={() => onViewChange('team')}
                  className="mt-2 flex w-full items-center justify-between px-1 py-2.5 text-left text-[13px] font-medium transition-colors hover:bg-[var(--today-hover)]"
                  style={{ color: 'var(--accent)', borderBottom: '1px solid var(--today-line)' }}
                >
                  View all team pulse
                  <span className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                    +{hiddenTeamPulseCount}
                    <ArrowRight size={12} />
                  </span>
                </button>
              ) : null}
            </>
          ) : (
            <CompactEmpty icon={CheckCircle2} title="Team is calm" detail="No people signals need attention right now." />
          )}
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          <MiniList
            title="Follow-ups due"
            empty="No follow-ups due"
            items={followUps.slice(0, 3).map((item) => ({
              id: String(item.id),
              title: item.title,
              detail: formatManagerDueSignal(item),
              tone: item.followUpAt && item.followUpAt < new Date().toISOString() ? 'critical' : 'warning',
              onClick: () => onViewChange('desk'),
            }))}
          />
          <MiniList
            title="Standup prompts"
            empty="Standup is clear"
            items={prompts.slice(0, 2).map((prompt) => ({
              id: prompt.id,
              title: prompt.title,
              detail: prompt.detail,
              tone: prompt.target === 'work' ? 'warning' : 'info',
              onClick: () => onOpenTarget(prompt.target, prompt.filter),
            }))}
          />
        </div>
      </div>
    </aside>
  );
}

function TeamPulseRow({ person, onOpenTeam }: { person: ManagerTeamPulseItem; onOpenTeam: () => void }) {
  const style = toneStyles[person.tone];

  return (
    <button
      type="button"
      onClick={onOpenTeam}
      className="grid w-full grid-cols-[34px_minmax(0,1fr)_92px] gap-3 px-1 py-3 text-left transition-colors hover:bg-[var(--today-hover)] md:grid-cols-[38px_minmax(138px,0.78fr)_90px_minmax(0,1fr)_76px_86px]"
      style={{ borderBottom: '1px solid var(--today-line)' }}
    >
      <span className="relative mt-0.5 flex h-8 w-8 items-center justify-center rounded-md text-[11px] font-medium" style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}>
        {person.initials}
        <span className="absolute -left-1 top-1.5 h-1.5 w-1.5 rounded-full" style={{ background: style.color }} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{person.displayName}</span>
        <span className="mt-0.5 block truncate text-[12px] leading-5 md:hidden" style={{ color: 'var(--text-secondary)' }}>{person.currentWork}</span>
      </span>
      <span className="justify-self-start rounded-md px-2 py-1 text-[11px] font-medium" style={{ background: style.bg, color: style.color }}>
        {person.status}
      </span>
      <span className="hidden min-w-0 md:block">
        <span className="block truncate text-[13px] leading-5" style={{ color: 'var(--text-secondary)' }}>{person.currentWork}</span>
        <span className="mt-0.5 block truncate text-[12px] leading-5" style={{ color: 'var(--text-muted)' }}>{person.detail}</span>
      </span>
      <span className="hidden text-[12px] leading-5 md:block" style={{ color: 'var(--text-muted)' }}>{person.lastUpdate}</span>
      <span className="hidden items-center justify-end gap-1.5 text-[12px] font-medium md:flex" style={{ color: 'var(--accent)' }}>
        {person.action === 'View' ? <Eye size={12} /> : <MessageSquare size={12} />}
        {person.action}
      </span>
    </button>
  );
}

function MiniList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: Array<{ id: string; title: string; detail: string; tone: ManagerAttentionSeverity; onClick: () => void }>;
}) {
  return (
    <section>
      <h3 className="mb-2 text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      <div className="space-y-1">
        {items.length > 0 ? items.map((item) => {
          const style = toneStyles[item.tone];
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className="flex w-full items-center gap-3 px-1 py-2.5 text-left transition-colors hover:bg-[var(--today-hover)]"
              style={{ borderBottom: '1px solid var(--today-line)' }}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: style.color }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>{item.title}</span>
                <span className="mt-0.5 block truncate text-[11px]" style={{ color: 'var(--text-secondary)' }}>{item.detail}</span>
              </span>
              <ArrowRight size={12} style={{ color: 'var(--text-muted)' }} />
            </button>
          );
        }) : (
          <CompactEmpty icon={CheckCircle2} title={empty} detail="Nothing is waiting here." />
        )}
      </div>
    </section>
  );
}

function CommandFooter({
  onViewChange,
  onSelectWorkFilter,
}: {
  onViewChange: (view: AppView) => void;
  onSelectWorkFilter?: (filter: FilterType) => void;
}) {
  return (
    <footer className="shrink-0 border-t px-5 py-1.5 xl:px-8" style={{ borderColor: 'var(--today-line)', background: 'color-mix(in srgb, var(--bg-primary) 48%, transparent)' }}>
      <div className="grid gap-1.5 md:grid-cols-[150px_repeat(4,minmax(0,1fr))_170px]">
        <div className="hidden items-center gap-2.5 md:flex">
          <Zap size={16} style={{ color: 'var(--accent)' }} />
          <div>
            <p className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>Quick actions</p>
            <p className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>Jump into what matters</p>
          </div>
        </div>
        <FooterAction icon={Plus} title="Capture" detail="Note, decision, follow-up" onClick={() => onViewChange('desk')} />
        <FooterAction icon={Rows3} title="Open Work" detail="Defects and filters" onClick={() => onViewChange('work')} />
        <FooterAction icon={Users} title="Open Team" detail="Team tracker board" onClick={() => onViewChange('team')} />
        <FooterAction icon={BriefcaseBusiness} title="Open Desk" detail="Manager daily desk" onClick={() => onViewChange('desk')} />
        <button
          type="button"
          onClick={() => onSelectWorkFilter?.('blocked')}
          className="hidden items-center justify-end gap-2.5 border-l pl-4 text-left transition-colors hover:bg-[var(--today-hover)] md:flex"
          style={{ borderColor: 'var(--today-line)' }}
        >
          <AlertCircle size={16} style={{ color: 'var(--accent)' }} />
          <span>
            <span className="block text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>Standup kit</span>
            <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>Talking points ready</span>
          </span>
        </button>
      </div>
    </footer>
  );
}

function FooterAction({ icon: Icon, title, detail, onClick }: { icon: LucideIcon; title: string; detail: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-md px-2 py-1 text-left transition-colors hover:bg-[var(--today-hover)] active:scale-[0.98]"
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}>
        <Icon size={14} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</span>
        <span className="hidden truncate text-[10.5px] xl:block" style={{ color: 'var(--text-muted)' }}>{detail}</span>
      </span>
    </button>
  );
}

function SectionHeading({ icon: Icon, title, detail }: { icon: LucideIcon; title: string; detail: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={18} className="mt-0.5" style={{ color: 'var(--accent)' }} />
      <div>
        <h1 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h1>
        <p className="mt-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>{detail}</p>
      </div>
    </div>
  );
}

function CompactEmpty({ icon: Icon, title, detail }: { icon: LucideIcon; title: string; detail: string }) {
  return (
    <div className="py-5 text-center">
      <Icon size={18} className="mx-auto" style={{ color: 'var(--success)' }} />
      <p className="mt-2 text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</p>
      <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>{detail}</p>
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1, 2].map((group) => (
        <div key={group}>
          <div className="mb-2 h-4 w-24 animate-pulse rounded-sm" style={{ background: 'var(--bg-tertiary)' }} />
          <div style={{ borderTop: '1px solid var(--today-line)', borderBottom: '1px solid var(--today-line)' }}>
            {[0, 1, 2].map((row) => (
              <div key={row} className="grid grid-cols-[30px_minmax(0,1fr)] gap-4 px-1 py-3 md:grid-cols-[30px_minmax(0,1.25fr)_minmax(130px,0.7fr)_110px_146px]" style={{ borderTop: row > 0 ? '1px solid var(--today-line)' : 'none' }}>
                <div className="h-6 w-6 animate-pulse rounded-md" style={{ background: 'var(--bg-tertiary)' }} />
                <div className="h-4 animate-pulse rounded-sm" style={{ background: 'var(--bg-tertiary)' }} />
                <div className="hidden h-4 animate-pulse rounded-sm md:block" style={{ background: 'var(--bg-tertiary)' }} />
                <div className="hidden h-6 animate-pulse rounded-md md:block" style={{ background: 'var(--bg-tertiary)' }} />
                <div className="hidden h-4 animate-pulse rounded-sm md:block" style={{ background: 'var(--bg-tertiary)' }} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
