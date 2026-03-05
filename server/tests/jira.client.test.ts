import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JiraClient } from "../src/jira/client";

const globalFetch = globalThis as unknown as { fetch: typeof fetch };

const makeJsonResponse = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: new Headers({ "content-type": "application/json" }),
  text: async () => JSON.stringify(body),
  json: async () => body,
});

describe("JiraClient.searchIssues", () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = globalFetch.fetch;
  });

  afterEach(() => {
    globalFetch.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("uses /rest/api/3/search/jql and follows nextPageToken", async () => {
    const first = {
      issues: [{ id: "1", key: "AM-1", fields: { summary: "First bug" } }],
      isLast: false,
      nextPageToken: "token-1",
    };
    const second = {
      issues: [{ id: "2", key: "AM-2", fields: { summary: "Second bug" } }],
      isLast: true,
    };
    const fetchMock = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
      .mockResolvedValue(makeJsonResponse(first) as unknown as Response)
      .mockResolvedValue(makeJsonResponse(second) as unknown as Response);
    globalFetch.fetch = fetchMock as unknown as typeof fetch;

    const client = new JiraClient("https://tenant.atlassian.net", "ops@example.com", "token");
    const issues = await client.searchIssues("project = AM", ["summary"], 1);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstBody = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    const secondBody = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string);
    expect(firstBody).toMatchObject({ jql: "project = AM", fields: ["summary"], maxResults: 1 });
    expect(firstBody.nextPageToken).toBeUndefined();
    expect(secondBody.nextPageToken).toBe("token-1");
    expect(issues).toHaveLength(2);
    expect(issues[0]?.key).toBe("AM-1");
    expect(issues[1]?.key).toBe("AM-2");
  });

  it("falls back to legacy startAt/total pagination when nextPageToken is unavailable", async () => {
    const first = {
      startAt: 0,
      maxResults: 1,
      total: 2,
      issues: [{ id: "1", key: "AM-1", fields: { summary: "First bug" } }],
    };
    const second = {
      startAt: 1,
      maxResults: 1,
      total: 2,
      issues: [{ id: "2", key: "AM-2", fields: { summary: "Second bug" } }],
    };
    const fetchMock = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
      .mockResolvedValue(makeJsonResponse(first) as unknown as Response)
      .mockResolvedValue(makeJsonResponse(second) as unknown as Response);
    globalFetch.fetch = fetchMock as unknown as typeof fetch;

    const client = new JiraClient("https://tenant.atlassian.net", "ops@example.com", "token");
    const issues = await client.searchIssues("project = AM", ["summary"], 1);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstBody = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    expect(firstBody.startAt).toBeUndefined();
    const secondBody = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string);
    expect(secondBody.startAt).toBe(1);
    expect(issues).toHaveLength(2);
  });
});
