import { describe, expect, it } from "vitest";
import express from "express";
import { errorHandler } from "../src/middleware/errorHandler";
import { invoke } from "./helpers/http";

describe("errorHandler", () => {
  it("preserves exposed parser-style HTTP statuses", async () => {
    const app = express();
    app.get("/parser-error", (_req, _res, next) => {
      next({
        statusCode: 413,
        status: 413,
        expose: true,
        message: "payload too large",
      });
    });
    app.use(errorHandler);

    const res = await invoke(app, { method: "GET", url: "/parser-error" });

    expect(res.status).toBe(413);
    expect(res.body).toEqual({ error: "payload too large", status: 413 });
  });

  it("reports Jira auth failures as dependency failures instead of generic server errors", async () => {
    const app = express();
    app.get("/jira-error", (_req, _res, next) => {
      next(new Error("Jira authentication failed (401)"));
    });
    app.use(errorHandler);

    const res = await invoke(app, { method: "GET", url: "/jira-error" });

    expect(res.status).toBe(424);
    expect(res.body).toEqual({ error: "Jira authentication failed (401)", status: 424 });
  });
});
