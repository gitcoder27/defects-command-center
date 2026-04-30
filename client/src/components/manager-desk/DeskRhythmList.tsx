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
  const visibleSections = sections.filter((section) => section.items.length > 0 || !section.quiet);
  const title = viewMode === 'planning' ? 'Scheduled work' : viewMode === 'history' ? 'Desk snapshot' : 'Today';
  const subtitle = viewMode === 'planning'
    ? 'Future work grouped by the decisions a manager needs to make.'
    : viewMode === 'history'
    ? 'A read-only record of how the desk looked for this date.'
    : 'Start with Now, clear triage, then work the plan.';

  return (
    <section className="md-glass-panel flex min-h-full flex-col overflow-hidden rounded-xl">
      <DeskRhythmHeader
        title={title}
        subtitle={subtitle}
        count={items.length}
        continuedOpenCount={continuedOpenCount}
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {items.length === 0 ? (
          <UnifiedEmptyState quickFilter="all" message="No desk work matches this view." />
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {visibleSections.map((section) => (
              <DeskRhythmSectionView
                key={section.key}
                section={section}
                selectedItemId={selectedItemId}
                readOnly={readOnly}
                onSelect={onSelect}
                onStatusChange={onStatusChange}
              />
            ))}
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
    return (
      <details className="group py-2" open={section.defaultOpen}>
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
          <SectionTitle section={section} />
        </summary>
        <SectionItems section={section} selectedItemId={selectedItemId} readOnly={readOnly} onSelect={onSelect} onStatusChange={onStatusChange} />
      </details>
    );
  }

  return (
    <section className="py-2.5">
      <div className="px-2 pb-1.5">
        <SectionTitle section={section} />
      </div>
      {section.items.length === 0 ? (
        <div className="mx-1 rounded-lg border border-dashed px-3 py-4 text-[11px]" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          Clear.
        </div>
      ) : (
        <SectionItems section={section} selectedItemId={selectedItemId} readOnly={readOnly} onSelect={onSelect} onStatusChange={onStatusChange} />
      )}
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
    <div className="mt-1.5 space-y-1.5 px-1">
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

function buildDeskRhythmSections(items: ManagerDeskItem[]): DeskRhythmSection[] {
  return [
    { key: 'now', title: 'Now', subtitle: 'Work already in motion.', icon: <Play size={12} />, items: items.filter((item) => item.status === 'in_progress') },
    { key: 'triage', title: 'Needs triage', subtitle: 'Fresh captures waiting for a decision.', icon: <Inbox size={12} />, items: items.filter((item) => item.status === 'inbox') },
    { key: 'planned', title: 'Planned', subtitle: 'Committed work that has not started yet.', icon: <ListChecks size={12} />, items: items.filter((item) => item.status === 'planned') },
    { key: 'waiting', title: 'Waiting', subtitle: 'Follow-ups blocked by another person or signal.', icon: <Pause size={12} />, items: items.filter((item) => item.status === 'waiting') },
    { key: 'later', title: 'Later', subtitle: 'Parked work, kept out of the active plan.', icon: <Archive size={12} />, items: items.filter((item) => item.status === 'backlog'), quiet: true },
    { key: 'done', title: 'Done', subtitle: 'Closed work for this date.', icon: <CheckCircle2 size={12} />, items: items.filter((item) => item.status === 'done' || item.status === 'cancelled'), quiet: true },
  ];
}
