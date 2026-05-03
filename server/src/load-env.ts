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

loadEnvFile({
  path: path.resolve(workspaceRoot, ".env"),
  override: false,
});

const nodeEnv = process.env.NODE_ENV?.trim() || "development";
const localEnvFiles = nodeEnv === "production"
  ? []
  : [".env.local", `.env.${nodeEnv}.local`];

for (const fileName of localEnvFiles) {
  loadEnvFile({
    path: path.resolve(workspaceRoot, fileName),
    override: false,
  });
}
