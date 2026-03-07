import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertOctagon,
  AlertTriangle,
  CalendarClock,
  CalendarX2,
  ChevronRight,
  Filter,
  Flame,
  PanelLeftClose,
  PanelLeftOpen,
  Tag,
  UserRound,
  UserX,
  Users,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { FilterButton } from './FilterButton';
import { TagFilterSection } from './TagFilterSection';
import { FILTER_KEYS, FILTER_LABELS } from '@/lib/constants';
import { useOverview } from '@/hooks/useOverview';
import { useWorkload } from '@/hooks/useWorkload';
import { useTags } from '@/hooks/useTags';
import { useTagCounts } from '@/hooks/useTagCounts';
import type { FilterType, OverviewCounts } from '@/types';

interface FilterSidebarProps {
  activeFilter: FilterType;
  activeDeveloper?: string;
  onFilterChange: (filter: FilterType) => void;
  onDeveloperChange: (accountId?: string) => void;
  selectedTagId?: number;
  noTagsFilter: boolean;
  onTagToggle: (tagId: number) => void;
  onNoTagsToggle: () => void;
  onClearTagFilters: () => void;
  collapsed: boolean;
  isMobile: boolean;
  open: boolean;
  onClose: () => void;
  onCollapse: () => void;
  onExpand: () => void;
}

const FILTER_COUNT_MAP: Record<string, keyof OverviewCounts> = {
  unassigned: 'unassigned',
  outOfTeam: 'outOfTeam',
  dueThisWeek: 'dueThisWeek',
  noDueDate: 'noDueDate',
  overdue: 'overdue',
  blocked: 'blocked',
  stale: 'stale',
  highPriority: 'highPriority',
};

const FILTER_ICON_MAP: Record<FilterType, LucideIcon> = {
  all: Filter,
  new: Filter,
  inProgress: Filter,
  reopened: Filter,
  unassigned: UserX,
  dueToday: CalendarClock,
  dueThisWeek: CalendarClock,
  noDueDate: CalendarX2,
  overdue: AlertTriangle,
  blocked: AlertOctagon,
  stale: CalendarClock,
  highPriority: Flame,
  outOfTeam: Users,
};

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

