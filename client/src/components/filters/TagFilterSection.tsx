import { ChevronRight, X } from 'lucide-react';
import type { LocalTag, TagCountsResponse } from '@/types';

interface TagFilterSectionProps {
  tags: LocalTag[];
  tagCounts: TagCountsResponse | undefined;
  selectedTagId?: number;
  noTagsFilter: boolean;
  onTagToggle: (tagId: number) => void;
  onNoTagsToggle: () => void;
  onClear: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function TagFilterSection({
  tags,
  tagCounts,
  selectedTagId,
  noTagsFilter,
  onTagToggle,
  onNoTagsToggle,
  onClear,
  collapsed,
  onToggleCollapse,
}: TagFilterSectionProps) {
  const hasActiveFilters = selectedTagId !== undefined || noTagsFilter;

  const sortedTags = [...tags].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );

  function getTagCount(tagId: number): number {
    if (!tagCounts) return 0;
    const entry = tagCounts.counts.find((c) => c.tagId === tagId);
    return entry?.count ?? 0;
  }

  return (
    <>
      <div className="flex items-center justify-between px-3 mt-4 mb-2">
        <button
          onClick={onToggleCollapse}
          className="flex items-center gap-1 cursor-pointer group"
        >
          <ChevronRight
            size={12}
            className="transition-transform duration-150"
            style={{
              color: 'var(--text-muted)',
              transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)',
            }}
          />
          <span
            className="text-[11px] font-semibold uppercase"
            style={{ letterSpacing: '0.06em', color: 'var(--text-muted)' }}
          >
            Tags
          </span>
        </button>
        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            title="Clear tag filters"
          >
            <X size={12} style={{ color: 'var(--text-muted)' }} />
          </button>
        )}
      </div>

      {!collapsed && (
      <div className="flex flex-col gap-0.5">
        {sortedTags.length === 0 && !noTagsFilter && (
          <span
            className="text-[11px] px-3 py-1.5 italic"
            style={{ color: 'var(--text-muted)' }}
          >
            Assign tags in the table
          </span>
        )}

        {sortedTags.map((tag) => {
          const isActive = selectedTagId === tag.id;
          const count = getTagCount(tag.id);
          return (
            <button
              key={tag.id}
              onClick={() => onTagToggle(tag.id)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-md text-[13px] font-medium transition-all duration-150 cursor-pointer group"
              style={{
                background: isActive ? 'var(--bg-glow)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                borderLeft: isActive ? `2px solid ${tag.color}` : '2px solid transparent',
              }}
            >
              <span className="flex items-center gap-2 truncate">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: tag.color }}
                />
                <span className="truncate">{tag.name}</span>
              </span>
              <span
                className="text-[11px] font-mono tabular-nums min-w-[20px] text-center rounded-full px-1.5 py-0.5"
                style={{
                  background: isActive ? 'var(--accent-glow)' : 'var(--bg-tertiary)',
                  color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                }}
              >
                {count}
              </span>
            </button>
          );
        })}

        {/* No tags filter */}
        <button
          onClick={onNoTagsToggle}
          className="w-full flex items-center justify-between px-3 py-2 rounded-md text-[13px] font-medium transition-all duration-150 cursor-pointer group"
          style={{
            background: noTagsFilter ? 'var(--bg-glow)' : 'transparent',
            color: noTagsFilter ? 'var(--accent)' : 'var(--text-secondary)',
            borderLeft: noTagsFilter ? '2px solid var(--accent)' : '2px solid transparent',
          }}
        >
          <span className="flex items-center gap-2 truncate">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0 border"
              style={{ borderColor: 'var(--text-muted)' }}
            />
            <span className="truncate italic">No tags</span>
          </span>
          <span
            className="text-[11px] font-mono tabular-nums min-w-[20px] text-center rounded-full px-1.5 py-0.5"
            style={{
              background: noTagsFilter ? 'var(--accent-glow)' : 'var(--bg-tertiary)',
              color: noTagsFilter ? 'var(--accent)' : 'var(--text-muted)',
            }}
          >
            {tagCounts?.untaggedCount ?? 0}
          </span>
        </button>
      </div>
      )}
    </>
  );
}
