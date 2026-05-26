import "../load-env";

import { rawDb } from "../db/connection";
import { migrate } from "../db/migrate";
import {
  AuthUserMaintenanceService,
  type DeletableAuthUserRole,
  type AuthUserDeletionPreview,
} from "../services/auth-user-maintenance.service";

function usage(): string {
  return [
    "Usage:",
    "  npm run auth:delete-user --workspace=server -- --username <name> --workspace-id <workspace-id> --role <manager|developer> --confirm <name> [--purge-private-data]",
    "",
    "Dry run:",
    "  npm run auth:delete-user --workspace=server -- --username lead2 --workspace-id default --role manager --dry-run",
    "",
    "Examples:",
    "  npm run auth:delete-user --workspace=server -- --username lead2 --workspace-id default --role manager --confirm lead2",
    "  npm run auth:delete-user --workspace=server -- --username lead2 --workspace-id default --role manager --confirm lead2 --purge-private-data",
  ].join("\n");
}

function parseArgs(argv: string[]): Record<string, string> {
  const parsed: Record<string, string> = {};

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token?.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      parsed[key] = "true";
      continue;
    }

    parsed[key] = value;
    i += 1;
  }

  return parsed;
}

function parseRole(value?: string): DeletableAuthUserRole | undefined {
  if (value === "manager" || value === "developer") {
    return value;
  }
  return undefined;
}

function formatPreview(preview: AuthUserDeletionPreview, purgePrivateData: boolean): unknown {
  return {
    user: {
      username: preview.username,
      displayName: preview.displayName,
      role: preview.role,
      workspaceId: preview.workspaceId,
    },
    safety: {
      isWorkspaceOwner: preview.isWorkspaceOwner,
      activeManagerCount: preview.activeManagerCount,
      blockers: preview.blockers,
    },
    willDelete: {
      loginAccount: true,
      sessions: preview.privateData.sessionCount,
      privateData: purgePrivateData ? preview.privateData : "kept",
    },
  };
}

async function main(): Promise<void> {
  migrate(rawDb);

  const args = parseArgs(process.argv.slice(2));
  if (args.help === "true") {
    console.log(usage());
    return;
  }

  const username = args.username;
  const workspaceId = args["workspace-id"];
  const role = parseRole(args.role);
  const purgePrivateData = args["purge-private-data"] === "true";

  if (!username || !workspaceId || !role) {
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  const service = new AuthUserMaintenanceService();
  const preview = await service.getDeletionPreview({ username, workspaceId, role, purgePrivateData });
  console.log(JSON.stringify(formatPreview(preview, purgePrivateData), null, 2));

  if (preview.blockers.length > 0) {
    console.error(`Blocked: ${preview.blockers.join("; ")}`);
    process.exitCode = 1;
    return;
  }

  if (args["dry-run"] === "true") {
    console.log("Dry run only. No user was deleted.");
    return;
  }

  if (args.confirm !== preview.username) {
    console.error(`No deletion performed. Re-run with --confirm ${preview.username} after reviewing the preview.`);
    process.exitCode = 1;
    return;
  }

  await service.deleteUser({ username, workspaceId, role, purgePrivateData });
  console.log(JSON.stringify({ deleted: true, username: preview.username, workspaceId: preview.workspaceId }, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
