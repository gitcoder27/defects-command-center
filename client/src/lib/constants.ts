import type { FilterType } from '@/types';

export const PRIORITY_WEIGHTS: Record<string, number> = {
  Highest: 5,
  High: 3,
  Medium: 1,
  Low: 0.5,
  Lowest: 0.5,
};

export const PRIORITY_OPTIONS = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];

export const FILTER_LABELS: Record<FilterType, string> = {
  all: 'All',
  new: 'New (24h)',
  inProgress: 'In Progress',
  unassigned: 'Unassigned',
  dueToday: 'Due Today',
  dueThisWeek: 'Due This Week',
  overdue: 'Overdue',
  blocked: 'Blocked',
  stale: 'Stale',
  highPriority: 'High Priority',
};

export const FILTER_KEYS: FilterType[] = [
  'all',
  'unassigned',
  'dueToday',
  'dueThisWeek',
  'overdue',
  'blocked',
  'stale',
  'highPriority',
];

export const CARD_CONFIGS = [
  { key: 'total' as const, label: 'Total Defects', color: '#06B6D4', filter: 'all' as FilterType },
  { key: 'new' as const, label: 'New (24h)', color: '#8B5CF6', filter: 'new' as FilterType },
  { key: 'unassigned' as const, label: 'Unassigned', color: '#F59E0B', filter: 'unassigned' as FilterType },
  { key: 'dueToday' as const, label: 'Due Today', color: '#F97316', filter: 'dueToday' as FilterType },
  { key: 'overdue' as const, label: 'Overdue', color: '#EF4444', filter: 'overdue' as FilterType },
  { key: 'inProgress' as const, label: 'In Progress', color: '#10B981', filter: 'inProgress' as FilterType },
];
