import { and, eq } from "drizzle-orm";
import { db } from "../db/connection";
import { configTable } from "../db/schema";
import { decryptSecret, encryptSecret } from "./secret-crypto";
import { setJiraApiToken } from "../runtime-credentials";
import { normalizeWorkspaceId } from "./workspace.service";

const JIRA_API_TOKEN_KEY = "jira_api_token";

export async function getPersistedJiraApiToken(workspaceId?: string): Promise<string | undefined> {
  const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
  const rows = await db
    .select()
    .from(configTable)
    .where(and(eq(configTable.workspaceId, normalizedWorkspaceId), eq(configTable.key, JIRA_API_TOKEN_KEY)))
    .limit(1);
  const row = rows[0];
  const value = row?.value;
  return value ? decryptSecret(value) : undefined;
}

export async function storeJiraApiToken(token: string, workspaceId?: string): Promise<void> {
  const trimmed = token.trim();
  if (!trimmed) {
    return;
  }

  const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
  const encrypted = encryptSecret(trimmed);
  await db
    .insert(configTable)
    .values({ workspaceId: normalizedWorkspaceId, key: JIRA_API_TOKEN_KEY, value: encrypted })
    .onConflictDoUpdate({ target: [configTable.workspaceId, configTable.key], set: { value: encrypted } });
  setJiraApiToken(trimmed, normalizedWorkspaceId);
}
