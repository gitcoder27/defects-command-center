import "dotenv/config";

import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { getDbPath, getDefaultBackupDirectory, resolveWorkspacePath } from "../db/paths";

function usage(): never {
  throw new Error("Usage: npm run backup:restore --workspace=server -- <backup-file>");
}

function verifyBackupFile(backupPath: string): void {
  const backupDb = new Database(backupPath, { readonly: true, fileMustExist: true });
  try {
    const tables = backupDb
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('issues', 'config', 'developers')")
      .all() as Array<{ name: string }>;
    if (tables.length < 3) {
      throw new Error(`Backup file is missing required tables: ${backupPath}`);
    }
  } finally {
    backupDb.close();
  }
}

function formatTimestamp(date: Date): string {
  return [
    date.getUTCFullYear().toString().padStart(4, "0"),
    (date.getUTCMonth() + 1).toString().padStart(2, "0"),
    date.getUTCDate().toString().padStart(2, "0"),
  ].join("") +
    "-" +
    [
      date.getUTCHours().toString().padStart(2, "0"),
      date.getUTCMinutes().toString().padStart(2, "0"),
      date.getUTCSeconds().toString().padStart(2, "0"),
    ].join("");
}

function main(): void {
  const backupArg = process.argv[2];
  if (!backupArg) {
    usage();
  }

  const dbPath = getDbPath();
  const backupPath = resolveWorkspacePath(backupArg);
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file does not exist: ${backupPath}`);
  }
  if (path.resolve(backupPath) === path.resolve(dbPath)) {
    throw new Error("Backup path and database path cannot be the same");
  }

  verifyBackupFile(backupPath);

  const dbDirectory = path.dirname(dbPath);
  const archiveDirectory = path.join(getDefaultBackupDirectory(), "restore-archive");
  fs.mkdirSync(archiveDirectory, { recursive: true });

  const timestamp = formatTimestamp(new Date());
  const dbArtifacts = [dbPath, `${dbPath}-wal`, `${dbPath}-shm`];
  for (const artifact of dbArtifacts) {
    if (!fs.existsSync(artifact)) {
      continue;
    }

    const archiveTarget = path.join(archiveDirectory, `${path.basename(artifact)}.${timestamp}`);
    fs.renameSync(artifact, archiveTarget);
    process.stdout.write(`Archived ${artifact} -> ${archiveTarget}\n`);
  }

  fs.mkdirSync(dbDirectory, { recursive: true });
  fs.copyFileSync(backupPath, dbPath);
  process.stdout.write(`Restored ${backupPath} -> ${dbPath}\n`);
  process.stdout.write("Start the server again after restore completes.\n");
}

main();
