import BetterSqlite3 from "better-sqlite3";

const ddl = `
CREATE TABLE IF NOT EXISTS issues (
  jira_key        TEXT PRIMARY KEY,
  summary         TEXT NOT NULL,
  description     TEXT,
  priority_name   TEXT NOT NULL,
  priority_id     TEXT NOT NULL,
  status_name     TEXT NOT NULL,
  status_category TEXT NOT NULL,
  assignee_id     TEXT,
  assignee_name   TEXT,
  reporter_name   TEXT,
  component       TEXT,
  labels          TEXT,
  due_date        TEXT,
  flagged         INTEGER DEFAULT 0,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  synced_at       TEXT NOT NULL
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
`;

const alterStatements = [
  "ALTER TABLE issues ADD COLUMN development_due_date TEXT",
  "ALTER TABLE issues ADD COLUMN analysis_notes TEXT",
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
