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

CREATE TABLE IF NOT EXISTS app_users (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  username             TEXT NOT NULL UNIQUE,
  display_name         TEXT NOT NULL,
  password_hash        TEXT NOT NULL,
  role                 TEXT NOT NULL,
  developer_account_id TEXT,
  is_active            INTEGER NOT NULL DEFAULT 1,
  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_sessions (
  id           TEXT PRIMARY KEY,
  user_id      INTEGER NOT NULL,
  created_at   TEXT NOT NULL,
  expires_at   TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES app_users(id)
);

CREATE TABLE IF NOT EXISTS alert_dismissals (
  manager_account_id TEXT NOT NULL,
  alert_id           TEXT NOT NULL,
  dismissed_at       TEXT NOT NULL
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

CREATE TABLE IF NOT EXISTS team_tracker_days (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  date                  TEXT NOT NULL,
  developer_account_id  TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'on_track',
  capacity_units        INTEGER,
  manager_notes         TEXT,
  last_check_in_at      TEXT,
  next_follow_up_at     TEXT,
  status_updated_at     TEXT,
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL,
  UNIQUE(date, developer_account_id)
);

CREATE TABLE IF NOT EXISTS developer_availability_periods (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  developer_account_id  TEXT NOT NULL,
  start_date            TEXT NOT NULL,
  end_date              TEXT,
  note                  TEXT,
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS team_tracker_items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  day_id        INTEGER NOT NULL,
  manager_desk_item_id INTEGER,
  item_type     TEXT NOT NULL,
  jira_key      TEXT,
  title         TEXT NOT NULL,
  state         TEXT NOT NULL DEFAULT 'planned',
  position      INTEGER NOT NULL DEFAULT 0,
  note          TEXT,
  completed_at  TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  FOREIGN KEY (day_id) REFERENCES team_tracker_days(id)
);

CREATE TABLE IF NOT EXISTS team_tracker_checkins (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  day_id      INTEGER NOT NULL,
  summary     TEXT NOT NULL,
  status      TEXT,
  rationale   TEXT,
  next_follow_up_at TEXT,
  author_type TEXT NOT NULL DEFAULT 'manager',
  author_account_id TEXT,
  created_at  TEXT NOT NULL,
  FOREIGN KEY (day_id) REFERENCES team_tracker_days(id)
);

CREATE TABLE IF NOT EXISTS team_tracker_saved_views (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  manager_account_id TEXT NOT NULL,
  name               TEXT NOT NULL,
  search_query       TEXT,
  summary_filter     TEXT NOT NULL,
  sort_by            TEXT NOT NULL,
  group_by           TEXT NOT NULL,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS manager_desk_days (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  date               TEXT NOT NULL,
  manager_account_id TEXT NOT NULL,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL,
  UNIQUE(date, manager_account_id)
);

CREATE TABLE IF NOT EXISTS manager_desk_items (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  day_id           INTEGER NOT NULL,
  source_item_id   INTEGER,
  assignee_developer_account_id TEXT,
  title            TEXT NOT NULL,
  kind             TEXT NOT NULL,
  category         TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'inbox',
  priority         TEXT NOT NULL DEFAULT 'medium',
  participants     TEXT,
  context_note     TEXT,
  next_action      TEXT,
  outcome          TEXT,
  planned_start_at TEXT,
  planned_end_at   TEXT,
  follow_up_at     TEXT,
  completed_at     TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  FOREIGN KEY (day_id) REFERENCES manager_desk_days(id),
  FOREIGN KEY (source_item_id) REFERENCES manager_desk_items(id)
);

CREATE TABLE IF NOT EXISTS manager_desk_links (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id              INTEGER NOT NULL,
  link_type            TEXT NOT NULL,
  issue_key            TEXT,
  developer_account_id TEXT,
  external_label       TEXT,
  created_at           TEXT NOT NULL,
  FOREIGN KEY (item_id) REFERENCES manager_desk_items(id)
);

CREATE TABLE IF NOT EXISTS manager_desk_item_history (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id            INTEGER NOT NULL,
  manager_account_id TEXT NOT NULL,
  event_type         TEXT NOT NULL,
  snapshot_json      TEXT NOT NULL,
  recorded_at        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_app_users_username ON app_users(username);
CREATE INDEX IF NOT EXISTS idx_app_users_dev_account ON app_users(developer_account_id);
CREATE INDEX IF NOT EXISTS idx_app_sessions_user ON app_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_app_sessions_expires ON app_sessions(expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_alert_dismissals_manager_alert ON alert_dismissals(manager_account_id, alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_dismissals_manager ON alert_dismissals(manager_account_id);
CREATE INDEX IF NOT EXISTS idx_tracker_days_date ON team_tracker_days(date);
CREATE INDEX IF NOT EXISTS idx_tracker_days_dev ON team_tracker_days(developer_account_id);
CREATE INDEX IF NOT EXISTS idx_dev_availability_dev_dates ON developer_availability_periods(developer_account_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_tracker_items_day ON team_tracker_items(day_id);
CREATE INDEX IF NOT EXISTS idx_tracker_checkins_day ON team_tracker_checkins(day_id);
CREATE INDEX IF NOT EXISTS idx_tracker_saved_views_manager ON team_tracker_saved_views(manager_account_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tracker_saved_views_manager_name ON team_tracker_saved_views(manager_account_id, name);
CREATE INDEX IF NOT EXISTS idx_manager_desk_days_manager_date ON manager_desk_days(manager_account_id, date);
CREATE INDEX IF NOT EXISTS idx_manager_desk_items_day ON manager_desk_items(day_id);
CREATE INDEX IF NOT EXISTS idx_manager_desk_items_status ON manager_desk_items(status);
CREATE INDEX IF NOT EXISTS idx_manager_desk_items_follow_up_at ON manager_desk_items(follow_up_at);
CREATE INDEX IF NOT EXISTS idx_manager_desk_items_source_item_id ON manager_desk_items(source_item_id);
CREATE INDEX IF NOT EXISTS idx_manager_desk_links_item ON manager_desk_links(item_id);
CREATE INDEX IF NOT EXISTS idx_manager_desk_links_issue_key ON manager_desk_links(issue_key);
CREATE INDEX IF NOT EXISTS idx_manager_desk_links_developer_account_id ON manager_desk_links(developer_account_id);
CREATE INDEX IF NOT EXISTS idx_manager_desk_item_history_item_recorded ON manager_desk_item_history(item_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_manager_desk_item_history_manager_recorded ON manager_desk_item_history(manager_account_id, recorded_at);
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
  "CREATE TABLE IF NOT EXISTS alert_dismissals (manager_account_id TEXT NOT NULL, alert_id TEXT NOT NULL, dismissed_at TEXT NOT NULL)",
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_alert_dismissals_manager_alert ON alert_dismissals(manager_account_id, alert_id)",
  "CREATE INDEX IF NOT EXISTS idx_alert_dismissals_manager ON alert_dismissals(manager_account_id)",
  "ALTER TABLE issues ADD COLUMN excluded INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE team_tracker_days ADD COLUMN capacity_units INTEGER",
  "ALTER TABLE team_tracker_days ADD COLUMN next_follow_up_at TEXT",
  "ALTER TABLE team_tracker_days ADD COLUMN status_updated_at TEXT",
  "CREATE TABLE IF NOT EXISTS developer_availability_periods (id INTEGER PRIMARY KEY AUTOINCREMENT, developer_account_id TEXT NOT NULL, start_date TEXT NOT NULL, end_date TEXT, note TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
  "CREATE INDEX IF NOT EXISTS idx_dev_availability_dev_dates ON developer_availability_periods(developer_account_id, start_date, end_date)",
  "ALTER TABLE team_tracker_checkins ADD COLUMN status TEXT",
  "ALTER TABLE team_tracker_checkins ADD COLUMN rationale TEXT",
  "ALTER TABLE team_tracker_checkins ADD COLUMN next_follow_up_at TEXT",
  "ALTER TABLE team_tracker_checkins ADD COLUMN author_type TEXT NOT NULL DEFAULT 'manager'",
  "ALTER TABLE team_tracker_checkins ADD COLUMN author_account_id TEXT",
  "CREATE TABLE IF NOT EXISTS team_tracker_saved_views (id INTEGER PRIMARY KEY AUTOINCREMENT, manager_account_id TEXT NOT NULL, name TEXT NOT NULL, search_query TEXT, summary_filter TEXT NOT NULL DEFAULT 'all', sort_by TEXT NOT NULL DEFAULT 'name', group_by TEXT NOT NULL DEFAULT 'none', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
  "CREATE INDEX IF NOT EXISTS idx_tracker_saved_views_manager ON team_tracker_saved_views(manager_account_id)",
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_tracker_saved_views_manager_name ON team_tracker_saved_views(manager_account_id, name)",
  "ALTER TABLE team_tracker_items ADD COLUMN manager_desk_item_id INTEGER",
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_tracker_items_manager_desk_item_id ON team_tracker_items(manager_desk_item_id) WHERE manager_desk_item_id IS NOT NULL",
  "ALTER TABLE manager_desk_items ADD COLUMN source_item_id INTEGER",
  "ALTER TABLE manager_desk_items ADD COLUMN assignee_developer_account_id TEXT",
  "CREATE INDEX IF NOT EXISTS idx_manager_desk_days_manager_date ON manager_desk_days(manager_account_id, date)",
  "CREATE INDEX IF NOT EXISTS idx_manager_desk_items_day ON manager_desk_items(day_id)",
  "CREATE INDEX IF NOT EXISTS idx_manager_desk_items_assignee ON manager_desk_items(assignee_developer_account_id)",
  "CREATE INDEX IF NOT EXISTS idx_manager_desk_items_status ON manager_desk_items(status)",
  "CREATE INDEX IF NOT EXISTS idx_manager_desk_items_follow_up_at ON manager_desk_items(follow_up_at)",
  "CREATE INDEX IF NOT EXISTS idx_manager_desk_items_source_item_id ON manager_desk_items(source_item_id)",
  "CREATE INDEX IF NOT EXISTS idx_manager_desk_links_item ON manager_desk_links(item_id)",
  "CREATE INDEX IF NOT EXISTS idx_manager_desk_links_issue_key ON manager_desk_links(issue_key)",
  "CREATE INDEX IF NOT EXISTS idx_manager_desk_links_developer_account_id ON manager_desk_links(developer_account_id)",
  "CREATE TABLE IF NOT EXISTS manager_desk_item_history (id INTEGER PRIMARY KEY AUTOINCREMENT, item_id INTEGER NOT NULL, manager_account_id TEXT NOT NULL, event_type TEXT NOT NULL, snapshot_json TEXT NOT NULL, recorded_at TEXT NOT NULL)",
  "CREATE INDEX IF NOT EXISTS idx_manager_desk_item_history_item_recorded ON manager_desk_item_history(item_id, recorded_at)",
  "CREATE INDEX IF NOT EXISTS idx_manager_desk_item_history_manager_recorded ON manager_desk_item_history(manager_account_id, recorded_at)",
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
