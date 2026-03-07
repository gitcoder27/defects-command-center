import { beforeEach, describe, expect, it } from "vitest";
import express from "express";
import { createAuthRouter } from "../src/routes/auth";
import { notFoundHandler, errorHandler } from "../src/middleware/errorHandler";
import { AuthService } from "../src/services/auth.service";
import { resetDatabase } from "./helpers/db";
import { invoke } from "./helpers/http";

const authService = new AuthService();

function createTestApp() {
  const app = express();
  app.use("/api/auth", createAuthRouter(authService));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe("auth routes", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("POST /api/auth/login creates a session and returns the authenticated user", async () => {
    await authService.createUser({
      username: "alice",
      displayName: "Alice Smith",
      password: "secret123",
      role: "developer",
      developerAccountId: "dev-1",
    });

    const app = createTestApp();
    const res = await invoke(app, {
      method: "POST",
      url: "/api/auth/login",
      body: {
        username: "alice",
        password: "secret123",
      },
    });

    expect(res.status).toBe(200);
    expect(res.body?.user).toMatchObject({
      username: "alice",
      accountId: "dev-1",
      displayName: "Alice Smith",
      role: "developer",
      developerAccountId: "dev-1",
    });
    expect(res.headers["set-cookie"]).toContain("dcc_session=");
    expect(res.headers["set-cookie"]).toContain("HttpOnly");
  });

  it("GET /api/auth/me rejects unauthenticated requests", async () => {
    const app = createTestApp();

    const res = await invoke(app, {
      method: "GET",
      url: "/api/auth/me",
    });

    expect(res.status).toBe(401);
    expect(res.body?.error).toBe("Authentication required");
  });

  it("POST /api/auth/logout invalidates the current session", async () => {
    await authService.createUser({
      username: "alice",
      displayName: "Alice Smith",
      password: "secret123",
      role: "developer",
      developerAccountId: "dev-1",
    });

    const app = createTestApp();
    const login = await invoke(app, {
      method: "POST",
      url: "/api/auth/login",
      body: {
        username: "alice",
        password: "secret123",
      },
    });

    const cookie = login.headers["set-cookie"];
    expect(cookie).toContain("dcc_session=");

    const logout = await invoke(app, {
      method: "POST",
      url: "/api/auth/logout",
      headers: {
        cookie,
      },
    });

    expect(logout.status).toBe(200);
    expect(logout.body).toEqual({ ok: true });
    expect(logout.headers["set-cookie"]).toContain("Max-Age=0");

    const me = await invoke(app, {
      method: "GET",
      url: "/api/auth/me",
      headers: {
        cookie,
      },
    });

    expect(me.status).toBe(401);
  });
});
