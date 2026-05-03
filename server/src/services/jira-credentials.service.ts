import { eq } from "drizzle-orm";
import { db } from "../db/connection";
import { configTable } from "../db/schema";
import { decryptSecret, encryptSecret } from "./secret-crypto";
import { setJiraApiToken } from "../runtime-credentials";

const JIRA_API_TOKEN_KEY = "jira_api_token";

export async function getPersistedJiraApiToken(): Promise<string | undefined> {
  const rows = await db.select().from(configTable).where(eq(configTable.key, JIRA_API_TOKEN_KEY)).limit(1);
  const value = rows[0]?.value;
  return value ? decryptSecret(value) : undefined;
}

export async function storeJiraApiToken(token: string): Promise<void> {
  const trimmed = token.trim();
  if (!trimmed) {
    return;
  }

  const encrypted = encryptSecret(trimmed);
  await db
    .insert(configTable)
    .values({ key: JIRA_API_TOKEN_KEY, value: encrypted })
    .onConflictDoUpdate({ target: configTable.key, set: { value: encrypted } });
  setJiraApiToken(trimmed);
}
