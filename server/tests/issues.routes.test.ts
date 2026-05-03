import { describe, expect, it, vi } from "vitest";
import express from "express";
import { createIssuesRouter } from "../src/routes/issues";
import { notFoundHandler, errorHandler } from "../src/middleware/errorHandler";
import { invoke } from "./helpers/http";
import type { IssueService } from "../src/services/issue.service";

function createTestApp(issueService: Partial<IssueService>) {
  const app = express();
  app.use("/api/issues", createIssuesRouter(issueService as IssueService));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe("issues routes", () => {
  it("rejects invalid issue list query values with 400", async () => {
    const issueService = {
      getAll: vi.fn(async () => []),
    };
    const app = createTestApp(issueService);

    const res = await invoke(app, {
      method: "GET",
      url: "/api/issues?filter=surprise&sort=created&order=desc",
    });

    expect(res.status).toBe(400);
    expect(issueService.getAll).not.toHaveBeenCalled();
  });

  it("passes validated issue list query values into the service", async () => {
    const issueService = {
      getAll: vi.fn(async () => []),
    };
    const app = createTestApp(issueService);

    const res = await invoke(app, {
      method: "GET",
      url: "/api/issues?filter=blocked&sort=updated&order=asc&trackerDate=2026-03-07&tags=1,2&noTags=false",
    });

    expect(res.status).toBe(200);
    expect(issueService.getAll).toHaveBeenCalledWith(expect.objectContaining({
      filter: "blocked",
      sort: "updated",
      order: "asc",
      trackerDate: "2026-03-07",
      tagIds: [1, 2],
      noTags: false,
    }));
  });

  it("aligns comment creation with the shared ok response contract", async () => {
    const issueService = {
      addComment: vi.fn(async () => undefined),
    };
    const app = createTestApp(issueService);

    const res = await invoke(app, {
      method: "POST",
      url: "/api/issues/AM-123/comments",
      body: { text: "Reviewed with Jira owner" },
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ ok: true });
    expect(issueService.addComment).toHaveBeenCalledWith("AM-123", "Reviewed with Jira owner");
  });
});
