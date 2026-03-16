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
  | 'overdue'
  | 'waiting'
  | 'inbox'
  | 'meetings'
  | 'highPriority'
  | 'unassigned';

export type ManagerDeskSections = {
  focus: ManagerDeskItem[];
  waiting: ManagerDeskItem[];
  meetings: ManagerDeskItem[];
  inbox: ManagerDeskItem[];
  completed: ManagerDeskItem[];
};

const priorityWeight = { critical: 0, high: 1, medium: 2, low: 3 };
const statusWeight = { in_progress: 0, planned: 1, waiting: 2, inbox: 3, done: 4, cancelled: 5 };

function isCompleted(item: ManagerDeskItem) {
  return item.status === 'done' || item.status === 'cancelled';
}

function isOverdue(item: ManagerDeskItem) {
  if (!item.followUpAt || isCompleted(item)) return false;

  try {
    return isPast(parseISO(item.followUpAt));
  } catch {
    return false;
  }
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
      case 'overdue':
        return isOverdue(item);
      case 'waiting':
        return item.status === 'waiting' || item.kind === 'waiting';
      case 'inbox':
        return item.status === 'inbox';
      case 'meetings':
        return item.kind === 'meeting';
      case 'highPriority':
        return item.priority === 'critical' || item.priority === 'high';
      case 'unassigned':
        return !item.assigneeDeveloperAccountId;
      default:
        return true;
    }
  });
}

export function sortForWorkbench(items: ManagerDeskItem[]) {
  return [...items].sort((left, right) => {
    const overdueDiff = Number(isOverdue(right)) - Number(isOverdue(left));
    if (overdueDiff !== 0) return overdueDiff;

    const priorityDiff = priorityWeight[left.priority] - priorityWeight[right.priority];
    if (priorityDiff !== 0) return priorityDiff;

    if (left.kind === 'meeting' || right.kind === 'meeting') {
      return (left.plannedStartAt ?? '').localeCompare(right.plannedStartAt ?? '');
    }

    if (left.status === 'inbox' || right.status === 'inbox') {
      return right.createdAt.localeCompare(left.createdAt);
    }

    if (left.plannedStartAt || right.plannedStartAt) {
      return (left.plannedStartAt ?? '').localeCompare(right.plannedStartAt ?? '');
    }

    const statusDiff = statusWeight[left.status] - statusWeight[right.status];
    if (statusDiff !== 0) return statusDiff;

    return left.updatedAt.localeCompare(right.updatedAt);
  });
}

export function buildSections(items: ManagerDeskItem[]): ManagerDeskSections {
  const sections: ManagerDeskSections = {
    focus: [],
    waiting: [],
    meetings: [],
    inbox: [],
    completed: [],
  };

  for (const item of sortForWorkbench(items)) {
    if (isCompleted(item)) {
      sections.completed.push(item);
    } else if (item.status === 'inbox') {
      sections.inbox.push(item);
    } else if (item.kind === 'meeting') {
      sections.meetings.push(item);
    } else if (item.status === 'waiting' || item.kind === 'waiting') {
      sections.waiting.push(item);
    } else {
      sections.focus.push(item);
    }
  }

  return sections;
}

export function getOpenItems(items: ManagerDeskItem[]) {
  return sortForWorkbench(items.filter((item) => !isCompleted(item)));
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
