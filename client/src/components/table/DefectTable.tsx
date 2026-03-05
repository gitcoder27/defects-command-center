import { useMemo, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';
import { ArrowUpDown, Ban, Search, X } from 'lucide-react';
import { PriorityCell } from './PriorityCell';
import { StatusBadge } from './StatusBadge';
import { AssigneeCell } from './AssigneeCell';
import { DueDateCell } from './DueDateCell';
import { AnalysisStatusCell } from './AnalysisStatusCell';
import { InlineEditAssignee } from './InlineEditAssignee';
import { InlineEditDueDate } from './InlineEditDueDate';
import { InlineEditTags } from './InlineEditTags';
import { useIssues } from '@/hooks/useIssues';
import { useConfig } from '@/hooks/useConfig';
import { formatRelativeTime, isOverdue, isDueToday, isStale } from '@/lib/utils';
import type { Issue, FilterType } from '@/types';

const ASPEN_SEVERITY_ORDER: Record<string, number> = {
  '1 - Critical': 0,
  '2 - Major': 1,
  '3 - Minor': 2,
  '4 - Low': 3,
};

const columnHelper = createColumnHelper<Issue>();

function hasAnalysisNotes(issue: Issue): boolean {
  return Boolean(issue.analysisNotes?.trim());
}

interface DefectTableProps {
  filter: FilterType;
  assigneeFilter?: string;
  selectedKey?: string;
  focusedIndex: number;
  onFocusedIndexChange: (index: number) => void;
  onSelectIssue: (key: string) => void;
  hasAnimated: boolean;
}

export function DefectTable({
  filter,
  assigneeFilter,
  selectedKey,
  focusedIndex,
  onFocusedIndexChange,
  onSelectIssue,
  hasAnimated,
}: DefectTableProps) {
  const { data: issues, isLoading } = useIssues(filter, assigneeFilter);
  const { data: config } = useConfig();
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'aspenSeverity', desc: false },
    { id: 'developmentDueDate', desc: false },
  ]);
  const [editingCell, setEditingCell] = useState<{
    rowKey: string;
    column: 'assignee' | 'dueDate';
  } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const tableRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const suppressNextRowSelectRef = useRef(false);
  const [openTagEditors, setOpenTagEditors] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  const onTagEditorOpenChange = useCallback((issueKey: string, isOpen: boolean) => {
    setOpenTagEditors((prev) => {
      const alreadyOpen = prev.has(issueKey);
      if ((isOpen && alreadyOpen) || (!isOpen && !alreadyOpen)) {
        return prev;
      }
      const next = new Set(prev);
      if (isOpen) next.add(issueKey);
      else next.delete(issueKey);
      return next;
    });
  }, []);

  const handleTableMouseDownCapture = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (openTagEditors.size === 0) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      if (target.closest('[data-tag-editor-root="true"]') || target.closest('[data-tag-editor-popover="true"]')) {
        return;
      }

      suppressNextRowSelectRef.current = true;
    },
    [openTagEditors.size]
  );

  const handleTableClickCapture = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!suppressNextRowSelectRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    suppressNextRowSelectRef.current = false;
  }, []);

  // Expose issue keys for parent keyboard nav
  const rowCount = issues?.length ?? 0;

  // Auto-scroll to focused row
  useEffect(() => {
    if (focusedIndex >= 0 && tableRef.current) {
      const rows = tableRef.current.querySelectorAll('tbody tr');
      rows[focusedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex]);

  const handleCellClick = useCallback(
    (issueKey: string, column: 'assignee' | 'dueDate', e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingCell({ rowKey: issueKey, column });
    },
    []
  );

  const closeInlineEdit = useCallback(() => setEditingCell(null), []);

  const columns = useMemo(
    () => [
      columnHelper.accessor('aspenSeverity', {
        id: 'aspenSeverity',
        header: 'Sev',
        cell: (info) => <PriorityCell severity={info.getValue()} />,
        size: 40,
        sortingFn: (a, b) =>
          (ASPEN_SEVERITY_ORDER[a.original.aspenSeverity ?? ''] ?? 99) -
          (ASPEN_SEVERITY_ORDER[b.original.aspenSeverity ?? ''] ?? 99),
      }),
      columnHelper.accessor('jiraKey', {
        header: 'ID',
        cell: (info) => {
          const jiraKey = info.getValue();
          const href = config?.jiraBaseUrl
            ? `${config.jiraBaseUrl}/browse/${jiraKey}`
            : undefined;
          return href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[13px] font-medium relative group/id cursor-pointer"
              style={{ color: 'var(--accent)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {jiraKey}
              <span
                className="absolute bottom-0 left-0 w-0 h-px group-hover/id:w-full transition-all duration-200"
                style={{ background: 'var(--accent)' }}
              />
            </a>
          ) : (
            <span
              className="font-mono text-[13px] font-medium"
              style={{ color: 'var(--accent)' }}
            >
              {jiraKey}
            </span>
          );
        },
        size: 100,
      }),
      columnHelper.accessor('summary', {
        header: 'Title',
        cell: (info) => (
          <span
            className="text-[13px] truncate block max-w-[420px]"
            title={info.getValue()}
            style={{ color: 'var(--text-primary)' }}
          >
            {info.getValue()}
          </span>
        ),
        size: undefined, // flex
      }),
      columnHelper.display({
        id: 'tags',
        header: 'Tags',
        cell: (info) => {
          const issue = info.row.original;
          return (
            <InlineEditTags
              issueKey={issue.jiraKey}
              localTags={issue.localTags}
              onOpenChange={onTagEditorOpenChange}
            />
          );
        },
        size: 250,
        enableSorting: false,
      }),
      columnHelper.accessor('assigneeName', {
        header: 'Assignee',
        cell: (info) => {
          const issue = info.row.original;
          if (editingCell?.rowKey === issue.jiraKey && editingCell?.column === 'assignee') {
            return (
              <InlineEditAssignee
                issueKey={issue.jiraKey}
                currentId={issue.assigneeId ?? undefined}
                onClose={closeInlineEdit}
              />
            );
          }
          return (
            <span onClick={(e) => handleCellClick(issue.jiraKey, 'assignee', e)}>
              <AssigneeCell name={info.getValue() ?? undefined} />
            </span>
          );
        },
        size: 120,
      }),
      columnHelper.accessor('developmentDueDate', {
        header: 'Due Date',
        cell: (info) => {
          const issue = info.row.original;
          const effectiveDueDate = issue.developmentDueDate ?? issue.dueDate;
          if (editingCell?.rowKey === issue.jiraKey && editingCell?.column === 'dueDate') {
            return (
              <InlineEditDueDate
                issueKey={issue.jiraKey}
                currentValue={info.getValue() ?? undefined}
                onClose={closeInlineEdit}
              />
            );
          }
          return (
            <span onClick={(e) => handleCellClick(issue.jiraKey, 'dueDate', e)}>
              <DueDateCell date={effectiveDueDate ?? undefined} />
            </span>
          );
        },
        size: 100,
      }),
      columnHelper.accessor('statusName', {
        header: 'Status',
        cell: (info) => <StatusBadge status={info.getValue()} />,
        size: 100,
      }),
      columnHelper.accessor((row) => (hasAnalysisNotes(row) ? 1 : 0), {
        id: 'analysisStatus',
        header: 'Notes',
        cell: (info) => <AnalysisStatusCell hasNotes={Boolean(info.getValue())} />,
        sortDescFirst: false,
        size: 60,
      }),
      columnHelper.accessor('updatedAt', {
        header: 'Updated',
        cell: (info) => (
          <span className="font-mono text-[12px]" style={{ color: 'var(--text-muted)' }}>
            {formatRelativeTime(info.getValue())}
          </span>
        ),
        size: 80,
      }),
      columnHelper.accessor('flagged', {
        header: '',
        cell: (info) =>
          info.getValue() ? (
            <Ban size={14} className="animate-pulse-blocked" style={{ color: 'var(--danger)' }} />
          ) : null,
        size: 40,
        enableSorting: false,
      }),
    ],
    [editingCell, handleCellClick, closeInlineEdit, config, onTagEditorOpenChange]
  );

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const baseIssues = issues ?? [];
  const filteredIssues = useMemo(() => {
    if (!normalizedSearch) {
      return baseIssues;
    }

    return baseIssues.filter((issue) => {
      return issue.jiraKey.toLowerCase().includes(normalizedSearch) || issue.summary.toLowerCase().includes(normalizedSearch);
    });
  }, [baseIssues, normalizedSearch]);

  const table = useReactTable({
    data: filteredIssues,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const closeSearch = useCallback(() => {
    setSearchQuery('');
    setSearchOpen(false);
  }, []);

  useEffect(() => {
    if (!searchOpen) {
      return;
    }

    const handleOutsideMouseDown = (event: MouseEvent) => {
      if (searchQuery.trim()) {
        return;
      }
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (searchContainerRef.current?.contains(target)) {
        return;
      }
      setSearchOpen(false);
    };

    window.addEventListener('mousedown', handleOutsideMouseDown);
    return () => {
      window.removeEventListener('mousedown', handleOutsideMouseDown);
    };
  }, [searchOpen, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex-1 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-11 mb-1 rounded animate-pulse"
            style={{ background: 'var(--bg-secondary)' }}
          />
        ))}
      </div>
    );
  }

  if (!baseIssues.length) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>
            {filter !== 'all'
              ? 'No defects match this filter.'
              : 'No open defects. Your project is clean. 🎉'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div
        ref={searchContainerRef}
        className="flex items-center justify-end px-3 py-2 border-b"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)' }}
      >
        {!searchOpen ? (
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="h-8 w-8 rounded-md flex items-center justify-center transition-colors hover:bg-[var(--bg-tertiary)]"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Open defect search"
            title="Search defects"
          >
            <Search size={15} />
          </button>
        ) : (
          <div
            className="h-8 w-[320px] max-w-full rounded-md border px-2 flex items-center gap-2"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
          >
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID or title..."
              className="flex-1 text-[12px] bg-transparent outline-none"
              style={{ color: 'var(--text-primary)' }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  closeSearch();
                }
              }}
              onBlur={(e) => {
                if (searchQuery.trim()) {
                  return;
                }
                const nextFocused = e.relatedTarget;
                if (nextFocused && searchContainerRef.current?.contains(nextFocused)) {
                  return;
                }
                setSearchOpen(false);
              }}
              aria-label="Search defects by ID or title"
            />
            <button
              type="button"
              onClick={closeSearch}
              className="h-6 w-6 rounded flex items-center justify-center transition-colors hover:bg-[var(--bg-tertiary)]"
              style={{ color: 'var(--text-muted)' }}
              aria-label="Clear defect search"
            >
              <X size={13} />
            </button>
          </div>
        )}
      </div>

      <div
        className="flex-1 overflow-auto"
        ref={tableRef}
        onMouseDownCapture={handleTableMouseDownCapture}
        onClickCapture={handleTableClickCapture}
      >
        {filteredIssues.length === 0 ? (
          <div className="h-full flex items-center justify-center px-6">
            <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              No defects match this search.
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className="text-left text-[11px] font-semibold uppercase px-3 py-2 cursor-pointer select-none sticky top-0 z-30"
                      style={{
                        letterSpacing: '0.06em',
                        color: 'var(--text-muted)',
                        background: 'var(--bg-primary)',
                        boxShadow: '0 1px 0 var(--border)',
                        width: header.column.getSize() !== 150 ? header.column.getSize() : undefined,
                      }}
                    >
                      <span className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <ArrowUpDown size={10} style={{ opacity: 0.4 }} />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row, i) => {
            const issue = row.original;
            const isSelected = issue.jiraKey === selectedKey;
            const isFocused = i === focusedIndex;
            const overdue = isOverdue(issue.dueDate ?? undefined);
            const dueToday = isDueToday(issue.dueDate ?? undefined);
            const stale = issue.statusCategory !== 'done' && isStale(issue.updatedAt);

            let leftBorder = 'transparent';
            if (isSelected) leftBorder = 'var(--accent)';
            else if (isFocused) leftBorder = 'var(--accent)';
            else if (overdue) leftBorder = 'var(--danger)';
            else if (dueToday) leftBorder = 'var(--warning)';
            else if (issue.flagged) leftBorder = 'var(--danger-muted)';
            else if (stale) leftBorder = 'var(--text-muted)';

            const shouldAnimate = !hasAnimated && i < 10;

                return (
                  <motion.tr
                    key={issue.jiraKey}
                    initial={shouldAnimate ? { opacity: 0, y: 6 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={shouldAnimate ? { duration: 0.2, delay: i * 0.03 + 0.4 } : undefined}
                    onClick={() => {
                      if (suppressNextRowSelectRef.current) {
                        suppressNextRowSelectRef.current = false;
                        return;
                      }
                      onSelectIssue(issue.jiraKey);
                    }}
                    className="cursor-pointer transition-colors duration-150"
                    style={{
                      background: isSelected
                        ? 'var(--bg-glow)'
                        : isFocused
                        ? 'var(--bg-tertiary)'
                        : issue.flagged
                        ? 'rgba(239,68,68,0.04)'
                        : undefined,
                      boxShadow: `inset 4px 0 0 ${leftBorder}`,
                      borderBottom: '1px solid var(--border)',
                    }}
                    whileHover={{ backgroundColor: 'var(--bg-tertiary)' }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2 text-[13px] relative z-0">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/** Returns the issue keys in the current table sort order */
export function useTableIssueKeys(filter: FilterType, assigneeFilter?: string) {
  const { data: issues } = useIssues(filter, assigneeFilter);
  return issues ?? [];
}
