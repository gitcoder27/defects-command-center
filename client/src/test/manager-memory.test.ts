import { describe, expect, it } from 'vitest';
import { addDays, formatISO, startOfDay } from 'date-fns';
import {
  buildMemoryStats,
  filterMemoryItems,
  getFollowUpLane,
  getMeetingLane,
} from '@/lib/manager-memory';
import type { ManagerDeskItem } from '@/types/manager-desk';

const baseItem = (overrides: Partial<ManagerDeskItem>): ManagerDeskItem => ({
  id: overrides.id ?? 1,
  dayId: 1,
  originDate: '2026-04-28',
  title: overrides.title ?? 'Follow up with QA',
  kind: overrides.kind ?? 'action',
  category: overrides.category ?? 'follow_up',
  status: overrides.status ?? 'planned',
  priority: overrides.priority ?? 'medium',
  createdAt: overrides.createdAt ?? '2026-04-28T03:00:00.000Z',
  updatedAt: overrides.updatedAt ?? '2026-04-28T03:00:00.000Z',
  links: overrides.links ?? [],
  ...overrides,
});

const atHour = (dayOffset: number, hour: number) => {
  const date = addDays(startOfDay(new Date()), dayOffset);
  date.setHours(hour, 0, 0, 0);
  return formatISO(date);
};

describe('manager memory helpers', () => {
  it('separates follow-ups and meetings from the manager desk stream', () => {
    const items = [
      baseItem({ id: 1, category: 'follow_up', followUpAt: atHour(0, 10) }),
      baseItem({ id: 2, kind: 'meeting', category: 'planning', plannedStartAt: atHour(0, 11) }),
      baseItem({ id: 3, category: 'design', title: 'Design decision' }),
    ];

    expect(filterMemoryItems('follow-ups', items).map((item) => item.id)).toEqual([1]);
    expect(filterMemoryItems('meetings', items).map((item) => item.id)).toEqual([2]);
  });

  it('classifies manager memory into action lanes', () => {
    expect(getFollowUpLane(baseItem({ followUpAt: atHour(-1, 10) }))).toBe('overdue');
    expect(getFollowUpLane(baseItem({ followUpAt: atHour(0, 10) }))).toBe('today');
    expect(getFollowUpLane(baseItem({ followUpAt: atHour(3, 10) }))).toBe('upcoming');
    expect(getMeetingLane(baseItem({ kind: 'meeting', category: 'planning', nextAction: 'Send notes' }))).toBe('needs-actions');
  });

  it('builds workflow stats for the focused pages', () => {
    const items = [
      baseItem({ id: 1, followUpAt: atHour(0, 10) }),
      baseItem({ id: 2, followUpAt: atHour(-1, 10) }),
      baseItem({ id: 3, status: 'done', followUpAt: atHour(0, 10) }),
    ];

    const stats = buildMemoryStats('follow-ups', items);

    expect(stats.find((stat) => stat.id === 'due-today')?.value).toBe(1);
    expect(stats.find((stat) => stat.id === 'overdue')?.value).toBe(1);
    expect(stats.find((stat) => stat.id === 'closed')?.value).toBe(1);
  });
});
