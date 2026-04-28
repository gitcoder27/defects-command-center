import { format, isAfter, isBefore, isToday, parseISO, startOfDay } from 'date-fns';
import type { ManagerDeskItem, ManagerDeskStatus } from '@/types/manager-desk';

export type ManagerMemoryMode = 'follow-ups' | 'meetings';
export type FollowUpLane = 'overdue' | 'today' | 'upcoming' | 'unscheduled' | 'closed';
export type MeetingLane = 'today' | 'upcoming' | 'needs-actions' | 'closed';
export type ManagerMemoryLane = FollowUpLane | MeetingLane;

export interface ManagerMemoryStat {
  id: string;
  label: string;
  value: number;
  tone: 'critical' | 'warning' | 'info' | 'neutral' | 'success';
}

const closedStatuses = new Set<ManagerDeskStatus>(['done', 'cancelled']);

export function isClosedMemoryItem(item: ManagerDeskItem): boolean {
  return closedStatuses.has(item.status);
}

export function isFollowUpMemoryItem(item: ManagerDeskItem): boolean {
  return item.category === 'follow_up' || Boolean(item.followUpAt);
}

export function isMeetingMemoryItem(item: ManagerDeskItem): boolean {
  return item.kind === 'meeting';
}

export function filterMemoryItems(mode: ManagerMemoryMode, items: ManagerDeskItem[]): ManagerDeskItem[] {
  const predicate = mode === 'follow-ups' ? isFollowUpMemoryItem : isMeetingMemoryItem;
  return sortMemoryItems(items.filter(predicate));
}

export function getFollowUpLane(item: ManagerDeskItem): FollowUpLane {
  if (isClosedMemoryItem(item)) return 'closed';
  if (!item.followUpAt) return 'unscheduled';

  const date = parseMemoryDate(item.followUpAt);
  if (!date) return 'unscheduled';
  if (isBefore(date, startOfDay(new Date()))) return 'overdue';
  if (isToday(date)) return 'today';
  return 'upcoming';
}

export function getMeetingLane(item: ManagerDeskItem): MeetingLane {
  if (isClosedMemoryItem(item)) return 'closed';

  const hasActionSignal = Boolean(item.nextAction?.trim()) || item.status === 'waiting';
  if (hasActionSignal && !item.outcome?.trim()) return 'needs-actions';

  const date = parseMemoryDate(item.plannedStartAt ?? item.createdAt);
  if (date && isToday(date)) return 'today';
  return 'upcoming';
}

export function getMemoryLane(mode: ManagerMemoryMode, item: ManagerDeskItem): ManagerMemoryLane {
  return mode === 'follow-ups' ? getFollowUpLane(item) : getMeetingLane(item);
}

export function buildMemoryStats(mode: ManagerMemoryMode, items: ManagerDeskItem[]): ManagerMemoryStat[] {
  if (mode === 'follow-ups') {
    return [
      { id: 'due-today', label: 'Due today', value: items.filter((item) => getFollowUpLane(item) === 'today').length, tone: 'warning' },
      { id: 'overdue', label: 'Overdue', value: items.filter((item) => getFollowUpLane(item) === 'overdue').length, tone: 'critical' },
      { id: 'open', label: 'Open', value: items.filter((item) => !isClosedMemoryItem(item)).length, tone: 'info' },
      { id: 'closed', label: 'Closed', value: items.filter(isClosedMemoryItem).length, tone: 'success' },
    ];
  }

  return [
    { id: 'today', label: 'Today', value: items.filter((item) => getMeetingLane(item) === 'today').length, tone: 'info' },
    { id: 'actions', label: 'Need action', value: items.filter((item) => getMeetingLane(item) === 'needs-actions').length, tone: 'warning' },
    { id: 'upcoming', label: 'Upcoming', value: items.filter((item) => getMeetingLane(item) === 'upcoming').length, tone: 'neutral' },
    { id: 'closed', label: 'Closed', value: items.filter(isClosedMemoryItem).length, tone: 'success' },
  ];
}

export function getMemorySearchText(item: ManagerDeskItem): string {
  return [
    item.title,
    item.participants,
    item.contextNote,
    item.nextAction,
    item.outcome,
    item.assignee?.displayName,
    item.links.map((link) => link.displayLabel).join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function searchMemoryItems(items: ManagerDeskItem[], query: string): ManagerDeskItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return items;
  return items.filter((item) => getMemorySearchText(item).includes(normalized));
}

export function formatMemoryDateTime(value?: string): string {
  const date = parseMemoryDate(value);
  if (!date) return 'No date set';
  return format(date, isToday(date) ? "'Today' h:mm a" : 'MMM d, h:mm a');
}

export function toDateTimeInputValue(value?: string): string {
  const date = parseMemoryDate(value);
  if (!date) return '';
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

export function fromDateTimeInputValue(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function sortMemoryItems(items: ManagerDeskItem[]): ManagerDeskItem[] {
  return [...items].sort((left, right) => {
    const leftClosed = isClosedMemoryItem(left) ? 1 : 0;
    const rightClosed = isClosedMemoryItem(right) ? 1 : 0;
    if (leftClosed !== rightClosed) return leftClosed - rightClosed;

    const leftTime = parseMemoryDate(left.followUpAt ?? left.plannedStartAt ?? left.createdAt)?.getTime() ?? 0;
    const rightTime = parseMemoryDate(right.followUpAt ?? right.plannedStartAt ?? right.createdAt)?.getTime() ?? 0;
    if (leftTime !== rightTime) return leftTime - rightTime;

    return right.updatedAt.localeCompare(left.updatedAt);
  });
}

function parseMemoryDate(value?: string): Date | undefined {
  if (!value) return undefined;
  try {
    const date = parseISO(value);
    if (Number.isNaN(date.getTime())) return undefined;
    return date;
  } catch {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
}

export function isFutureMemoryItem(item: ManagerDeskItem): boolean {
  const date = parseMemoryDate(item.followUpAt ?? item.plannedStartAt);
  return Boolean(date && isAfter(date, new Date()));
}
