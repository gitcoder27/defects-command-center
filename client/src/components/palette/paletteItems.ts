import type { AppView } from '@/App';
import type {
  GlobalSearchCheckInItem,
  GlobalSearchDeveloperItem,
  GlobalSearchDeskItem,
  GlobalSearchIssueItem,
  TodayActionTarget,
} from '@/types';
import { KIND_LABELS } from '@/types/manager-desk';

export type PaletteGroupId = 'actions' | 'issues' | 'desk' | 'checkins' | 'developers';

export interface PaletteItem {
  id: string;
  group: PaletteGroupId;
  title: string;
  description?: string;
  keywords?: string;
  /** Plain view switch (for surfaces not addressable by TodayActionTarget). */
  view?: AppView;
  /** Navigation targets handed to the app's shared target handler. */
  target?: TodayActionTarget;
  /** Non-navigation actions the palette host executes (capture, sync). */
  actionId?: 'capture' | 'sync';
}

export interface PaletteGroup {
  id: PaletteGroupId;
  label: string;
  items: PaletteItem[];
}

const NAVIGATION_COMMANDS: Array<{ view: AppView; title: string; keywords?: string; targetView?: TodayActionTarget['view'] }> = [
  { view: 'today', title: 'Go to Today', keywords: 'home daily start morning' },
  { view: 'work', title: 'Go to Work', keywords: 'defects jira issues triage dashboard', targetView: 'work' },
  { view: 'team', title: 'Go to Team', keywords: 'tracker developers day check-in', targetView: 'team' },
  { view: 'desk', title: 'Go to Desk', keywords: 'manager capture planning notes', targetView: 'desk' },
  { view: 'follow-ups', title: 'Go to Follow-ups', keywords: 'promises reminders', targetView: 'follow-ups' },
  { view: 'meetings', title: 'Go to Meetings', keywords: 'notes actions minutes', targetView: 'meetings' },
  { view: 'settings', title: 'Go to Settings', keywords: 'config jira users backups', targetView: 'settings' },
];

export function buildNavigationCommands(): PaletteItem[] {
  return NAVIGATION_COMMANDS.map((command) => ({
    id: `nav-${command.view}`,
    group: 'actions',
    title: command.title,
    keywords: command.keywords,
    view: command.view,
    target: command.targetView ? { type: 'view', view: command.targetView } : undefined,
  }));
}

export function buildQuickActions(): PaletteItem[] {
  return [
    {
      id: 'action-capture',
      group: 'actions',
      title: 'Capture a note',
      description: 'Desk or Team quick capture',
      keywords: 'new note follow-up meeting task add',
      actionId: 'capture',
    },
    {
      id: 'action-sync',
      group: 'actions',
      title: 'Start Jira sync',
      description: 'Refresh work from Jira now',
      keywords: 'refresh jira update import',
      actionId: 'sync',
    },
  ];
}

export function filterCommands(commands: PaletteItem[], query: string): PaletteItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return commands;
  }
  return commands.filter((command) => {
    const haystack = `${command.title} ${command.keywords ?? ''}`.toLowerCase();
    return normalized.split(/\s+/).every((token) => haystack.includes(token));
  });
}

export function issueToPaletteItem(issue: GlobalSearchIssueItem, index: number): PaletteItem {
  return {
    id: `issue-${issue.jiraKey}-${index}`,
    group: 'issues',
    title: issue.summary,
    description: [issue.jiraKey, issue.statusName, issue.assigneeName ?? 'Unassigned'].join(' · '),
    keywords: issue.jiraKey,
    target: { type: 'issue', view: 'work', issueKey: issue.jiraKey },
  };
}

export function deskItemToPaletteItem(item: GlobalSearchDeskItem, index: number): PaletteItem {
  const kindLabel = KIND_LABELS[item.kind] ?? 'Desk item';
  const statusLabel = item.status === 'done' ? 'Done' : item.status.replace(/_/g, ' ');
  return {
    id: `desk-${item.itemId}-${index}`,
    group: 'desk',
    title: item.title,
    description: [kindLabel, item.date, statusLabel].join(' · '),
    target: { type: 'manager_desk_item', view: 'desk', managerDeskItemId: item.itemId, date: item.date },
  };
}

export function checkInToPaletteItem(checkIn: GlobalSearchCheckInItem, index: number): PaletteItem {
  return {
    id: `checkin-${checkIn.checkInId}-${index}`,
    group: 'checkins',
    title: checkIn.summary,
    description: [checkIn.developerName, checkIn.date].join(' · '),
    target: { type: 'developer', view: 'team', developerAccountId: checkIn.developerAccountId },
  };
}

export function developerToPaletteItem(developer: GlobalSearchDeveloperItem, index: number): PaletteItem {
  return {
    id: `developer-${developer.accountId}-${index}`,
    group: 'developers',
    title: developer.displayName,
    description: developer.email ?? developer.accountId,
    target: { type: 'developer', view: 'team', developerAccountId: developer.accountId },
  };
}

export function buildResultGroups(results: {
  issues: GlobalSearchIssueItem[];
  deskItems: GlobalSearchDeskItem[];
  checkIns: GlobalSearchCheckInItem[];
  developers: GlobalSearchDeveloperItem[];
}): PaletteGroup[] {
  const groups: PaletteGroup[] = [
    {
      id: 'issues',
      label: 'Work items',
      items: results.issues.map(issueToPaletteItem),
    },
    {
      id: 'desk',
      label: 'Desk items & follow-ups',
      items: results.deskItems.map(deskItemToPaletteItem),
    },
    {
      id: 'checkins',
      label: 'Check-ins',
      items: results.checkIns.map(checkInToPaletteItem),
    },
    {
      id: 'developers',
      label: 'Developers',
      items: results.developers.map(developerToPaletteItem),
    },
  ];
  return groups.filter((group) => group.items.length > 0);
}
