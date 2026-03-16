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
    <div className="sticky top-[92px] z-10 px-3 pt-3 md:top-[100px] md:px-4">
      <div className="md-glass-panel rounded-[20px] p-3">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <QuickCapture onCapture={onCapture} isPending={isCreatePending} />

          <div className="rounded-[16px] border p-2.5" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
            <div className="flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)' }}>
              <Search size={14} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Find by title, assignee, next action, links, or notes"
                className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[12px]"
                style={{ color: 'var(--text-primary)' }}
                aria-label="Search manager desk tasks"
              />
              {searchQuery && (
                <button type="button" onClick={onClearSearch} aria-label="Clear task search" style={{ color: 'var(--text-muted)' }}>
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              {quickFilters.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onQuickFilterChange(key)}
                  className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors"
                  style={{
                    background: quickFilter === key ? 'var(--md-accent-glow)' : 'var(--bg-primary)',
                    borderColor: quickFilter === key ? 'var(--md-accent)' : 'var(--border)',
                    color: quickFilter === key ? 'var(--md-accent)' : 'var(--text-secondary)',
                  }}
                >
                  <span>{label}</span>
                  <span className="rounded-full px-1.5 py-0.5 text-[10px]" style={{ background: 'rgba(15,23,42,0.08)', color: 'inherit' }}>
                    {getQuickFilterCount(items, key)}
                  </span>
                </button>
              ))}

              <button
                type="button"
                onClick={onToggleFilters}
                className="ml-auto flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]"
                style={{
                  background: hasStructuredFilters ? 'var(--md-accent-glow)' : 'var(--bg-primary)',
                  borderColor: hasStructuredFilters ? 'var(--md-accent)' : 'var(--border)',
                  color: hasStructuredFilters ? 'var(--md-accent)' : 'var(--text-secondary)',
                }}
              >
                <Filter size={12} />
                {hasStructuredFilters ? 'Filtered' : 'More Filters'}
              </button>
            </div>

            {showFilters && (
              <StructuredFilters filters={filters} onChange={onChangeFilters} onClear={onClearFilters} />
            )}
          </div>
        </div>
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
    <div className="mt-3 grid gap-2 rounded-2xl border p-3 md:grid-cols-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)' }}>
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
        className="rounded-xl border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em]"
        style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
      >
        Clear Filters
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
    <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border px-3 py-2 text-[12px] font-medium outline-none"
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
