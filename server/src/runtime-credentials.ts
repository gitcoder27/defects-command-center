let jiraApiToken = "";

export function getJiraApiToken(): string {
  return jiraApiToken;
}

export function setJiraApiToken(token?: string): void {
  jiraApiToken = token?.trim() ?? "";
}

export function clearJiraApiToken(): void {
  jiraApiToken = "";
}

export function hasJiraApiToken(): boolean {
  return Boolean(jiraApiToken);
}
