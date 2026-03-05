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

  const message = error instanceof Error ? error.message : "Internal Server Error";
  logger.error({ err: error }, "Unhandled error");

  res.status(500).json({
    error: config.NODE_ENV === "production" ? "Internal Server Error" : message,
    status: 500,
  });
}
