const jiraApiTokens = new Map<string, string>();
const DEFAULT_WORKSPACE_ID = "default";

function normalizeWorkspaceId(workspaceId?: string | null): string {
  const normalized = workspaceId?.trim();
  return normalized || DEFAULT_WORKSPACE_ID;
}

export function getJiraApiToken(workspaceId?: string): string {
  return jiraApiTokens.get(normalizeWorkspaceId(workspaceId)) ?? "";
}

export function setJiraApiToken(token?: string, workspaceId?: string): void {
  const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
  const normalizedToken = token?.trim() ?? "";
  if (!normalizedToken) {
    jiraApiTokens.delete(normalizedWorkspaceId);
    return;
  }
  jiraApiTokens.set(normalizedWorkspaceId, normalizedToken);
}

export function clearJiraApiToken(workspaceId?: string): void {
  jiraApiTokens.delete(normalizeWorkspaceId(workspaceId));
}

export function hasJiraApiToken(workspaceId?: string): boolean {
  return Boolean(getJiraApiToken(workspaceId));
}
