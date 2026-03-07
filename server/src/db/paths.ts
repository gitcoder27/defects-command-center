import path from "node:path";

export function resolveWorkspaceRoot(): string {
  const cwd = process.cwd();
  if (path.basename(cwd).toLowerCase() === "server") {
    return path.dirname(cwd);
  }
  return cwd;
}

export const workspaceRoot = resolveWorkspaceRoot();

export function resolveWorkspacePath(targetPath: string): string {
  return path.isAbsolute(targetPath) ? targetPath : path.resolve(workspaceRoot, targetPath);
}

export function getDbPath(): string {
  const configuredPath = process.env.DASHBOARD_DB_PATH?.trim();
  if (configuredPath) {
    return resolveWorkspacePath(configuredPath);
  }

  if (process.env.VITEST) {
    return path.resolve(workspaceRoot, "data", "dashboard.test.db");
  }

  return path.resolve(workspaceRoot, "data", "dashboard.db");
}

export function getDefaultBackupDirectory(): string {
  return path.resolve(workspaceRoot, "data", "backups");
}
