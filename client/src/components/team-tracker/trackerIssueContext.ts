import type { TrackerWorkItem } from '@/types';
import type { ManagerDeskCreateItemPayload } from '@/types/manager-desk';

type ManagerDeskCaptureLink = NonNullable<ManagerDeskCreateItemPayload['links']>[number];
type TrackerIssueContext = Pick<TrackerWorkItem, 'jiraKey' | 'relatedIssueKeys' | 'title'>;

export function getTrackerIssueKeys(item?: Pick<TrackerWorkItem, 'jiraKey' | 'relatedIssueKeys'>): string[] {
  if (!item) {
    return [];
  }

  const keys = [item.jiraKey, ...(item.relatedIssueKeys ?? [])]
    .map((key) => key?.trim())
    .filter((key): key is string => Boolean(key));
  return Array.from(new Set(keys));
}

export function getTrackerIssueLinks(item?: Pick<TrackerWorkItem, 'jiraKey' | 'relatedIssueKeys'>): ManagerDeskCaptureLink[] {
  return getTrackerIssueKeys(item).map((issueKey) => ({ linkType: 'issue', issueKey }));
}

export function getTrackerIssueContextChips(item?: Pick<TrackerWorkItem, 'jiraKey' | 'relatedIssueKeys'>) {
  const issueKeys = getTrackerIssueKeys(item);
  return issueKeys.map((issueKey, index) => ({
    label: index === 0 ? 'Current' : 'Related',
    value: issueKey,
    tone: 'issue' as const,
  }));
}

export function formatTrackerIssueContextNote(item?: TrackerIssueContext): string {
  const issueKeys = getTrackerIssueKeys(item);
  if (!item || issueKeys.length === 0) {
    return '';
  }

  return `Current tracker context: ${issueKeys.join(', ')} - ${item.title}`;
}
