import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const issues = sqliteTable("issues", {
  jiraKey: text("jira_key").primaryKey(),
  summary: text("summary").notNull(),
  description: text("description"),
  priorityName: text("priority_name").notNull(),
  priorityId: text("priority_id").notNull(),
  statusName: text("status_name").notNull(),
  statusCategory: text("status_category").notNull(),
  assigneeId: text("assignee_id"),
  assigneeName: text("assignee_name"),
  reporterName: text("reporter_name"),
  component: text("component"),
  labels: text("labels"),
  dueDate: text("due_date"),
  developmentDueDate: text("development_due_date"),
  flagged: integer("flagged").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  syncedAt: text("synced_at").notNull(),
  analysisNotes: text("analysis_notes"),
});

export const developers = sqliteTable("developers", {
  accountId: text("account_id").primaryKey(),
  displayName: text("display_name").notNull(),
  email: text("email"),
  avatarUrl: text("avatar_url"),
  isActive: integer("is_active").notNull().default(1),
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
