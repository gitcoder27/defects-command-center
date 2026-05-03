import { beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { db, rawDb } from "../src/db/connection";
import { migrate } from "../src/db/migrate";
import { configTable } from "../src/db/schema";
import { getPersistedJiraApiToken } from "../src/services/jira-credentials.service";
import { isEncryptedSecret } from "../src/services/secret-crypto";
import { resetDatabase } from "./helpers/db";

describe("database migrations", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("repairs duplicate manager and tracker day rows before adding unique indexes", () => {
    const oldDb = new Database(":memory:");
    try {
      oldDb.exec(`
        CREATE TABLE team_tracker_days (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL,
          developer_account_id TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'on_track',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE manager_desk_days (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL,
          manager_account_id TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        INSERT INTO team_tracker_days (date, developer_account_id, status, created_at, updated_at)
        VALUES
          ('2026-03-07', 'dev-1', 'on_track', '2026-03-07T08:00:00.000Z', '2026-03-07T08:00:00.000Z'),
          ('2026-03-07', 'dev-1', 'blocked', '2026-03-07T09:00:00.000Z', '2026-03-07T09:00:00.000Z');

        INSERT INTO manager_desk_days (date, manager_account_id, created_at, updated_at)
        VALUES
          ('2026-03-07', 'manager-1', '2026-03-07T08:00:00.000Z', '2026-03-07T08:00:00.000Z'),
          ('2026-03-07', 'manager-1', '2026-03-07T09:00:00.000Z', '2026-03-07T09:00:00.000Z');
      `);

      migrate(oldDb);

      const trackerCount = oldDb
        .prepare("SELECT COUNT(*) AS count FROM team_tracker_days WHERE date = ? AND developer_account_id = ?")
        .get("2026-03-07", "dev-1") as { count: number };
      const deskCount = oldDb
        .prepare("SELECT COUNT(*) AS count FROM manager_desk_days WHERE date = ? AND manager_account_id = ?")
        .get("2026-03-07", "manager-1") as { count: number };

      expect(trackerCount.count).toBe(1);
      expect(deskCount.count).toBe(1);
      expect(() => {
        oldDb
          .prepare(
            "INSERT INTO team_tracker_days (date, developer_account_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
          )
          .run("2026-03-07", "dev-1", "on_track", "2026-03-07T10:00:00.000Z", "2026-03-07T10:00:00.000Z");
      }).toThrow();
    } finally {
      oldDb.close();
    }
  });

  it("encrypts legacy plaintext Jira tokens during idempotent migration", async () => {
    await db.insert(configTable).values({ key: "jira_api_token", value: "legacy-token" });

    migrate(rawDb);

    const row = rawDb.prepare("SELECT value FROM config WHERE key = ?").get("jira_api_token") as { value: string };
    expect(row.value).not.toBe("legacy-token");
    expect(isEncryptedSecret(row.value)).toBe(true);
    expect(await getPersistedJiraApiToken()).toBe("legacy-token");
  });
});
