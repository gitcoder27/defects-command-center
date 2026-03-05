import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

function resolveWorkspaceRoot(): string {
	const cwd = process.cwd();
	if (path.basename(cwd).toLowerCase() === "server") {
		return path.dirname(cwd);
	}
	return cwd;
}

const workspaceRoot = resolveWorkspaceRoot();
function resolveDbPath(): string {
  const configuredPath = process.env.DASHBOARD_DB_PATH?.trim();
  if (configuredPath) {
    return path.isAbsolute(configuredPath) ? configuredPath : path.resolve(workspaceRoot, configuredPath);
  }

  if (process.env.VITEST) {
    return path.resolve(workspaceRoot, "data", "dashboard.test.db");
  }

  return path.resolve(workspaceRoot, "data", "dashboard.db");
}

const dbPath = resolveDbPath();
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

export const rawDb = sqlite;
export const db = drizzle(sqlite);
