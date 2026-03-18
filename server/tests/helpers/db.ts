import { db, rawDb } from "../../src/db/connection";
import { migrate } from "../../src/db/migrate";

export async function resetDatabase(): Promise<void> {
  migrate(rawDb);
  rawDb.exec(`
    DELETE FROM app_sessions;
    DELETE FROM app_users;
    DELETE FROM manager_desk_links;
    DELETE FROM manager_desk_items;
    DELETE FROM manager_desk_days;
    DELETE FROM developer_availability_periods;
    DELETE FROM team_tracker_checkins;
    DELETE FROM team_tracker_items;
    DELETE FROM team_tracker_days;
    DELETE FROM team_tracker_saved_views;
    DELETE FROM issue_scope_history;
    DELETE FROM issue_tags;
    DELETE FROM local_tags;
    DELETE FROM component_map;
    DELETE FROM issues;
    DELETE FROM developers;
    DELETE FROM sync_log;
    DELETE FROM config;
    DELETE FROM sqlite_sequence WHERE name IN ('app_users', 'local_tags', 'sync_log', 'issue_scope_history', 'team_tracker_days', 'developer_availability_periods', 'team_tracker_items', 'team_tracker_checkins', 'team_tracker_saved_views', 'manager_desk_days', 'manager_desk_items', 'manager_desk_links');
  `);
}

export { db };
