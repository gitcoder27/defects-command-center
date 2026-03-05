import { db, rawDb } from "../../src/db/connection";
import { migrate } from "../../src/db/migrate";

export async function resetDatabase(): Promise<void> {
  migrate(rawDb);
  rawDb.exec(`
    DELETE FROM issue_tags;
    DELETE FROM local_tags;
    DELETE FROM issues;
    DELETE FROM developers;
    DELETE FROM component_map;
    DELETE FROM sync_log;
    DELETE FROM config;
  `);
}

export { db };
