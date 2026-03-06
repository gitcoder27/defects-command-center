export type WorkloadLevel = 'light' | 'medium' | 'heavy';
export type TeamScopeState = 'in_team' | 'out_of_team' | 'unassigned';
export type SyncScopeState = 'active' | 'inaccessible';

export type FilterType =
  | 'all'
  | 'new'
  | 'inProgress'
  | 'reopened'
  | 'unassigned'
  | 'dueToday'
  | 'dueThisWeek'
  | 'overdue'
  | 'blocked'
  | 'stale'
  | 'highPriority'
  | 'outOfTeam';

export interface LocalTag {
  id: number;
  name: string;
  color: string;
}

export interface Issue {
  jiraKey: string;
  summary: string;
  description?: string;
  aspenSeverity?: string;
  priorityName: string;
  priorityId: string;
  statusName: string;
  statusCategory: string;
  assigneeId?: string;
  assigneeName?: string;
  reporterName?: string;
  component?: string;
  labels: string[];
  dueDate?: string;
  developmentDueDate?: string;
  flagged: boolean;
  createdAt: string;
  updatedAt: string;
  teamScopeState?: TeamScopeState;
  syncScopeState?: SyncScopeState;
  lastSeenInScopedSyncAt?: string;
  lastReconciledAt?: string;
  scopeChangedAt?: string;
  localTags: LocalTag[];
  analysisNotes?: string;
}

export interface Developer {
  accountId: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  isActive: boolean;
}

export interface DeveloperWorkload {
  developer: Developer;
  activeDefects: number;
  dueToday: number;
  blocked: number;
  score: number;
  level: WorkloadLevel;
}

export interface OverviewCounts {
  new: number;
  unassigned: number;
  dueToday: number;
  dueThisWeek: number;
  overdue: number;
  blocked: number;
  stale: number;
  highPriority: number;
  inProgress: number;
  reopened: number;
  outOfTeam?: number;
  total: number;
  lastSynced?: string;
}

export type AlertType =
  | 'overdue'
  | 'stale'
  | 'blocked'
  | 'idle_developer'
  | 'high_priority_not_started';

export interface Alert {
  id: string;
  type: AlertType;
  severity: 'high' | 'medium';
  issueKey?: string;
  developerAccountId?: string;
  developerName?: string;
  message: string;
  detectedAt: string;
}

export interface AssignmentSuggestion {
  developer: Developer;
  score: number;
  reason: string;
}

export interface SyncStatus {
  lastSyncedAt?: string;
  status: 'idle' | 'syncing' | 'error';
  issuesSynced?: number;
  errorMessage?: string;
}

export interface DashboardConfig {
  jiraBaseUrl: string;
  jiraEmail: string;
  jiraProjectKey: string;
  jiraLeadAccountId: string;
  syncIntervalMs: number;
  staleThresholdHours: number;
  jiraSyncJql: string;
  jiraDevDueDateField: string;
  jiraAspenSeverityField: string;
  isConfigured: boolean;
}

export interface IssueUpdate {
  assigneeId?: string;
  priorityName?: string;
  dueDate?: string;
  developmentDueDate?: string;
  flagged?: boolean;
  analysisNotes?: string;
}

export interface PrioritySuggestion {
  suggested: string;
  reason: string;
}

export interface DueDateSuggestion {
  suggested: string;
  reason: string;
}

export interface TagCountItem {
  tagId: number;
  count: number;
}

export interface TagCountsResponse {
  counts: TagCountItem[];
  untaggedCount: number;
}

export interface ApiErrorResponse {
  error: string;
  status: number;
}
