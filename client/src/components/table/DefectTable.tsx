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
import { ArrowUpDown, Ban } from 'lucide-react';
import { PriorityCell } from './PriorityCell';
import { StatusBadge } from './StatusBadge';
import { AssigneeCell } from './AssigneeCell';
import { DueDateCell } from './DueDateCell';
import { InlineEditPriority } from './InlineEditPriority';
import { InlineEditAssignee } from './InlineEditAssignee';
import { InlineEditDueDate } from './InlineEditDueDate';
import { useIssues } from '@/hooks/useIssues';
import { useConfig } from '@/hooks/useConfig';
import { formatRelativeTime, isOverdue, isDueToday, isStale } from '@/lib/utils';
import type { Issue, FilterType } from '@/types';

const PRIORITY_ORDER: Record<string, number> = {
  Highest: 0,
  High: 1,
  Medium: 2,
  Low: 3,
  Lowest: 4,
};

const columnHelper = createColumnHelper<Issue>();

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
    { id: 'priorityName', desc: false },
    { id: 'developmentDueDate', desc: false },
  ]);
  const [editingCell, setEditingCell] = useState<{
    rowKey: string;
    column: 'priority' | 'assignee' | 'dueDate';
  } | null>(null);

  const tableRef = useRef<HTMLDivElement>(null);

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
    (issueKey: string, column: 'priority' | 'assignee' | 'dueDate', e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingCell({ rowKey: issueKey, column });
    },
    []
  );

  const closeInlineEdit = useCallback(() => setEditingCell(null), []);

  const columns = useMemo(
    () => [
      columnHelper.accessor('priorityName', {
        header: 'Pri',
        cell: (info) => {
          const issue = info.row.original;
          if (editingCell?.rowKey === issue.jiraKey && editingCell?.column === 'priority') {
            return (
              <InlineEditPriority
                issueKey={issue.jiraKey}
                currentValue={info.getValue()}
                onClose={closeInlineEdit}
              />
            );
          }
          return (
            <span onClick={(e) => handleCellClick(issue.jiraKey, 'priority', e)}>
              <PriorityCell priority={info.getValue()} />
            </span>
          );
        },
        size: 40,
        sortingFn: (a, b) =>
          (PRIORITY_ORDER[a.original.priorityName] ?? 99) -
          (PRIORITY_ORDER[b.original.priorityName] ?? 99),
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
        cell: (info) => {
          const issue = info.row.original;
          return (
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="text-[13px] truncate block max-w-[400px]"
                title={info.getValue()}
                style={{ color: 'var(--text-primary)' }}
              >
                {info.getValue()}
              </span>
              {issue.localTags?.length > 0 && (
                <div className="flex gap-1 shrink-0">
                  {issue.localTags.slice(0, 3).map((tag) => (
                    <span
                      key={tag.id}
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-medium leading-none whitespace-nowrap"
                      style={{ background: `${tag.color}25`, color: tag.color, border: `1px solid ${tag.color}40` }}
                      title={tag.name}
                    >
                      {tag.name}
                    </span>
                  ))}
                  {issue.localTags.length > 3 && (
                    <span className="text-[10px] px-1 py-0.5 rounded-full" style={{ color: 'var(--text-muted)' }}>
                      +{issue.localTags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        },
        size: undefined, // flex
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
              <DueDateCell date={info.getValue() ?? undefined} />
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
    [editingCell, handleCellClick, closeInlineEdit]
  );

  const table = useReactTable({
    data: issues ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

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

  if (!issues?.length) {
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
    <div className="flex-1 overflow-auto" ref={tableRef}>
      <table className="w-full border-collapse">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} style={{ borderBottom: '1px solid var(--border)' }}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  className="text-left text-[11px] font-semibold uppercase px-3 py-2 cursor-pointer select-none sticky top-0"
                  style={{
                    letterSpacing: '0.06em',
                    color: 'var(--text-muted)',
                    background: 'var(--bg-primary)',
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
                onClick={() => onSelectIssue(issue.jiraKey)}
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
                  <td key={cell.id} className="px-3 py-2 text-[13px]">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Returns the issue keys in the current table sort order */
export function useTableIssueKeys(filter: FilterType, assigneeFilter?: string) {
  const { data: issues } = useIssues(filter, assigneeFilter);
  return issues ?? [];
}
