import { isPast, parseISO } from 'date-fns';
import type {
  ManagerDeskCategory,
  ManagerDeskItem,
  ManagerDeskItemKind,
  ManagerDeskStatus,
} from '@/types/manager-desk';

export type ManagerDeskFilterState = {
  kind: ManagerDeskItemKind | null;
  category: ManagerDeskCategory | null;
  status: ManagerDeskStatus | null;
};

export type ManagerDeskQuickFilter =
  | 'all'
  | 'waiting'
  | 'inbox'
  | 'meetings'
  | 'done';

const priorityWeight = { critical: 0, high: 1, medium: 2, low: 3 };
const statusWeight = { in_progress: 0, planned: 1, waiting: 2, inbox: 3, done: 4, cancelled: 5 };
const nonAttentionRank = 99;

export function isCompleted(item: ManagerDeskItem) {
  return item.status === 'done' || item.status === 'cancelled';
}

export function isOverdue(item: ManagerDeskItem) {
  if (!item.followUpAt || isCompleted(item)) return false;

  try {
    return isPast(parseISO(item.followUpAt));
  } catch {
    return false;
  }
}

export function isAttentionItem(item: ManagerDeskItem) {
  return getAttentionRank(item) < nonAttentionRank;
}

function getAttentionRank(item: ManagerDeskItem) {
  if (isCompleted(item)) return nonAttentionRank;
  if (isOverdue(item)) return 0;
  if (item.status === 'in_progress') return 1;
  if (item.status === 'waiting') return 2;
  if (item.status === 'inbox') return 3;
  if (item.priority === 'critical' || item.priority === 'high') return 4;
  return nonAttentionRank;
}

function getSearchText(item: ManagerDeskItem) {
  return [
    item.title,
    item.nextAction,
    item.outcome,
    item.contextNote,
    item.participants,
    item.assignee?.displayName,
    item.assigneeDeveloperAccountId,
    item.links.map((link) => link.displayLabel).join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function filterItems(
  items: ManagerDeskItem[],
  searchQuery: string,
  quickFilter: ManagerDeskQuickFilter,
  filters: ManagerDeskFilterState
) {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return items.filter((item) => {
    if (filters.kind && item.kind !== filters.kind) return false;
    if (filters.category && item.category !== filters.category) return false;
    if (filters.status && item.status !== filters.status) return false;

    if (normalizedQuery.length > 0 && !getSearchText(item).includes(normalizedQuery)) {
      return false;
    }

    switch (quickFilter) {
      case 'waiting':
        return !isCompleted(item) && (item.status === 'waiting' || item.kind === 'waiting');
      case 'inbox':
        return item.status === 'inbox';
      case 'meetings':
        return !isCompleted(item) && item.kind === 'meeting';
      case 'done':
        return isCompleted(item);
      default:
        return !isCompleted(item);
    }
  });
}

export function sortForWorkbench(items: ManagerDeskItem[]) {
  return [...items].sort((left, right) => {
    const attentionDiff = getAttentionRank(left) - getAttentionRank(right);
    if (attentionDiff !== 0) return attentionDiff;

    const statusDiff = statusWeight[left.status] - statusWeight[right.status];
    if (statusDiff !== 0) return statusDiff;

    if (left.kind === 'meeting' || right.kind === 'meeting') {
      return (left.plannedStartAt ?? '').localeCompare(right.plannedStartAt ?? '');
    }

    const priorityDiff = priorityWeight[left.priority] - priorityWeight[right.priority];
    if (priorityDiff !== 0) return priorityDiff;

    if (left.status === 'inbox' || right.status === 'inbox') {
      return right.createdAt.localeCompare(left.createdAt);
    }

    if (left.plannedStartAt || right.plannedStartAt) {
      return (left.plannedStartAt ?? '').localeCompare(right.plannedStartAt ?? '');
    }

    return left.updatedAt.localeCompare(right.updatedAt);
  });
}

export function getOpenItems(items: ManagerDeskItem[]) {
  return sortForWorkbench(items.filter((item) => !isCompleted(item)));
}

export function getCompletedItems(items: ManagerDeskItem[]) {
  return sortForWorkbench(items.filter(isCompleted));
}

export function getContinuedOpenItems(items: ManagerDeskItem[], date: string) {
  return getOpenItems(items).filter((item) => item.originDate < date);
}

export function getInitialSelection(items: ManagerDeskItem[]) {
  return getOpenItems(items)[0] ?? items[0] ?? null;
}

export function getQuickFilterCount(items: ManagerDeskItem[], quickFilter: ManagerDeskQuickFilter) {
  if (quickFilter === 'all') {
    return getOpenItems(items).length;
  }

  return filterItems(items, '', quickFilter, { kind: null, category: null, status: null }).length;
}

export function isInboxItem(item: ManagerDeskItem | null) {
  return item?.status === 'inbox';
}