interface SectionProps {
  title: string;
  description: string;
  countLabel: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

function SidebarSection({ title, description, countLabel, open, onToggle, children }: SectionProps) {
  return (
    <section
      className="rounded-[20px] border p-1.5"
      style={{
        borderColor: 'var(--border)',
        background: 'color-mix(in srgb, var(--bg-secondary) 72%, transparent)',
      }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-1.5 py-1 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
            {title}
          </div>
          <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            {description}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className="text-[10px] font-mono px-2 py-1 rounded-full"
            style={{ color: 'var(--text-muted)', background: 'var(--bg-tertiary)' }}
          >
            {countLabel}
          </span>
          <ChevronRight
            size={14}
            className="transition-transform duration-200"
            style={{
              color: 'var(--text-muted)',
              transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
          />
        </div>
      </button>
      {open && <div className="pt-1.5">{children}</div>}
    </section>
  );
}

export function FilterSidebar({
  activeFilter,
  activeDeveloper,
  onFilterChange,
  onDeveloperChange,
  selectedTagId,
  noTagsFilter,
  onTagToggle,
  onNoTagsToggle,
  onClearTagFilters,
  collapsed,
  isMobile,
  open,
  onClose,
  onCollapse,
  onExpand,
}: FilterSidebarProps) {
  const { data: overview } = useOverview();
  const { data: workload } = useWorkload();
  const { data: tags } = useTags();
  const { data: tagCounts } = useTagCounts(activeFilter, activeDeveloper);

  const [filtersOpen, setFiltersOpen] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(true);
  const [developersOpen, setDevelopersOpen] = useState(true);

  function getCount(key: FilterType): number {
    if (!overview) return 0;
    if (key === 'all') return overview.total;
    const mappedKey = FILTER_COUNT_MAP[key];
    if (mappedKey) return overview[mappedKey] as number;
    return overview.total;
  }

  const activeSelectionCount =
    Number(activeFilter !== 'all') +
    Number(Boolean(activeDeveloper)) +
    Number(selectedTagId !== undefined || noTagsFilter);

  const renderExpandedPanel = (mobile: boolean) => (
    <div className="h-full p-2">
      <div
        className="h-full rounded-[24px] border overflow-hidden flex flex-col shadow-[0_24px_64px_rgba(0,0,0,0.28)]"
        style={{
          borderColor: 'var(--border)',
          background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-secondary) 96%, white 4%) 0%, color-mix(in srgb, var(--bg-primary) 88%, var(--bg-secondary) 12%) 100%)',
        }}
      >
        <div className="px-3 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
                Focus Panel
              </div>
              <h2 className="mt-1 text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                Refine the queue
              </h2>
              <p className="mt-1 text-[11px] leading-4" style={{ color: 'var(--text-secondary)' }}>
                Filter by risk view, tag clusters, or ownership without crowding the table.
              </p>
            </div>
            <button
              onClick={mobile ? onClose : onCollapse}
              className="h-9 w-9 rounded-xl flex items-center justify-center transition-colors"
              style={{ background: 'var(--bg-tertiary)' }}
              title={mobile ? 'Close sidebar' : 'Collapse sidebar'}
              aria-label={mobile ? 'Close sidebar' : 'Collapse sidebar'}
            >
              {mobile ? (
                <X size={16} style={{ color: 'var(--text-secondary)' }} />
              ) : (
                <PanelLeftClose size={16} style={{ color: 'var(--text-secondary)' }} />
              )}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5 mt-3">
            <div className="rounded-[16px] px-2.5 py-2" style={{ background: 'var(--bg-tertiary)' }}>
              <div className="text-[10px] uppercase font-semibold" style={{ letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                Views
              </div>
              <div className="mt-0.5 text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                {FILTER_KEYS.length}
              </div>
            </div>
            <div className="rounded-[16px] px-2.5 py-2" style={{ background: 'var(--bg-tertiary)' }}>
              <div className="text-[10px] uppercase font-semibold" style={{ letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                Tags
              </div>
              <div className="mt-0.5 text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                {tags?.length ?? 0}
              </div>
            </div>
            <div className="rounded-[16px] px-2.5 py-2" style={{ background: 'var(--bg-tertiary)' }}>
              <div className="text-[10px] uppercase font-semibold" style={{ letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                Active
              </div>
              <div className="mt-0.5 text-[13px] font-semibold" style={{ color: activeSelectionCount > 0 ? 'var(--accent)' : 'var(--text-primary)' }}>
                {activeSelectionCount}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2">
          <SidebarSection
            title="Filters"
            description="Saved views for the queue"
            countLabel={`${FILTER_KEYS.length}`}
            open={filtersOpen}
            onToggle={() => setFiltersOpen((prev) => !prev)}
          >
            <div className="flex flex-col gap-1">
              <FilterButton
                label={FILTER_LABELS.all}
                count={getCount('all')}
                isActive={activeFilter === 'all' && !activeDeveloper}
                onClick={() => {
                  onDeveloperChange(undefined);
                  onFilterChange('all');
                }}
                shortcut="0"
                icon={<Filter size={15} />}
              />
              {FILTER_KEYS.map((key, index) => {
                const Icon = FILTER_ICON_MAP[key];
                return (
                  <FilterButton
                    key={key}
                    label={FILTER_LABELS[key] ?? key}
                    count={getCount(key)}
                    isActive={activeFilter === key && !activeDeveloper}
                    onClick={() => {
                      onDeveloperChange(undefined);
                      onFilterChange(key);
                    }}
                    shortcut={index <= 6 ? `${index + 1}` : undefined}
                    icon={<Icon size={15} />}
                  />
                );
              })}
            </div>
          </SidebarSection>

          <TagFilterSection
            tags={tags ?? []}
            tagCounts={tagCounts}
            selectedTagId={selectedTagId}
            noTagsFilter={noTagsFilter}
            onTagToggle={onTagToggle}
            onNoTagsToggle={onNoTagsToggle}
            onClear={onClearTagFilters}
            collapsed={!tagsOpen}
            onToggleCollapse={() => setTagsOpen((prev) => !prev)}
          />

          {workload && workload.length > 0 && (
            <SidebarSection
              title="Developers"
              description="Ownership and load"
              countLabel={`${workload.length}`}
              open={developersOpen}
              onToggle={() => setDevelopersOpen((prev) => !prev)}
            >
              <div className="flex flex-col gap-1">
                {workload.map((dev) => (
                  <FilterButton
                    key={dev.developer.accountId}
                    label={dev.developer.displayName}
                    count={dev.activeDefects}
                    isActive={activeDeveloper === dev.developer.accountId}
                    onClick={() => {
                      if (activeDeveloper === dev.developer.accountId) {
                        onDeveloperChange(undefined);
                      } else {
                        onDeveloperChange(dev.developer.accountId);
                      }
                    }}
                    isIdle={dev.activeDefects === 0}
                    icon={<span className="text-[11px] font-semibold">{getInitials(dev.developer.displayName)}</span>}
                  />
                ))}
              </div>
            </SidebarSection>
          )}
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <AnimatePresence>
        {open && (
          <div className="absolute inset-0 z-30 lg:hidden">
            <motion.button
              type="button"
              aria-label="Close sidebar overlay"
              className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: -24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -24, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.2, 0.9, 0.2, 1] }}
              className="absolute inset-y-0 left-0 w-[min(88vw,320px)]"
            >
              {renderExpandedPanel(true)}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 88 : 286 }}
      transition={{ duration: 0.24, ease: [0.2, 0.9, 0.2, 1] }}
      className="relative shrink-0 overflow-hidden border-r"
      style={{ borderColor: 'var(--border)' }}
    >
      {collapsed ? (
        <div className="h-full p-2">
          <div
            className="h-full rounded-[24px] border flex flex-col items-center justify-between px-2 py-2.5"
            style={{
              borderColor: 'var(--border)',
              background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-secondary) 94%, white 6%) 0%, color-mix(in srgb, var(--bg-primary) 90%, var(--bg-secondary) 10%) 100%)',
            }}
          >
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={onExpand}
                className="h-10 w-10 rounded-2xl flex items-center justify-center transition-colors"
                style={{ background: 'var(--bg-tertiary)' }}
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen size={16} style={{ color: 'var(--text-secondary)' }} />
              </button>

              <div className="w-8 h-px" style={{ background: 'var(--border)' }} />

              <button
                onClick={() => {
                  setFiltersOpen(true);
                  onExpand();
                }}
                className="relative h-10 w-10 rounded-2xl flex items-center justify-center transition-colors"
                style={{ background: activeFilter !== 'all' ? 'var(--accent-glow)' : 'var(--bg-tertiary)' }}
                title="Expand filters"
                aria-label="Expand filters"
              >
                <Filter size={16} style={{ color: activeFilter !== 'all' ? 'var(--accent)' : 'var(--text-secondary)' }} />
              </button>

              <button
                onClick={() => {
                  setTagsOpen(true);
                  onExpand();
                }}
                className="h-10 w-10 rounded-2xl flex items-center justify-center transition-colors"
                style={{ background: selectedTagId !== undefined || noTagsFilter ? 'var(--accent-glow)' : 'var(--bg-tertiary)' }}
                title="Expand tags"
                aria-label="Expand tags"
              >
                <Tag size={16} style={{ color: selectedTagId !== undefined || noTagsFilter ? 'var(--accent)' : 'var(--text-secondary)' }} />
              </button>

              <button
                onClick={() => {
                  setDevelopersOpen(true);
                  onExpand();
                }}
                className="h-10 w-10 rounded-2xl flex items-center justify-center transition-colors"
                style={{ background: activeDeveloper ? 'var(--accent-glow)' : 'var(--bg-tertiary)' }}
                title="Expand developers"
                aria-label="Expand developers"
              >
                <UserRound size={16} style={{ color: activeDeveloper ? 'var(--accent)' : 'var(--text-secondary)' }} />
              </button>
            </div>

            <div className="flex flex-col items-center gap-2">
              <div
                className="min-w-[40px] rounded-full px-2 py-1 text-center text-[10px] font-mono"
                style={{
                  background: activeSelectionCount > 0 ? 'var(--accent-glow)' : 'var(--bg-tertiary)',
                  color: activeSelectionCount > 0 ? 'var(--accent)' : 'var(--text-muted)',
                }}
              >
                {activeSelectionCount}
              </div>
              <div className="text-[10px] uppercase" style={{ letterSpacing: '0.12em', color: 'var(--text-muted)' }}>
                Focus
              </div>
            </div>
          </div>
        </div>
      ) : (
        renderExpandedPanel(false)
      )}
    </motion.aside>
  );
}
