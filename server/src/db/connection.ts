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
const dataDir = path.resolve(workspaceRoot, "data");
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.resolve(dataDir, "dashboard.db");

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

export const rawDb = sqlite;
export const db = drizzle(sqlite);
