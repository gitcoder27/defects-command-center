import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const issues = sqliteTable("issues", {
  jiraKey: text("jira_key").primaryKey(),
  summary: text("summary").notNull(),
  description: text("description"),
  aspenSeverity: text("aspen_severity"),
  priorityName: text("priority_name").notNull(),
  priorityId: text("priority_id").notNull(),
  statusName: text("status_name").notNull(),
  statusCategory: text("status_category").notNull(),
  assigneeId: text("assignee_id"),
  assigneeName: text("assignee_name"),
  teamScopeState: text("team_scope_state").notNull().default("in_team"),
  syncScopeState: text("sync_scope_state").notNull().default("active"),
  reporterName: text("reporter_name"),
  component: text("component"),
  labels: text("labels"),
  dueDate: text("due_date"),
  developmentDueDate: text("development_due_date"),
  flagged: integer("flagged").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  syncedAt: text("synced_at").notNull(),
  lastSeenInScopedSyncAt: text("last_seen_in_scoped_sync_at"),
  lastReconciledAt: text("last_reconciled_at"),
  scopeChangedAt: text("scope_changed_at"),
  analysisNotes: text("analysis_notes"),
  excluded: integer("excluded").notNull().default(0),
});

export const developers = sqliteTable("developers", {
  accountId: text("account_id").primaryKey(),
  displayName: text("display_name").notNull(),
  email: text("email"),
  avatarUrl: text("avatar_url"),
  isActive: integer("is_active").notNull().default(1),
});

export const appUsers = sqliteTable("app_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(),
  developerAccountId: text("developer_account_id"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const appSessions = sqliteTable("app_sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id").notNull(),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
});

export const alertDismissals = sqliteTable("alert_dismissals", {
  managerAccountId: text("manager_account_id").notNull(),
  alertId: text("alert_id").notNull(),
  dismissedAt: text("dismissed_at").notNull(),
});

export const componentMap = sqliteTable("component_map", {
  componentName: text("component_name").notNull(),
  accountId: text("account_id").notNull(),
  fixCount: integer("fix_count").notNull().default(0),
});

export const syncLog = sqliteTable("sync_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at"),
  status: text("status").notNull(),
  issuesSynced: integer("issues_synced").notNull().default(0),
  errorMessage: text("error_message"),
});

export const configTable = sqliteTable("config", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const localTags = sqliteTable("local_tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#6366f1"),
});

export const issueTags = sqliteTable("issue_tags", {
  jiraKey: text("jira_key").notNull(),
  tagId: integer("tag_id").notNull(),
});

export const issueScopeHistory = sqliteTable("issue_scope_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  jiraKey: text("jira_key").notNull(),
  observedAt: text("observed_at").notNull(),
  changeType: text("change_type").notNull(),
  fromAssigneeId: text("from_assignee_id"),
  toAssigneeId: text("to_assignee_id"),
  fromTeamScopeState: text("from_team_scope_state"),
  toTeamScopeState: text("to_team_scope_state"),
  fromSyncScopeState: text("from_sync_scope_state"),
  toSyncScopeState: text("to_sync_scope_state"),
  fromStatusCategory: text("from_status_category"),
  toStatusCategory: text("to_status_category"),
});

// ── Team Tracker tables ────────────────────────────────

export const teamTrackerDays = sqliteTable("team_tracker_days", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  developerAccountId: text("developer_account_id").notNull(),
  status: text("status").notNull().default("on_track"),
  capacityUnits: integer("capacity_units"),
  managerNotes: text("manager_notes"),
  lastCheckInAt: text("last_check_in_at"),
  nextFollowUpAt: text("next_follow_up_at"),
  statusUpdatedAt: text("status_updated_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const developerAvailabilityPeriods = sqliteTable("developer_availability_periods", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  developerAccountId: text("developer_account_id").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  note: text("note"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const teamTrackerItems = sqliteTable("team_tracker_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dayId: integer("day_id").notNull(),
  managerDeskItemId: integer("manager_desk_item_id"),
  itemType: text("item_type").notNull(),
  jiraKey: text("jira_key"),
  title: text("title").notNull(),
  state: text("state").notNull().default("planned"),
  position: integer("position").notNull().default(0),
  note: text("note"),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const teamTrackerCheckIns = sqliteTable("team_tracker_checkins", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dayId: integer("day_id").notNull(),
  summary: text("summary").notNull(),
  status: text("status"),
  rationale: text("rationale"),
  nextFollowUpAt: text("next_follow_up_at"),
  authorType: text("author_type").notNull().default("manager"),
  authorAccountId: text("author_account_id"),
  createdAt: text("created_at").notNull(),
});

export const teamTrackerSavedViews = sqliteTable("team_tracker_saved_views", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  managerAccountId: text("manager_account_id").notNull(),
  name: text("name").notNull(),
  searchQuery: text("search_query"),
  summaryFilter: text("summary_filter").notNull(),
  sortBy: text("sort_by").notNull(),
  groupBy: text("group_by").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ── Manager Desk tables ────────────────────────────────

export const managerDeskDays = sqliteTable("manager_desk_days", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  managerAccountId: text("manager_account_id").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const managerDeskItems = sqliteTable("manager_desk_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dayId: integer("day_id").notNull(),
  sourceItemId: integer("source_item_id"),
  assigneeDeveloperAccountId: text("assignee_developer_account_id"),
  title: text("title").notNull(),
  kind: text("kind").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull().default("inbox"),
  priority: text("priority").notNull().default("medium"),
  participants: text("participants"),
  contextNote: text("context_note"),
  nextAction: text("next_action"),
  outcome: text("outcome"),
  plannedStartAt: text("planned_start_at"),
  plannedEndAt: text("planned_end_at"),
  followUpAt: text("follow_up_at"),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const managerDeskLinks = sqliteTable("manager_desk_links", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id").notNull(),
  linkType: text("link_type").notNull(),
  issueKey: text("issue_key"),
  developerAccountId: text("developer_account_id"),
  externalLabel: text("external_label"),
  createdAt: text("created_at").notNull(),
});

export const managerDeskItemHistory = sqliteTable("manager_desk_item_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id").notNull(),
  managerAccountId: text("manager_account_id").notNull(),
  eventType: text("event_type").notNull(),
  snapshotJson: text("snapshot_json").notNull(),
  recordedAt: text("recorded_at").notNull(),
});
