import { Archive, CheckCircle2, Inbox, ListChecks, Pause, Play } from 'lucide-react';
import type { ManagerDeskItem, ManagerDeskStatus } from '@/types/manager-desk';
import { UnifiedEmptyState } from './UnifiedDeskListPrimitives';
import {
  DeskCardRow,
  DeskRhythmHeader,
  SectionTitle,
  type DeskRhythmSection,
} from './DeskRhythmListPrimitives';

interface Props {
  items: ManagerDeskItem[];
  continuedOpenCount: number;
  selectedItemId: number | null;
  readOnly: boolean;
  viewMode: 'live' | 'history' | 'planning';
  onSelect: (item: ManagerDeskItem) => void;
  onStatusChange?: (itemId: number, status: ManagerDeskStatus) => void;
}

export function DeskRhythmList({
  items,
  continuedOpenCount,
  selectedItemId,
  readOnly,
  viewMode,
  onSelect,
  onStatusChange,
}: Props) {
  const sections = buildDeskRhythmSections(items);
  const activeSections = sections.filter((section) => !section.quiet && section.items.length > 0);
  const quietSections = sections.filter((section) => section.quiet);
  const title = viewMode === 'planning' ? 'Scheduled work' : viewMode === 'history' ? 'Desk snapshot' : 'Today';
  const subtitle = viewMode === 'planning'
    ? 'Future work grouped by the decisions that need attention.'
    : viewMode === 'history'
    ? 'A read-only record of how the desk looked for this date.'
    : 'Act on what is moving, clear new captures, then work the plan.';
  const metrics = [
    { label: 'Now', value: sections.find((section) => section.key === 'now')?.items.length ?? 0, tone: 'active' as const },
    { label: 'Triage', value: sections.find((section) => section.key === 'triage')?.items.length ?? 0, tone: 'decision' as const },
    { label: 'Planned', value: sections.find((section) => section.key === 'planned')?.items.length ?? 0, tone: 'calm' as const },
  ];

  return (
    <section
      className="flex min-h-full flex-col overflow-hidden rounded-xl border"
      style={{
        background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-primary) 92%, transparent), color-mix(in srgb, var(--bg-primary) 98%, transparent))',
        borderColor: 'color-mix(in srgb, var(--border) 82%, transparent)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.025)',
      }}
    >
      <DeskRhythmHeader
        title={title}
        subtitle={subtitle}
        count={items.length}
        continuedOpenCount={continuedOpenCount}
        metrics={metrics}
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 md:px-4">
        {items.length === 0 ? (
          <UnifiedEmptyState quickFilter="all" message="No desk work matches this view." />
        ) : (
          <div className="space-y-5">
            {activeSections.map((section) => (
              <DeskRhythmSectionView
                key={section.key}
                section={section}
                selectedItemId={selectedItemId}
                readOnly={readOnly}
                onSelect={onSelect}
                onStatusChange={onStatusChange}
              />
            ))}
            <QuietDeskStrip sections={quietSections} />
          </div>
        )}
      </div>
    </section>
  );
}

function DeskRhythmSectionView({
  section,
  selectedItemId,
  readOnly,
  onSelect,
  onStatusChange,
}: {
  section: DeskRhythmSection;
  selectedItemId: number | null;
  readOnly: boolean;
  onSelect: (item: ManagerDeskItem) => void;
  onStatusChange?: (itemId: number, status: ManagerDeskStatus) => void;
}) {
  if (section.quiet) {
    return null;
  }

  return (
    <section>
      <div className="pb-2">
        <SectionTitle section={section} />
      </div>
      <SectionItems section={section} selectedItemId={selectedItemId} readOnly={readOnly} onSelect={onSelect} onStatusChange={onStatusChange} />
    </section>
  );
}

function SectionItems({
  section,
  selectedItemId,
  readOnly,
  onSelect,
  onStatusChange,
}: {
  section: DeskRhythmSection;
  selectedItemId: number | null;
  readOnly: boolean;
  onSelect: (item: ManagerDeskItem) => void;
  onStatusChange?: (itemId: number, status: ManagerDeskStatus) => void;
}) {
  return (
    <div className={section.tone === 'active' ? 'space-y-2' : 'space-y-1.5'}>
      {section.items.map((item) => (
        <DeskCardRow
          key={item.id}
          item={item}
          selected={item.id === selectedItemId}
          readOnly={readOnly}
          onSelect={onSelect}
          onStatusChange={onStatusChange}
        />
      ))}
    </div>
  );
}

function QuietDeskStrip({ sections }: { sections: DeskRhythmSection[] }) {
  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2"
      style={{
        background: 'color-mix(in srgb, var(--bg-secondary) 42%, transparent)',
        borderColor: 'color-mix(in srgb, var(--border) 72%, transparent)',
        color: 'var(--text-muted)',
      }}
    >
      {sections.map((section) => (
        <span
          key={section.key}
          className="inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-[10px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: section.items.length > 0 ? 'var(--text-secondary)' : 'var(--text-muted)' }}
        >
          {section.icon}
          <span>{section.title}</span>
          <span className="font-mono tabular-nums">{section.items.length}</span>
        </span>
      ))}
    </div>
  );
}

function buildDeskRhythmSections(items: ManagerDeskItem[]): DeskRhythmSection[] {
  return [
    { key: 'now', title: 'Now', subtitle: 'The work already in motion.', icon: <Play size={12} />, items: items.filter((item) => item.status === 'in_progress'), tone: 'active' },
    { key: 'triage', title: 'Needs triage', subtitle: 'Fresh captures waiting for a decision.', icon: <Inbox size={12} />, items: items.filter((item) => item.status === 'inbox'), tone: 'decision' },
    { key: 'planned', title: 'Planned', subtitle: 'Committed work that has not started yet.', icon: <ListChecks size={12} />, items: items.filter((item) => item.status === 'planned'), tone: 'calm' },
    { key: 'waiting', title: 'Waiting', subtitle: 'Blocked follow-ups being watched.', icon: <Pause size={12} />, items: items.filter((item) => item.status === 'waiting'), tone: 'quiet' },
    { key: 'later', title: 'Later', subtitle: 'Parked work, kept out of the active plan.', icon: <Archive size={12} />, items: items.filter((item) => item.status === 'backlog'), tone: 'quiet', quiet: true },
    { key: 'done', title: 'Done', subtitle: 'Closed work for this date.', icon: <CheckCircle2 size={12} />, items: items.filter((item) => item.status === 'done' || item.status === 'cancelled'), tone: 'quiet', quiet: true },
  ];
}
