import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
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
}

const FILTER_COUNT_MAP: Record<string, keyof OverviewCounts> = {
  unassigned: 'unassigned',
  outOfTeam: 'outOfTeam',
  dueToday: 'dueToday',
  dueThisWeek: 'dueThisWeek',
  overdue: 'overdue',
  blocked: 'blocked',
  stale: 'stale',
  highPriority: 'highPriority',
};

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
}: FilterSidebarProps) {
  const { data: overview } = useOverview();
  const { data: workload } = useWorkload();
  const { data: tags } = useTags();
  const { data: tagCounts } = useTagCounts(activeFilter, activeDeveloper);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [developersOpen, setDevelopersOpen] = useState(true);

  function getCount(key: FilterType): number {
    if (!overview) return 0;
    if (key === 'all') return overview.total;
    const mappedKey = FILTER_COUNT_MAP[key];
    if (mappedKey) return overview[mappedKey] as number;
    // For filters without a direct mapping, return total as fallback
    return overview.total;
  }

  return (
    <motion.aside
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.35 }}
      className="w-[200px] min-w-[200px] flex flex-col border-r overflow-y-auto py-3 px-2"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
    >
      <button
        onClick={() => setFiltersOpen((p) => !p)}
        className="flex items-center gap-1 px-3 mb-2 cursor-pointer group"
      >
        <ChevronRight
          size={12}
          className="transition-transform duration-150"
          style={{
            color: 'var(--text-muted)',
            transform: filtersOpen ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        />
        <span
          className="text-[11px] font-semibold uppercase"
          style={{ letterSpacing: '0.06em', color: 'var(--text-muted)' }}
        >
          Filters
        </span>
      </button>

      {filtersOpen && (
        <div className="flex flex-col gap-0.5">
          {FILTER_KEYS.map((key, i) => (
            <FilterButton
              key={key}
              label={FILTER_LABELS[key] ?? key}
              count={getCount(key)}
              isActive={activeFilter === key && !activeDeveloper}
              onClick={() => {
                onDeveloperChange(undefined);
                onFilterChange(key);
              }}
              shortcut={i === 0 ? '0' : i <= 7 ? `${i}` : undefined}
            />
          ))}
        </div>
      )}

      <TagFilterSection
        tags={tags ?? []}
        tagCounts={tagCounts}
        selectedTagId={selectedTagId}
        noTagsFilter={noTagsFilter}
        onTagToggle={onTagToggle}
        onNoTagsToggle={onNoTagsToggle}
        onClear={onClearTagFilters}
        collapsed={!tagsOpen}
        onToggleCollapse={() => setTagsOpen((p) => !p)}
      />

      {workload && workload.length > 0 && (
        <>
          <button
            onClick={() => setDevelopersOpen((p) => !p)}
            className="flex items-center gap-1 px-3 mt-4 mb-2 cursor-pointer group"
          >
            <ChevronRight
              size={12}
              className="transition-transform duration-150"
              style={{
                color: 'var(--text-muted)',
                transform: developersOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              }}
            />
            <span
              className="text-[11px] font-semibold uppercase"
              style={{ letterSpacing: '0.06em', color: 'var(--text-muted)' }}
            >
              Developers
            </span>
          </button>
          {developersOpen && (
            <div className="flex flex-col gap-0.5">
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
                />
              ))}
            </div>
          )}
        </>
      )}
    </motion.aside>
  );
}
