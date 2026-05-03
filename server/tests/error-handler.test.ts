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
});
