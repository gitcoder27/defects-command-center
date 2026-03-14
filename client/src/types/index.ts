export type WorkloadLevel = 'light' | 'medium' | 'heavy';
export type TeamScopeState = 'in_team' | 'out_of_team' | 'unassigned';
export type SyncScopeState = 'active' | 'inaccessible';

export type FilterType =
  | 'all'
  | 'new'
  | 'recentlyAssigned'
  | 'inProgress'
  | 'reopened'
  | 'unassigned'
  | 'dueToday'
  | 'dueThisWeek'
  | 'noDueDate'
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

export interface TagUsageIssuePreview {
  jiraKey: string;
  summary: string;
  assigneeName?: string;
  statusName: string;
  updatedAt: string;
}

export interface TagUsageResponse {
  tag: LocalTag;
  issueCount: number;
  issues: TagUsageIssuePreview[];
}

export interface TagDeleteResponse {
  success: true;
  removedIssueCount: number;
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
  excluded?: boolean;
}

export interface Developer {
  accountId: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  isActive: boolean;
  availability?: DeveloperAvailability;
}

export type DeveloperAvailabilityState = 'active' | 'inactive';

export interface DeveloperAvailability {
  state: DeveloperAvailabilityState;
  startDate?: string;
  endDate?: string;
  note?: string;
}

export interface DeveloperWorkload {
  developer: Developer;
  activeDefects: number;
  dueToday: number;
  blocked: number;
  score: number;
  level: WorkloadLevel;
  currentCount?: 0 | 1;
  plannedCount?: number;
  assignedTodayCount?: number;
  completedTodayCount?: number;
  droppedTodayCount?: number;
  trackerStatus?: TrackerDeveloperStatus;
  isTrackerStale?: boolean;
  hasCurrentItem?: boolean;
  capacityUnits?: number;
  capacityUsed?: number;
  capacityRemaining?: number;
  capacityUtilization?: number;
  signals?: {
    noCurrentItem: boolean;
    overCapacity: boolean;
    backlogTrackerMismatch: boolean;
  };
}

export interface OverviewCounts {
  new: number;
  recentlyAssigned: number;
  unassigned: number;
  dueToday: number;
  dueThisWeek: number;
  noDueDate: number;
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
  managerJiraAccountId: string;
  jiraApiToken: string;
  syncIntervalMs: number;
  staleThresholdHours: number;
  backupEnabled: boolean;
  backupIntervalMinutes: number;
  backupRetentionDays: number;
  backupMaxScheduledSnapshots: number;
  backupDirectory: string;
  backupOnStartup: boolean;
  backupStartupMaxAgeHours: number;
  backupBeforeReset: boolean;
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

// ── Auth types ──────────────────────────────────────────

export type UserRole = 'manager' | 'developer';

export interface AuthUser {
  username: string;
  accountId: string;
  displayName: string;
  role: UserRole;
  developerAccountId?: string;
}

export interface AuthSessionResponse {
  user: AuthUser;
}

export interface AuthBootstrapResponse {
  bootstrapOpen: boolean;
  userCount: number;
}

// ── My Day types ────────────────────────────────────────

export interface MyDayResponse {
  date: string;
  developer: Developer;
  status: TrackerDeveloperStatus;
  capacityUnits?: number;
  availability: DeveloperAvailability;
  isReadOnly: boolean;
  lastCheckInAt?: string;
  currentItem?: TrackerWorkItem;
  plannedItems: TrackerWorkItem[];
  completedItems: TrackerWorkItem[];
  droppedItems: TrackerWorkItem[];
  checkIns: TrackerCheckIn[];
  isStale: boolean;
}

// ── Team Tracker types ──────────────────────────────────

export type TrackerDeveloperStatus =
  | 'on_track'
  | 'at_risk'
  | 'blocked'
  | 'waiting'
  | 'done_for_today';

export type TrackerItemState = 'planned' | 'in_progress' | 'done' | 'dropped';
export type TrackerItemType = 'jira' | 'custom';

export interface TrackerCheckIn {
  id: number;
  dayId: number;
  summary: string;
  createdAt: string;
  authorType?: UserRole;
  authorAccountId?: string;
}

export interface TrackerWorkItem {
  id: number;
  dayId: number;
  itemType: TrackerItemType;
  jiraKey?: string;
  jiraSummary?: string;
  jiraPriorityName?: string;
  jiraDueDate?: string;
  title: string;
  state: TrackerItemState;
  position: number;
  note?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrackerDeveloperDay {
  id: number;
  date: string;
  developer: Developer;
  availability: DeveloperAvailability;
  status: TrackerDeveloperStatus;
  capacityUnits?: number;
  managerNotes?: string;
  lastCheckInAt?: string;
  currentItem?: TrackerWorkItem;
  plannedItems: TrackerWorkItem[];
  completedItems: TrackerWorkItem[];
  droppedItems: TrackerWorkItem[];
  checkIns: TrackerCheckIn[];
  isStale: boolean;
  signals: TrackerDeveloperSignals;
  statusUpdatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type TrackerAttentionReasonCode =
  | 'blocked'
  | 'at_risk'
  | 'stale_by_time'
  | 'stale_with_open_risk'
  | 'stale_without_current_work'
  | 'overdue_linked_work'
  | 'over_capacity'
  | 'status_change_without_follow_up'
  | 'no_current'
  | 'waiting';

export interface TrackerAttentionReason {
  code: TrackerAttentionReasonCode;
  label: string;
  priority: number;
}

export interface TrackerAttentionItem {
  developer: Developer;
  status: TrackerDeveloperStatus;
  reasons: TrackerAttentionReason[];
  lastCheckInAt?: string;
  isStale: boolean;
  signals: TrackerDeveloperSignals;
  hasCurrentItem: boolean;
  plannedCount: number;
}

export interface TeamTrackerBoardResponse {
  date: string;
  developers: TrackerDeveloperDay[];
  inactiveDevelopers: InactiveDeveloperListItem[];
  summary: TrackerBoardSummary;
  attentionQueue: TrackerAttentionItem[];
}

export interface InactiveDeveloperListItem {
  developer: Developer;
  availability: DeveloperAvailability;
}

export interface TrackerIssueAssignment {
  date: string;
  jiraKey: string;
  itemId: number;
  title: string;
  state: TrackerItemState;
  developer: Developer;
}

export interface TrackerBoardSummary {
  total: number;
  stale: number;
  blocked: number;
  atRisk: number;
  waiting: number;
  noCurrent: number;
  overdueLinkedWork: number;
  overCapacity: number;
  statusFollowUp: number;
  doneForToday: number;
}

export interface TrackerFreshnessSignals {
  staleThresholdHours: number;
  noCurrentThresholdHours: number;
  statusFollowUpThresholdHours: number;
  hoursSinceCheckIn?: number;
  hoursSinceStatusChange?: number;
  staleByTime: boolean;
  staleWithOpenRisk: boolean;
  staleWithoutCurrentWork: boolean;
  statusChangeWithoutFollowUp: boolean;
}

export interface TrackerRiskSignals {
  openRisk: boolean;
  overdueLinkedWork: boolean;
  overdueLinkedCount: number;
  overCapacity: boolean;
  capacityDelta: number;
}

export interface TrackerDeveloperSignals {
  freshness: TrackerFreshnessSignals;
  risk: TrackerRiskSignals;
}
