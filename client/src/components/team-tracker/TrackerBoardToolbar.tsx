import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, ArrowUpDown, Layers, X } from 'lucide-react';
import type { TeamTrackerBoardSort, TeamTrackerBoardGroupBy } from '@/types';
import { TrackerDropdownMenu } from './TrackerDropdownMenu';
import { SavedViewsMenu } from './SavedViewsMenu';
import type { SavedViewsMenuProps } from './SavedViewsMenu';

interface TrackerBoardToolbarProps extends SavedViewsMenuProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortBy: TeamTrackerBoardSort;
  onSortChange: (sort: TeamTrackerBoardSort) => void;
  groupBy: TeamTrackerBoardGroupBy;
  onGroupChange: (group: TeamTrackerBoardGroupBy) => void;
  visibleCount: number;
  totalCount: number;
}

const sortOptions: Array<{ value: TeamTrackerBoardSort; label: string }> = [
  { value: 'name', label: 'Name' },
  { value: 'attention', label: 'Attention' },
  { value: 'stale_age', label: 'Stale age' },
  { value: 'load', label: 'Workload' },
  { value: 'blocked_first', label: 'Blocked first' },
];

const groupOptions: Array<{ value: TeamTrackerBoardGroupBy; label: string }> = [
  { value: 'none', label: 'No grouping' },
  { value: 'status', label: 'By status' },
  { value: 'attention_state', label: 'By attention' },
];

export function TrackerBoardToolbar({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  groupBy,
  onGroupChange,
  visibleCount,
  totalCount,
  ...savedViewProps
}: TrackerBoardToolbarProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const handleSearchInput = useCallback((value: string) => {
    setLocalSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearchChange(value), 300);
  }, [onSearchChange]);

  const clearSearch = useCallback(() => {
    setLocalSearch('');
    onSearchChange('');
    inputRef.current?.focus();
  }, [onSearchChange]);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const isFiltered = visibleCount < totalCount;
  const currentSort = sortOptions.find((o) => o.value === sortBy);
  const currentGroup = groupOptions.find((o) => o.value === groupBy);
  const isSortNonDefault = sortBy !== 'name';
  const isGroupActive = groupBy !== 'none';

  return (
    <div className="flex items-center gap-2 flex-wrap py-1.5">
      <SearchInput
        ref={inputRef}
        value={localSearch}
        onChange={handleSearchInput}
        onClear={clearSearch}
      />

      <div className="flex items-center gap-1.5 ml-auto">
        {isFiltered && (
          <span
            className="text-[11px] font-mono font-medium px-2 py-1 rounded-lg"
            style={{ color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
          >
            {visibleCount}/{totalCount}
          </span>
        )}

        <TrackerDropdownMenu
          activeValue={sortBy}
          items={sortOptions}
          onSelect={(v) => onSortChange(v as TeamTrackerBoardSort)}
          trigger={
            <ToolbarButton label={currentSort?.label ?? 'Sort'} icon={<ArrowUpDown size={12} />} active={isSortNonDefault} />
          }
        />

        <TrackerDropdownMenu
          activeValue={groupBy}
          items={groupOptions}
          onSelect={(v) => onGroupChange(v as TeamTrackerBoardGroupBy)}
          trigger={
            <ToolbarButton label={currentGroup?.label ?? 'Group'} icon={<Layers size={12} />} active={isGroupActive} />
          }
        />

        <SavedViewsMenu {...savedViewProps} />
      </div>
    </div>
  );
}

import { forwardRef } from 'react';

const SearchInput = forwardRef<HTMLInputElement, {
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
}>(({ value, onChange, onClear }, ref) => (
  <div
    className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 flex-1 min-w-[200px] max-w-[360px]"
    style={{
      background: 'var(--bg-tertiary)',
      border: `1px solid ${value ? 'var(--accent)' : 'var(--border)'}`,
    }}
  >
    <Search size={13} className="shrink-0" style={{ color: value ? 'var(--accent)' : 'var(--text-muted)' }} />
    <input
      ref={ref}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Search developers, tasks, Jira keys…"
      maxLength={200}
      className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-[var(--text-muted)]"
      style={{ color: 'var(--text-primary)' }}
    />
    {value && (
      <button
        onClick={onClear}
        className="shrink-0 rounded-md p-0.5 transition-colors hover:brightness-125"
        style={{ color: 'var(--text-muted)' }}
        aria-label="Clear search"
      >
        <X size={12} />
      </button>
    )}
  </div>
));
SearchInput.displayName = 'SearchInput';

function ToolbarButton({ label, icon, active }: { label: string; icon: React.ReactNode; active: boolean }) {
  return (
    <button
      className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-medium transition-all shrink-0"
      style={{
        background: active ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'var(--bg-tertiary)',
        border: `1px solid ${active ? 'color-mix(in srgb, var(--accent) 30%, transparent)' : 'var(--border)'}`,
        color: active ? 'var(--accent)' : 'var(--text-secondary)',
      }}
    >
      {icon}
      {label}
    </button>
  );
}

