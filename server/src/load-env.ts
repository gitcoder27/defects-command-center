import path from "node:path";
import { config as loadEnvFile } from "dotenv";

function getWorkspaceRoot(): string {
  const cwd = process.cwd();
  if (path.basename(cwd).toLowerCase() === "server") {
    return path.dirname(cwd);
  }
  return cwd;
}

const workspaceRoot = getWorkspaceRoot();

for (const fileName of [".env", ".env.local", ".env.development.local"]) {
  loadEnvFile({
    path: path.resolve(workspaceRoot, fileName),
    override: true,
  });
}
