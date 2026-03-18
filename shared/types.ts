export type WorkloadLevel = "light" | "medium" | "heavy";
export type TeamScopeState = "in_team" | "out_of_team" | "unassigned";
export type SyncScopeState = "active" | "inaccessible";

export type FilterType =
  | "all"
  | "new"
  | "recentlyAssigned"
  | "inProgress"
  | "reopened"
  | "unassigned"
  | "dueToday"
  | "dueThisWeek"
  | "noDueDate"
  | "overdue"
  | "blocked"
  | "stale"
  | "highPriority"
  | "outOfTeam";

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
  trackerAssignmentsToday?: IssueTrackerAssignmentSummary;
  excluded?: boolean;
}

export interface IssueTrackerAssignmentSummary {
  activeCount: number;
  developerNames: string[];
}

export interface Developer {
  accountId: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  isActive: boolean;
  availability?: DeveloperAvailability;
}

export type DeveloperAvailabilityState = "active" | "inactive";

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
  | "overdue"
  | "stale"
  | "blocked"
  | "idle_developer"
  | "high_priority_not_started";

export interface Alert {
  id: string;
  type: AlertType;
  severity: "high" | "medium";
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
  status: "idle" | "syncing" | "error";
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

export interface IssueListOptions {
  trackerDate?: string;
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

export type UserRole = "manager" | "developer";

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

// ── Team Tracker types ──────────────────────────────────

export type TrackerDeveloperStatus =
  | "on_track"
  | "at_risk"
  | "blocked"
  | "waiting"
  | "done_for_today";

export type TrackerItemState = "planned" | "in_progress" | "done" | "dropped";
export type TrackerItemType = "jira" | "custom";
export type TrackerTaskLifecycle = "tracker_only" | "manager_desk_linked";

export interface TrackerCheckIn {
  id: number;
  dayId: number;
  summary: string;
  createdAt: string;
  authorType?: UserRole;
  authorAccountId?: string;
  status?: TrackerDeveloperStatus;
  rationale?: string;
  nextFollowUpAt?: string;
}

export interface TrackerWorkItem {
  id: number;
  dayId: number;
  managerDeskItemId?: number;
  lifecycle: TrackerTaskLifecycle;
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
  nextFollowUpAt?: string;
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
  | "blocked"
  | "at_risk"
  | "stale_by_time"
  | "stale_with_open_risk"
  | "stale_without_current_work"
  | "overdue_linked_work"
  | "over_capacity"
  | "status_change_without_follow_up"
  | "no_current"
  | "waiting";

export interface TrackerAttentionReason {
  code: TrackerAttentionReasonCode;
  label: string;
  priority: number;
}

export type TrackerAttentionQuickAction =
  | "update_status"
  | "set_current"
  | "mark_inactive"
  | "capture_follow_up";

export interface TrackerAttentionActionItem {
  id: number;
  title: string;
  jiraKey?: string;
  lifecycle: TrackerTaskLifecycle;
}

export interface TrackerAttentionItem {
  developer: Developer;
  status: TrackerDeveloperStatus;
  reasons: TrackerAttentionReason[];
  lastCheckInAt?: string;
  nextFollowUpAt?: string;
  isStale: boolean;
  signals: TrackerDeveloperSignals;
  hasCurrentItem: boolean;
  plannedCount: number;
  availableQuickActions: TrackerAttentionQuickAction[];
  setCurrentCandidates: TrackerAttentionActionItem[];
}

export type TrackerBoardSummaryFilter =
  | "all"
  | "stale"
  | "blocked"
  | "at_risk"
  | "waiting"
  | "overdue_linked"
  | "over_capacity"
  | "status_follow_up"
  | "no_current"
  | "done_for_today";

export type TeamTrackerBoardSort =
  | "name"
  | "attention"
  | "stale_age"
  | "load"
  | "blocked_first";

export type TeamTrackerBoardGroupBy =
  | "none"
  | "status"
  | "attention_state";

export interface TeamTrackerBoardQuery {
  q?: string;
  summaryFilter?: TrackerBoardSummaryFilter;
  sortBy?: TeamTrackerBoardSort;
  groupBy?: TeamTrackerBoardGroupBy;
  viewId?: number;
}

export interface TeamTrackerBoardResolvedQuery {
  q: string;
  summaryFilter: TrackerBoardSummaryFilter;
  sortBy: TeamTrackerBoardSort;
  groupBy: TeamTrackerBoardGroupBy;
  viewId?: number;
}

export interface TrackerDeveloperGroup {
  key: string;
  label: string;
  count: number;
  developers: TrackerDeveloperDay[];
}

export interface TeamTrackerSavedView {
  id: number;
  name: string;
  q: string;
  summaryFilter: TrackerBoardSummaryFilter;
  sortBy: TeamTrackerBoardSort;
  groupBy: TeamTrackerBoardGroupBy;
  createdAt: string;
  updatedAt: string;
}

export interface TeamTrackerBoardResponse {
  date: string;
  developers: TrackerDeveloperDay[];
  inactiveDevelopers: InactiveDeveloperListItem[];
  summary: TrackerBoardSummary;
  visibleSummary: TrackerBoardSummary;
  groups: TrackerDeveloperGroup[];
  query: TeamTrackerBoardResolvedQuery;
  attentionQueue: TrackerAttentionItem[];
}

export interface InactiveDeveloperListItem {
  developer: Developer;
  availability: DeveloperAvailability;
}

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

// ── Manager Desk types ─────────────────────────────────

export type ManagerDeskItemKind =
  | "action"
  | "meeting"
  | "decision"
  | "waiting";

export type ManagerDeskCategory =
  | "analysis"
  | "design"
  | "team_management"
  | "cross_team"
  | "follow_up"
  | "escalation"
  | "admin"
  | "planning"
  | "other";

export type ManagerDeskStatus =
  | "inbox"
  | "planned"
  | "in_progress"
  | "waiting"
  | "done"
  | "cancelled";

export type ManagerDeskPriority = "low" | "medium" | "high" | "critical";

export type ManagerDeskLinkType =
  | "issue"
  | "developer"
  | "external_group";

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

export interface ManagerDeskAssignee {
  accountId: string;
  displayName: string;
  avatarUrl?: string;
  availability?: DeveloperAvailability;
}

export interface ManagerDeskItem {
  id: number;
  dayId: number;
  title: string;
  kind: ManagerDeskItemKind;
  category: ManagerDeskCategory;
  status: ManagerDeskStatus;
  priority: ManagerDeskPriority;
  assigneeDeveloperAccountId?: string;
  participants?: string;
  contextNote?: string;
  nextAction?: string;
  outcome?: string;
  plannedStartAt?: string;
  plannedEndAt?: string;
  followUpAt?: string;
  completedAt?: string;
  assignee?: ManagerDeskAssignee;
  createdAt: string;
  updatedAt: string;
  links: ManagerDeskLink[];
}

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

export interface ManagerDeskDayResponse {
  date: string;
  items: ManagerDeskItem[];
  summary: ManagerDeskSummary;
}

export interface TrackerSharedTaskDetailResponse {
  date: string;
  developer: Developer;
  lifecycle: TrackerTaskLifecycle;
  managerDeskItem?: ManagerDeskItem;
  trackerItem: TrackerWorkItem;
}

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
