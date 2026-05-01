import type {
  ManagerDeskCategory,
  ManagerDeskDelegatedExecution,
  ManagerDeskItemKind,
  ManagerDeskPriority,
  ManagerDeskStatus,
} from 'shared/types';

export type {
  ManagerDeskAddLinkPayload,
  ManagerDeskAssignee,
  ManagerDeskCarryForwardContextResponse,
  ManagerDeskCarryForwardPayload,
  ManagerDeskCarryForwardPreviewItem,
  ManagerDeskCarryForwardPreviewResponse,
  ManagerDeskCarryForwardTimeMode,
  ManagerDeskCarryForwardWarningCode,
  ManagerDeskCategory,
  ManagerDeskCreateItemPayload,
  ManagerDeskDayResponse,
  ManagerDeskDelegatedExecution,
  ManagerDeskDeveloperLookupItem,
  ManagerDeskIssueLookupItem,
  ManagerDeskItem,
  ManagerDeskItemKind,
  ManagerDeskLink,
  ManagerDeskLinkType,
  ManagerDeskPriority,
  ManagerDeskStatus,
  ManagerDeskSummary,
  ManagerDeskUpdateItemPayload,
  ManagerDeskViewMode,
  TrackerSharedTaskDetailResponse,
} from 'shared/types';

export const KIND_LABELS: Record<ManagerDeskItemKind, string> = {
  action: 'Action',
  meeting: 'Meeting',
  decision: 'Decision',
  waiting: 'Follow-up',
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
  inbox: 'Needs triage',
  planned: 'Planned',
  in_progress: 'Doing',
  waiting: 'Planned',
  backlog: 'Later',
  done: 'Done',
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
