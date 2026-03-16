import { Search, Filter, X } from 'lucide-react';
import type { ManagerDeskItem } from '@/types/manager-desk';
import { QuickCapture } from './QuickCapture';
import type { ManagerDeskFilterState, ManagerDeskQuickFilter } from './workbench-utils';
import { getQuickFilterCount } from './workbench-utils';

const quickFilters: Array<{ key: ManagerDeskQuickFilter; label: string }> = [
  { key: 'all', label: 'All Open' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'waiting', label: 'Waiting' },
  { key: 'inbox', label: 'Inbox' },
  { key: 'meetings', label: 'Meetings' },
  { key: 'highPriority', label: 'High Priority' },
  { key: 'unassigned', label: 'Unassigned' },
];

interface Props {
  items: ManagerDeskItem[];
  searchQuery: string;
  quickFilter: ManagerDeskQuickFilter;
  filters: ManagerDeskFilterState;
  showFilters: boolean;
  isCreatePending: boolean;
  onSearchChange: (value: string) => void;
  onQuickFilterChange: (value: ManagerDeskQuickFilter) => void;
  onToggleFilters: () => void;
  onClearSearch: () => void;
  onClearFilters: () => void;
  onChangeFilters: (value: ManagerDeskFilterState) => void;
  onCapture: Parameters<typeof QuickCapture>[0]['onCapture'];
}

export function ManagerDeskCommandBar({
  items,
  searchQuery,
  quickFilter,
  filters,
  showFilters,
  isCreatePending,
  onSearchChange,
  onQuickFilterChange,
  onToggleFilters,
  onClearSearch,
  onClearFilters,
  onChangeFilters,
  onCapture,
}: Props) {
  const hasStructuredFilters = filters.kind !== null || filters.category !== null || filters.status !== null;

  return (
    <div className="sticky top-[52px] z-10 px-2 pt-2 md:px-3">
      <div className="md-glass-panel rounded-xl p-2">
        <div className="flex gap-2 items-stretch">
          <div className="flex-1 min-w-0">
            <QuickCapture onCapture={onCapture} isPending={isCreatePending} />
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border px-2 py-1" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
            <Search size={12} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search…"
              className="w-[120px] lg:w-[180px] bg-transparent text-[11px] outline-none placeholder:text-[10px]"
              style={{ color: 'var(--text-primary)' }}
              aria-label="Search manager desk tasks"
            />
            {searchQuery && (
              <button type="button" onClick={onClearSearch} aria-label="Clear task search" style={{ color: 'var(--text-muted)' }}>
                <X size={12} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onToggleFilters}
            className="flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]"
            style={{
              background: hasStructuredFilters ? 'var(--md-accent-glow)' : 'var(--bg-secondary)',
              borderColor: hasStructuredFilters ? 'var(--md-accent)' : 'var(--border)',
              color: hasStructuredFilters ? 'var(--md-accent)' : 'var(--text-secondary)',
            }}
          >
            <Filter size={10} />
            <span className="hidden sm:inline">{hasStructuredFilters ? 'Filtered' : 'Filters'}</span>
          </button>
        </div>

        <div className="mt-1.5 flex flex-wrap gap-1">
          {quickFilters.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => onQuickFilterChange(key)}
              className="flex items-center gap-1 rounded-md border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] transition-colors"
              style={{
                background: quickFilter === key ? 'var(--md-accent-glow)' : 'var(--bg-primary)',
                borderColor: quickFilter === key ? 'var(--md-accent)' : 'var(--border)',
                color: quickFilter === key ? 'var(--md-accent)' : 'var(--text-secondary)',
              }}
            >
              <span>{label}</span>
              <span className="tabular-nums" style={{ opacity: 0.7 }}>
                {getQuickFilterCount(items, key)}
              </span>
            </button>
          ))}
        </div>

        {showFilters && (
          <StructuredFilters filters={filters} onChange={onChangeFilters} onClear={onClearFilters} />
        )}
      </div>
    </div>
  );
}

function StructuredFilters({
  filters,
  onChange,
  onClear,
}: {
  filters: ManagerDeskFilterState;
  onChange: (value: ManagerDeskFilterState) => void;
  onClear: () => void;
}) {
  return (
    <div className="mt-2 grid gap-1.5 rounded-lg border p-2 md:grid-cols-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)' }}>
      <SelectControl
        label="Kind"
        value={filters.kind ?? ''}
        onChange={(value) => onChange({ ...filters, kind: (value || null) as ManagerDeskFilterState['kind'] })}
        options={['action', 'meeting', 'decision', 'waiting']}
      />
      <SelectControl
        label="Category"
        value={filters.category ?? ''}
        onChange={(value) => onChange({ ...filters, category: (value || null) as ManagerDeskFilterState['category'] })}
        options={['analysis', 'design', 'team_management', 'cross_team', 'follow_up', 'escalation', 'admin', 'planning', 'other']}
      />
      <SelectControl
        label="Status"
        value={filters.status ?? ''}
        onChange={(value) => onChange({ ...filters, status: (value || null) as ManagerDeskFilterState['status'] })}
        options={['inbox', 'planned', 'in_progress', 'waiting', 'done', 'cancelled']}
      />
      <button
        type="button"
        onClick={onClear}
        className="self-end rounded-lg border px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em]"
        style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
      >
        Clear
      </button>
    </div>
  );
}

function SelectControl({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-0.5 text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border px-2 py-1.5 text-[11px] font-medium outline-none"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replace(/_/g, ' ')}
          </option>
        ))}
      </select>
    </label>
  );
}
