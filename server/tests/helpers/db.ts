import { db, rawDb } from "../../src/db/connection";
import { migrate } from "../../src/db/migrate";

export async function resetDatabase(): Promise<void> {
  migrate(rawDb);
  rawDb.exec(`
    DELETE FROM issue_scope_history;
    DELETE FROM issue_tags;
    DELETE FROM local_tags;
    DELETE FROM component_map;
    DELETE FROM issues;
    DELETE FROM developers;
    DELETE FROM sync_log;
    DELETE FROM config;
    DELETE FROM sqlite_sequence WHERE name IN ('local_tags', 'sync_log', 'issue_scope_history');
  `);
}

export { db };
