import BetterSqlite3 from "better-sqlite3";

const ddl = `
CREATE TABLE IF NOT EXISTS issues (
  jira_key        TEXT PRIMARY KEY,
  summary         TEXT NOT NULL,
  description     TEXT,
  aspen_severity  TEXT,
  priority_name   TEXT NOT NULL,
  priority_id     TEXT NOT NULL,
  status_name     TEXT NOT NULL,
  status_category TEXT NOT NULL,
  assignee_id     TEXT,
  assignee_name   TEXT,
  team_scope_state TEXT NOT NULL DEFAULT 'in_team',
  sync_scope_state TEXT NOT NULL DEFAULT 'active',
  reporter_name   TEXT,
  component       TEXT,
  labels          TEXT,
  due_date        TEXT,
  flagged         INTEGER DEFAULT 0,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  synced_at       TEXT NOT NULL,
  last_seen_in_scoped_sync_at TEXT,
  last_reconciled_at TEXT,
  scope_changed_at TEXT
);

CREATE TABLE IF NOT EXISTS developers (
  account_id   TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  email        TEXT,
  avatar_url   TEXT,
  is_active    INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS component_map (
  component_name TEXT NOT NULL,
  account_id     TEXT NOT NULL,
  fix_count      INTEGER DEFAULT 0,
  PRIMARY KEY (component_name, account_id),
  FOREIGN KEY (account_id) REFERENCES developers(account_id)
);

CREATE TABLE IF NOT EXISTS sync_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at    TEXT NOT NULL,
  completed_at  TEXT,
  status        TEXT NOT NULL,
  issues_synced INTEGER DEFAULT 0,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_issues_assignee ON issues(assignee_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status_category);
CREATE INDEX IF NOT EXISTS idx_issues_priority ON issues(priority_name);
CREATE INDEX IF NOT EXISTS idx_issues_due_date ON issues(due_date);
CREATE INDEX IF NOT EXISTS idx_issues_updated ON issues(updated_at);
CREATE INDEX IF NOT EXISTS idx_issues_flagged ON issues(flagged);

CREATE TABLE IF NOT EXISTS local_tags (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6366f1'
);

CREATE TABLE IF NOT EXISTS issue_tags (
  jira_key TEXT NOT NULL,
  tag_id   INTEGER NOT NULL,
  PRIMARY KEY (jira_key, tag_id),
  FOREIGN KEY (jira_key) REFERENCES issues(jira_key),
  FOREIGN KEY (tag_id)   REFERENCES local_tags(id)
);

CREATE TABLE IF NOT EXISTS issue_scope_history (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  jira_key              TEXT NOT NULL,
  observed_at           TEXT NOT NULL,
  change_type           TEXT NOT NULL,
  from_assignee_id      TEXT,
  to_assignee_id        TEXT,
  from_team_scope_state TEXT,
  to_team_scope_state   TEXT,
  from_sync_scope_state TEXT,
  to_sync_scope_state   TEXT,
  from_status_category  TEXT,
  to_status_category    TEXT,
  FOREIGN KEY (jira_key) REFERENCES issues(jira_key)
);
`;

const alterStatements = [
  "ALTER TABLE issues ADD COLUMN aspen_severity TEXT",
  "ALTER TABLE issues ADD COLUMN development_due_date TEXT",
  "ALTER TABLE issues ADD COLUMN analysis_notes TEXT",
  "ALTER TABLE issues ADD COLUMN team_scope_state TEXT NOT NULL DEFAULT 'in_team'",
  "ALTER TABLE issues ADD COLUMN sync_scope_state TEXT NOT NULL DEFAULT 'active'",
  "ALTER TABLE issues ADD COLUMN last_seen_in_scoped_sync_at TEXT",
  "ALTER TABLE issues ADD COLUMN last_reconciled_at TEXT",
  "ALTER TABLE issues ADD COLUMN scope_changed_at TEXT",
  "CREATE INDEX IF NOT EXISTS idx_issues_team_scope ON issues(team_scope_state)",
  "CREATE INDEX IF NOT EXISTS idx_issues_sync_scope ON issues(sync_scope_state)",
  "CREATE INDEX IF NOT EXISTS idx_issues_workload_scope ON issues(team_scope_state, sync_scope_state, status_category, assignee_id)",
  "CREATE INDEX IF NOT EXISTS idx_issue_scope_history_key_observed ON issue_scope_history(jira_key, observed_at DESC)",
];

export function migrate(sqlite: BetterSqlite3.Database): void {
  sqlite.exec(ddl);
  for (const stmt of alterStatements) {
    try {
      sqlite.exec(stmt);
    } catch (_) {
      // Column already exists
    }
  }
}
