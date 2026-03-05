import { logger } from "../utils/logger";
import { JiraIssue, JiraSearchResult, JiraUser } from "./types";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class JiraClient {
  private readonly authHeader: string;

  constructor(
    private readonly baseUrl: string,
    private readonly email: string,
    private readonly apiToken: string,
  ) {
    this.authHeader = `Basic ${Buffer.from(`${email}:${apiToken}`).toString("base64")}`;
  }

  private async request<T>(path: string, init?: RequestInit, allowRetry = true): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
    });

    if (response.status === 429 && allowRetry) {
      const retryAfter = Number(response.headers.get("Retry-After") ?? "1");
      logger.warn({ retryAfter }, "Jira rate-limited; retrying once");
      await sleep(retryAfter * 1000);
      return this.request<T>(path, init, false);
    }

    if (!response.ok) {
      const body = await response.text();
      if (response.status === 401) {
        throw new Error("Jira authentication failed (401)");
      }
      if (response.status === 403) {
        throw new Error("Jira access denied (403)");
      }
      if (response.status === 404) {
        throw new Error("Jira resource not found (404)");
      }
      throw new Error(`Jira API error (${response.status}): ${body}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  async searchIssues(jql: string, fields: string[], maxResults = 100): Promise<JiraIssue[]> {
    const all: JiraIssue[] = [];
    let nextPageToken: string | undefined;

    do {
      const params: Record<string, string> = {
        jql,
        fields: fields.join(","),
        maxResults: String(maxResults),
      };
      if (nextPageToken) {
        params.nextPageToken = nextPageToken;
      }
      const qs = new URLSearchParams(params);
      const page = await this.request<JiraSearchResult>(`/rest/api/3/search/jql?${qs.toString()}`);
      logger.info({ fetched: page.issues.length, total: page.total, hasMore: !!page.nextPageToken }, "Fetched Jira issue page");
      all.push(...page.issues);
      nextPageToken = page.nextPageToken;
    } while (nextPageToken);

    return all;
  }

  async getIssue(issueKey: string): Promise<JiraIssue> {
    return this.request<JiraIssue>(`/rest/api/3/issue/${encodeURIComponent(issueKey)}`);
  }

  async updateIssue(issueKey: string, fields: Record<string, unknown>): Promise<void> {
    await this.request<void>(`/rest/api/3/issue/${encodeURIComponent(issueKey)}`, {
      method: "PUT",
      body: JSON.stringify({ fields }),
    });
  }

  async addComment(issueKey: string, text: string): Promise<void> {
    await this.request(`/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment`, {
      method: "POST",
      body: JSON.stringify({
        body: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text }],
            },
          ],
        },
      }),
    });
  }

  async getAssignableUsers(projectKey: string): Promise<JiraUser[]> {
    const qs = new URLSearchParams({ project: projectKey });
    return this.request<JiraUser[]>(`/rest/api/3/user/assignable/search?${qs.toString()}`);
  }

  async getCurrentUser(): Promise<JiraUser> {
    return this.request<JiraUser>("/rest/api/3/myself");
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.request("/rest/api/3/myself");
      return true;
    } catch {
      return false;
    }
  }

  async getFields(): Promise<Array<{ id: string; name: string; custom: boolean }>> {
    const fields = await this.request<Array<{ id: string; name: string; custom: boolean }>>("/rest/api/3/field");
    return fields.map((f) => ({ id: f.id, name: f.name, custom: f.custom }));
  }
}
