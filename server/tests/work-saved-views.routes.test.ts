import { beforeEach, describe, expect, it } from "vitest";
import express from "express";
import { invoke } from "./helpers/http";
import { resetDatabase } from "./helpers/db";
import { errorHandler, notFoundHandler } from "../src/middleware/errorHandler";
import { requireManager } from "../src/middleware/auth";
import { AuthService } from "../src/services/auth.service";
import { createWorkSavedViewsRouter } from "../src/routes/work";
import { WorkSavedViewsService } from "../src/services/work-saved-views.service";

beforeEach(async () => {
  await resetDatabase();
});

function createTestApp(options: { authenticated: boolean } = { authenticated: true }) {
  const app = express();
  app.use(express.json());

  if (options.authenticated) {
    app.use((req, _res, next) => {
      req.auth = {
        sessionId: "test-session",
        user: {
          username: "manager",
          accountId: "manager-a",
          workspaceId: "default",
          displayName: "Manager A",
          role: "manager",
        },
      };
      next();
    });
  }

  app.use("/api/work", requireManager(new AuthService()), createWorkSavedViewsRouter(new WorkSavedViewsService()));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe("/api/work/views", () => {
  it("supports the full CRUD cycle", async () => {
    const created = await invoke(createTestApp(), {
      method: "POST",
      url: "/api/work/views",
      body: { name: "Blocked for Priya", filter: "blocked", developerAccountId: "dev-1" },
    });

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      id: expect.any(Number),
      name: "Blocked for Priya",
      filter: "blocked",
      developerAccountId: "dev-1",
      noTagsFilter: false,
    });

    const list = await invoke(createTestApp(), { method: "GET", url: "/api/work/views" });
    expect(list.status).toBe(200);
    expect(list.body).toEqual({ views: [created.body] });

    const updated = await invoke(createTestApp(), {
      method: "PATCH",
      url: `/api/work/views/${created.body.id}`,
      body: { filter: "overdue" },
    });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ id: created.body.id, name: "Blocked for Priya", filter: "overdue" });

    const removed = await invoke(createTestApp(), {
      method: "DELETE",
      url: `/api/work/views/${created.body.id}`,
    });
    expect(removed.status).toBe(200);
    expect(removed.body).toEqual({ deleted: true });

    const emptyList = await invoke(createTestApp(), { method: "GET", url: "/api/work/views" });
    expect(emptyList.body).toEqual({ views: [] });
  });

  it("rejects create payloads with an invalid filter", async () => {
    const response = await invoke(createTestApp(), {
      method: "POST",
      url: "/api/work/views",
      body: { name: "Nope", filter: "banana" },
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ status: 400 });
  });

  it("rejects updates without any fields", async () => {
    const created = await invoke(createTestApp(), {
      method: "POST",
      url: "/api/work/views",
      body: { name: "Keep" },
    });

    const response = await invoke(createTestApp(), {
      method: "PATCH",
      url: `/api/work/views/${created.body.id}`,
      body: {},
    });

    expect(response.status).toBe(400);
  });

  it("returns 404 when deleting an unknown view", async () => {
    const response = await invoke(createTestApp(), {
      method: "DELETE",
      url: "/api/work/views/9999",
    });

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ status: 404 });
  });

  it("requires a manager session", async () => {
    const response = await invoke(createTestApp({ authenticated: false }), {
      method: "GET",
      url: "/api/work/views",
    });

    expect(response.status).toBe(401);
  });
});
