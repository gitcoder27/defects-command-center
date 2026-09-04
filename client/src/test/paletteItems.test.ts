import { describe, expect, it } from 'vitest';
import type { GlobalSearchCheckInItem, GlobalSearchDeskItem, GlobalSearchDeveloperItem, GlobalSearchIssueItem } from '@/types';
import {
  buildNavigationCommands,
  buildQuickActions,
  buildResultGroups,
  checkInToPaletteItem,
  deskItemToPaletteItem,
  developerToPaletteItem,
  filterCommands,
  issueToPaletteItem,
} from '@/components/palette/paletteItems';

const issue: GlobalSearchIssueItem = {
  jiraKey: 'PROJ-1',
  summary: 'Payment provider timeouts',
  statusName: 'In Progress',
  statusCategory: 'indeterminate',
  priorityName: 'High',
  assigneeName: 'Priya',
  dueDate: '2026-03-10',
  updatedAt: '2026-03-05T00:00:00.000Z',
};

const deskItem: GlobalSearchDeskItem = {
  itemId: 12,
  date: '2026-03-06',
  title: 'Follow up on payment bug',
  kind: 'action',
  category: 'follow_up',
  status: 'planned',
  updatedAt: '2026-03-06T00:00:00.000Z',
};

const checkIn: GlobalSearchCheckInItem = {
  checkInId: 33,
  date: '2026-03-07',
  developerAccountId: 'dev-1',
  developerName: 'Alice Smith',
  summary: 'Blocked on gateway keys',
  status: 'blocked',
  createdAt: '2026-03-07T08:00:00.000Z',
};

const developer: GlobalSearchDeveloperItem = {
  accountId: 'dev-1',
  displayName: 'Alice Smith',
  email: 'alice@example.com',
};

describe('palette item builders', () => {
  it('maps an issue to a work target', () => {
    const item = issueToPaletteItem(issue, 0);

    expect(item.target).toEqual({ type: 'issue', view: 'work', issueKey: 'PROJ-1' });
    expect(item.title).toBe('Payment provider timeouts');
    expect(item.description).toContain('PROJ-1');
  });

  it('maps a desk item to a dated desk target', () => {
    const item = deskItemToPaletteItem(deskItem, 0);

    expect(item.target).toEqual({
      type: 'manager_desk_item',
      view: 'desk',
      managerDeskItemId: 12,
      date: '2026-03-06',
    });
    expect(item.description).toContain('2026-03-06');
  });

  it('maps a check-in to the developer day target', () => {
    const item = checkInToPaletteItem(checkIn, 0);

    expect(item.target).toEqual({
      type: 'developer',
      view: 'team',
      developerAccountId: 'dev-1',
    });
    expect(item.title).toBe('Blocked on gateway keys');
  });

  it('maps a developer to the team target', () => {
    const item = developerToPaletteItem(developer, 0);

    expect(item.target).toEqual({
      type: 'developer',
      view: 'team',
      developerAccountId: 'dev-1',
    });
    expect(item.description).toBe('alice@example.com');
  });

  it('builds result groups with only non-empty groups', () => {
    const groups = buildResultGroups({
      issues: [issue],
      deskItems: [],
      checkIns: [checkIn],
      developers: [],
    });

    expect(groups.map((group) => group.id)).toEqual(['issues', 'checkins']);
  });
});

describe('palette commands', () => {
  it('offers navigation for every surface plus quick actions', () => {
    const navigation = buildNavigationCommands();
    const commands = [...navigation, ...buildQuickActions()];

    expect(commands.filter((command) => command.target || command.view).length).toBeGreaterThanOrEqual(7);
    expect(navigation.filter((command) => command.target).length).toBe(6);
    expect(commands.some((command) => command.actionId === 'capture')).toBe(true);
    expect(commands.some((command) => command.actionId === 'sync')).toBe(true);
    expect(navigation.map((command) => command.view)).toEqual([
      'today',
      'work',
      'team',
      'desk',
      'follow-ups',
      'meetings',
      'settings',
    ]);
  });

  it('filters commands across title and keywords', () => {
    const commands = [...buildNavigationCommands(), ...buildQuickActions()];

    expect(filterCommands(commands, 'jira').map((command) => command.id)).toEqual([
      'nav-work',
      'nav-settings',
      'action-sync',
    ]);
    expect(filterCommands(commands, 'follow ups')).toEqual([commands.find((command) => command.id === 'nav-follow-ups')]);
    expect(filterCommands(commands, 'zzz')).toEqual([]);
  });
});
