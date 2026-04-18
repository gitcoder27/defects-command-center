import type { Developer, DeveloperAvailability, TrackerTaskLifecycle, TrackerWorkItem } from '@/types';

/**
 * Manager Desk — client-local types (mirrors the backend contract from
 * docs/16-manager-desk-frontend-handoff.md). These live here until the
 * shared/types.ts counterparts are finalized in the backend workspace.
 */

// ── Enums ───────────────────────────────────────────────

export type ManagerDeskItemKind = 'action' | 'meeting' | 'decision' | 'waiting';

export type ManagerDeskCategory =
  | 'analysis'
  | 'design'
  | 'team_management'
  | 'cross_team'
  | 'follow_up'
  | 'escalation'
  | 'admin'
  | 'planning'
  | 'other';

export type ManagerDeskStatus =
  | 'inbox'
  | 'planned'
  | 'in_progress'
  | 'waiting'
  | 'done'
  | 'cancelled';

export type ManagerDeskPriority = 'low' | 'medium' | 'high' | 'critical';

export type ManagerDeskViewMode = 'live' | 'history' | 'planning';

export type ManagerDeskLinkType = 'issue' | 'developer' | 'external_group';

// ── Link ────────────────────────────────────────────────

export interface ManagerDeskLink {
  id: number;
  itemId: number;
  linkType: ManagerDeskLinkType;
  issueKey?: string;
  developerAccountId?: string;
  externalLabel?: string;
  displayLabel: string;
  createdAt: string;
}

// ── Delegated Execution ─────────────────────────────────

export interface ManagerDeskDelegatedExecution {
  trackerItemId: number;
  state: 'planned' | 'in_progress' | 'done' | 'dropped';
  note?: string;
  completedAt?: string;
  updatedAt: string;
}

// ── Item ────────────────────────────────────────────────

export interface ManagerDeskItem {
  id: number;
  dayId: number;
  originDate: string;
  title: string;
  kind: ManagerDeskItemKind;
  category: ManagerDeskCategory;
  status: ManagerDeskStatus;
  priority: ManagerDeskPriority;
  assigneeDeveloperAccountId?: string;
  assignee?: ManagerDeskAssignee;
  participants?: string;
  contextNote?: string;
  nextAction?: string;
  outcome?: string;
  plannedStartAt?: string;
  plannedEndAt?: string;
  followUpAt?: string;
  completedAt?: string;
  delegatedExecution?: ManagerDeskDelegatedExecution;
  createdAt: string;
  updatedAt: string;
  links: ManagerDeskLink[];
}

// ── Day Summary ─────────────────────────────────────────

export interface ManagerDeskSummary {
  totalOpen: number;
  inbox: number;
  planned: number;
  inProgress: number;
  waiting: number;
  overdueFollowUps: number;
  meetings: number;
  completed: number;
}

// ── Day Response ────────────────────────────────────────

export interface ManagerDeskDayResponse {
  date: string;
  viewMode: ManagerDeskViewMode;
  items: ManagerDeskItem[];
  summary: ManagerDeskSummary;
  createdThatDayItems?: ManagerDeskItem[];
}

export interface TrackerSharedTaskDetailResponse {
  date: string;
  developer: Developer;
  lifecycle: TrackerTaskLifecycle;
  managerDeskItem?: ManagerDeskItem;
  trackerItem: TrackerWorkItem;
}

// ── Lookup Shapes ───────────────────────────────────────

export interface ManagerDeskIssueLookupItem {
  jiraKey: string;
  summary: string;
  priorityName: string;
  statusName: string;
  assigneeName?: string;
}

export interface ManagerDeskDeveloperLookupItem {
  accountId: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  availability?: DeveloperAvailability;
}

export interface ManagerDeskAssignee {
  accountId: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  availability?: DeveloperAvailability;
}

// ── Create / Update payloads ────────────────────────────

export interface ManagerDeskCreateItemPayload {
  date: string;
  title: string;
  kind?: ManagerDeskItemKind;
  category?: ManagerDeskCategory;
  status?: ManagerDeskStatus;
  priority?: ManagerDeskPriority;
  assigneeDeveloperAccountId?: string | null;
  participants?: string;
  contextNote?: string;
  nextAction?: string;
  plannedStartAt?: string;
  plannedEndAt?: string;
  followUpAt?: string;
  links?: Array<{
    linkType: ManagerDeskLinkType;
    issueKey?: string;
    developerAccountId?: string;
    externalLabel?: string;
  }>;
}

export interface ManagerDeskUpdateItemPayload {
  title?: string;
  kind?: ManagerDeskItemKind;
  category?: ManagerDeskCategory;
  status?: ManagerDeskStatus;
  priority?: ManagerDeskPriority;
  assigneeDeveloperAccountId?: string | null;
  participants?: string;
  contextNote?: string;
  nextAction?: string;
  outcome?: string;
  plannedStartAt?: string;
  plannedEndAt?: string;
  followUpAt?: string;
}

export type ManagerDeskAddLinkPayload =
  | { linkType: 'issue'; issueKey: string }
  | { linkType: 'developer'; developerAccountId: string }
  | { linkType: 'external_group'; externalLabel: string };

export interface ManagerDeskCarryForwardPayload {
  fromDate: string;
  toDate: string;
  itemIds?: number[];
}

// ── Carry-forward preview ───────────────────────────────

export type ManagerDeskCarryForwardTimeMode = 'rebase_to_target_date';

export type ManagerDeskCarryForwardWarningCode =
  | 'follow_up_overdue_on_arrival'
  | 'planned_end_overdue_on_arrival';

export interface ManagerDeskCarryForwardPreviewItem {
  item: ManagerDeskItem;
  rebasedPlannedStartAt?: string;
  rebasedPlannedEndAt?: string;
  rebasedFollowUpAt?: string;
  warningCodes: ManagerDeskCarryForwardWarningCode[];
}

export interface ManagerDeskCarryForwardPreviewResponse {
  fromDate: string;
  toDate: string;
  carryable: number;
  overdueOnArrivalCount: number;
  timeMode: ManagerDeskCarryForwardTimeMode;
  items: ManagerDeskCarryForwardPreviewItem[];
}

export interface ManagerDeskCarryForwardContextResponse {
  fromDate?: string;
  toDate: string;
  carryable: number;
  overdueOnArrivalCount: number;
  timeMode: ManagerDeskCarryForwardTimeMode;
  items: ManagerDeskCarryForwardPreviewItem[];
}

// ── Display helpers ─────────────────────────────────────

export const KIND_LABELS: Record<ManagerDeskItemKind, string> = {
  action: 'Action',
  meeting: 'Meeting',
  decision: 'Decision',
  waiting: 'Waiting',
};

export const CATEGORY_LABELS: Record<ManagerDeskCategory, string> = {
  analysis: 'Analysis',
  design: 'Design',
  team_management: 'Team Mgmt',
  cross_team: 'Cross-Team',
  follow_up: 'Follow-Up',
  escalation: 'Escalation',
  admin: 'Admin',
  planning: 'Planning',
  other: 'Other',
};

export const STATUS_LABELS: Record<ManagerDeskStatus, string> = {
  inbox: 'Inbox',
  planned: 'Planned',
  in_progress: 'In Progress',
  waiting: 'Waiting',
  done: 'Completed',
  cancelled: 'Dropped',
};

export const PRIORITY_LABELS: Record<ManagerDeskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const EXECUTION_STATE_LABELS: Record<ManagerDeskDelegatedExecution['state'], string> = {
  planned: 'Planned',
  in_progress: 'In Progress',
  done: 'Done',
  dropped: 'Dropped',
};
