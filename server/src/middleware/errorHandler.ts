import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { config } from "../config";
import { logger } from "../utils/logger";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: "Not Found", status: 404 });
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof ZodError) {
    res.status(400).json({ error: error.issues.map((issue) => issue.message).join(", "), status: 400 });
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message, status: error.status });
    return;
  }

  if (isHttpLikeError(error)) {
    const status = normalizeHttpStatus(error.status ?? error.statusCode);
    const message = typeof error.message === "string" && (error.expose || status < 500)
      ? error.message
      : status === 413
      ? "Request payload too large"
      : "Request failed";
    res.status(status).json({ error: message, status });
    return;
  }

  if (isJiraDependencyError(error)) {
    res.status(424).json({ error: error.message, status: 424 });
    return;
  }

  const message = error instanceof Error ? error.message : "Internal Server Error";
  logger.error({ err: error }, "Unhandled error");

  res.status(500).json({
    error: config.NODE_ENV === "production" ? "Internal Server Error" : message,
    status: 500,
  });
}

function isHttpLikeError(error: unknown): error is { message?: unknown; status?: number; statusCode?: number; expose?: boolean } {
  if (!error || typeof error !== "object") {
    return false;
  }
  const candidate = error as { status?: number; statusCode?: number };
  if (candidate.status === undefined && candidate.statusCode === undefined) {
    return false;
  }
  const status = normalizeHttpStatus(candidate.status ?? candidate.statusCode);
  return status >= 400 && status < 600;
}

function normalizeHttpStatus(status: unknown): number {
  return typeof status === "number" && Number.isInteger(status) && status >= 400 && status < 600
    ? status
    : 500;
}

function isJiraDependencyError(error: unknown): error is Error {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message === "Missing Jira credentials" ||
    error.message === "Jira authentication failed (401)" ||
    error.message === "Jira access denied (403)" ||
    error.message.startsWith("Jira base URL is not configured") ||
    error.message.startsWith("Jira request timed out") ||
    error.message.startsWith("Jira request was aborted");
}
